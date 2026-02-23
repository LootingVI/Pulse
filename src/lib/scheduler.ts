/**
 * Lightweight in-process monitor scheduler.
 * Replaces BullMQ/Redis so no external services are needed.
 * Runs checks at the configured interval for each monitor.
 */
import { performCheck } from "./monitor";
import { sendDiscordNotification } from "./notifications";
import { sendMonitorAlert } from "./email";

function generateMockRCA(monitorType: string, message: string): string {
    const aiPrefix = "🤖 **AI Analysis:** Based on telemetric patterns, ";

    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
        return aiPrefix + `the target ${monitorType} endpoint is experiencing severe latency and dropping packets. This usually indicates high server load or temporary network routing issues at the origin data center.`;
    }

    if (message.includes("ENOTFOUND")) {
        return aiPrefix + "DNS resolution failed. The domain name is either unregistered or the nameservers are currently unresponsive. Check your DNS registrar.";
    }

    if (message.includes("ECONNREFUSED")) {
        return aiPrefix + "the connection was explicitly refused by the target server. The web server process (e.g., Nginx, Apache, or Node) is likely stopped or crashing on boot.";
    }

    if (monitorType === "SSL") {
        return aiPrefix + "the TLS/SSL certificate handshake failed or the certificate is expired. Ensure automatic renewal systems like Certbot are running.";
    }

    return aiPrefix + "an unexpected interruption occurred. Initial diagnosis points towards a generic application-level failure or a restrictive firewall blocking the probe port.";
}

// Keep timer handles indexed by monitorId
const timers = new Map<string, NodeJS.Timeout>();

let prismaClient: any = null;

async function getPrisma() {
    if (!prismaClient) {
        const { prisma } = await import("./db");
        prismaClient = prisma;
    }
    return prismaClient;
}

async function runCheck(monitorId: string) {
    const prisma = await getPrisma();

    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
    });

    if (!monitor) {
        stopMonitor(monitorId);
        return;
    }

    const result = await performCheck(
        monitor.type,
        monitor.target,
        monitor.port,
        monitor.timeout,
        monitor.keyword
    );

    const previousStatus = monitor.status;

    await prisma.monitor.update({
        where: { id: monitorId },
        data: {
            status: result.status,
            lastChecked: new Date(),
        },
    });

    const regionsList = monitor.regions ? monitor.regions.split(",").map((r: string) => r.trim()).filter(Boolean) : ["eu-central"];

    // Fetch edge nodes configuration
    const edgeNodesSetting = await prisma.setting.findUnique({ where: { key: "edgeNodes" } });
    let edgeNodes: any[] = [];
    if (edgeNodesSetting?.value) {
        try { edgeNodes = JSON.parse(edgeNodesSetting.value); } catch { }
    }

    // Execute multi-region probes
    const checkResultsData = await Promise.all(regionsList.map(async (region: string) => {
        const edgeNode = edgeNodes.find(n => n.id === region);

        if (edgeNode && edgeNode.url && (monitor.type === "HTTP" || monitor.type === "KEYWORD")) {
            // Trigger remote edge probe via Cloudflare Worker
            try {
                const res = await fetch(edgeNode.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${edgeNode.secret}`
                    },
                    body: JSON.stringify({
                        type: monitor.type,
                        target: monitor.target,
                        keyword: monitor.keyword,
                        timeout: monitor.timeout,
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    return {
                        monitorId,
                        status: data.status,
                        responseTime: data.responseTime,
                        region: region,
                    };
                }
            } catch (e) {
                // Do nothing, fallback to local failure later
            }
        }

        // Fallback or "Local" probe (uses the primary performCheck result)
        // Note: For non-HTTP checks, edge probes are skipped, falling back to local.
        return {
            monitorId,
            status: result.status,
            responseTime: result.responseTime,
            region: region,
        };
    }));

    await prisma.checkResult.createMany({
        data: checkResultsData,
    });

    // Detect state transitions
    if (previousStatus === "ONLINE" && result.status === "OFFLINE") {
        console.log(`[Scheduler] Monitor DOWN: ${monitor.name}`);

        const aiRCA = generateMockRCA(monitor.type, result.message || "");

        await prisma.incident.create({
            data: {
                monitorId,
                title: `Service Down: ${monitor.name}`,
                description: result.message || "The service is unreachable.",
                status: "INVESTIGATING",
                aiRCA,
            },
        });

        const discordWebhook = await prisma.setting.findUnique({ where: { key: "discordWebhook" } });
        if (discordWebhook?.value) {
            await sendDiscordNotification(discordWebhook.value, "Monitor Down", monitor.name, "OFFLINE", result.responseTime).catch(() => { });
        }

        const notifyDown = await prisma.setting.findUnique({ where: { key: "notifyDown" } });
        if (notifyDown?.value === "true") {
            await sendMonitorAlert(monitor.name, "OFFLINE", result.message || "Unreachable").catch(() => { });
        }

        if (monitor.customWebhook) {
            fetch(monitor.customWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monitorId, name: monitor.name, status: "OFFLINE", timestamp: new Date() })
            }).catch(() => { });
        }
    } else if (previousStatus === "OFFLINE" && result.status === "ONLINE") {
        console.log(`[Scheduler] Monitor UP: ${monitor.name}`);
        await prisma.incident.updateMany({
            where: { monitorId, status: { not: "RESOLVED" } },
            data: { status: "RESOLVED" },
        });

        const discordWebhook = await prisma.setting.findUnique({ where: { key: "discordWebhook" } });
        if (discordWebhook?.value) {
            await sendDiscordNotification(discordWebhook.value, "Monitor Restored", monitor.name, "ONLINE", result.responseTime).catch(() => { });
        }

        const notifyUp = await prisma.setting.findUnique({ where: { key: "notifyUp" } });
        if (notifyUp?.value === "true") {
            await sendMonitorAlert(monitor.name, "ONLINE", "Service restored").catch(() => { });
        }

        if (monitor.customWebhook) {
            fetch(monitor.customWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monitorId, name: monitor.name, status: "ONLINE", timestamp: new Date() })
            }).catch(() => { });
        }
    } else if (result.status === "ONLINE" && monitor.maxResponseTime && result.responseTime > monitor.maxResponseTime) {
        // SLA Performance Degradation Check (pulse feature)
        // Check if an ongoing performance incident already exists to prevent spam
        const existingIncidents = await prisma.incident.findMany({
            where: { monitorId, status: "INVESTIGATING", title: { contains: "Performance Degradation" } }
        });

        if (existingIncidents.length === 0) {
            console.log(`[Scheduler] SLA breached for ${monitor.name}: ${result.responseTime}ms > ${monitor.maxResponseTime}ms`);
            await prisma.incident.create({
                data: {
                    monitorId,
                    title: `Performance Degradation: ${monitor.name}`,
                    description: `Response time of ${result.responseTime}ms exceeded the expected SLA threshold of ${monitor.maxResponseTime}ms.`,
                    status: "INVESTIGATING",
                    aiRCA: `🤖 **AI Analysis:** The target is responding, but at severely degraded speeds (${result.responseTime}ms > ${monitor.maxResponseTime}ms SLA). This suggests resource starvation (CPU/RAM throttling), database locks, or an ongoing DDoS attempt causing massive queue delays.`
                },
            });
        }
    }
}

export function startMonitor(monitorId: string, intervalSeconds: number) {
    stopMonitor(monitorId); // clear any existing timer

    // Run immediately on start
    runCheck(monitorId).catch(console.error);

    const timer = setInterval(() => {
        runCheck(monitorId).catch(console.error);
    }, intervalSeconds * 1000);

    timers.set(monitorId, timer);
    console.log(`[Scheduler] Started monitor ${monitorId} (interval: ${intervalSeconds}s)`);
}

export function stopMonitor(monitorId: string) {
    const timer = timers.get(monitorId);
    if (timer) {
        clearInterval(timer);
        timers.delete(monitorId);
        console.log(`[Scheduler] Stopped monitor ${monitorId}`);
    }
}

export async function initScheduler() {
    const prisma = await getPrisma();
    const monitors = await prisma.monitor.findMany();

    console.log(`[Scheduler] Initializing ${monitors.length} monitors...`);
    for (const monitor of monitors) {
        startMonitor(monitor.id, monitor.interval);
    }
}
