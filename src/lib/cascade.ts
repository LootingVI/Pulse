import { prisma } from "@/lib/db";
import { sendDiscordNotification } from "@/lib/notifications";
import { sendMonitorAlert } from "@/lib/email";
import { generateMockRCA } from "@/lib/scheduler";
import { decrypt } from "@/lib/encryption";

/**
 * Cascade / Dependency Detection for Pulse
 *
 * Two modes:
 * 1. PARENT DEPENDENCY — If a monitor has a parentMonitorId and that parent
 *    is currently OFFLINE, child alerts are suppressed (noise reduction).
 *    No individual incident is created in this case.
 *
 * 2. MASS OUTAGE DETECTION — If cascadeThreshold or more monitors went OFFLINE
 *    within cascadeWindow seconds, a single "System-Wide Outage" incident is
 *    created instead of individual alerts. Individual incidents are suppressed.
 * 
 * FIX: Individual incidents are ONLY created when NOT suppressed. Previously,
 * an individual incident was always created before the suppression check ran,
 * which caused noise duplicate incidents.
 */

export interface CascadeResult {
    suppressed: boolean;
    reason?: string;
    cascadeIncidentId?: string;
}

export async function handleCascadeDetection(
    monitor: any,
    result: { status: string; message?: string; responseTime: number },
    db: typeof prisma
): Promise<CascadeResult> {

    // ── 1. Parent dependency check FIRST (before creating any incident) ────────
    if (monitor.parentMonitorId) {
        const parent = await db.monitor.findUnique({
            where: { id: monitor.parentMonitorId },
            select: { id: true, name: true, status: true },
        });

        if (parent && parent.status === "OFFLINE") {
            // Suppressed — don't even create an individual incident (noise reduction)
            return {
                suppressed: true,
                reason: `Parent monitor "${parent.name}" is also OFFLINE — child alert suppressed`,
            };
        }
    }

    // ── 2. Mass outage / cascade detection SECOND (before creating incident) ───
    const cascadeEnabledSetting = await db.setting.findUnique({ where: { key: "cascadeEnabled" } });

    if (cascadeEnabledSetting?.value === "true") {
        const thresholdSetting = await db.setting.findUnique({ where: { key: "cascadeThreshold" } });
        const windowSetting = await db.setting.findUnique({ where: { key: "cascadeWindow" } });

        const threshold = parseInt(thresholdSetting?.value ?? "3");
        const windowSeconds = parseInt(windowSetting?.value ?? "60");
        const windowStart = new Date(Date.now() - windowSeconds * 1000);

        // Count how many monitors recently had "Service Down" incidents within window
        const recentOfflineIncidents = await db.incident.findMany({
            where: {
                createdAt: { gte: windowStart },
                title: { startsWith: "Service Down:" },
                status: { not: "RESOLVED" },
            },
            select: { monitorId: true, id: true },
        });

        const uniqueMonitors = new Set(recentOfflineIncidents.map((i: any) => i.monitorId));
        // Add the current monitor to the set of unique failing monitors
        uniqueMonitors.add(monitor.id);

        if (uniqueMonitors.size >= threshold) {
            // Check if a cascade incident already exists for this wave
            const existing = await db.incident.findFirst({
                where: {
                    createdAt: { gte: windowStart },
                    title: { startsWith: "⚡ Mass Outage Detected" },
                    status: { not: "RESOLVED" },
                },
            });

            if (!existing) {
                // Create one master cascade incident
                const cascadeIncident = await db.incident.create({
                    data: {
                        monitorId: monitor.id,
                        title: `⚡ Mass Outage Detected — ${uniqueMonitors.size} services affected`,
                        description: `A cascade failure was detected: ${uniqueMonitors.size} monitors went offline within ${windowSeconds} seconds. Individual monitor alerts have been suppressed to reduce noise. This is likely a single root-cause infrastructure issue.`,
                        status: "INVESTIGATING",
                        aiRCA: `🤖 **AI Analysis (Cascade Mode):** ${uniqueMonitors.size} monitors failed simultaneously within a ${windowSeconds}s window. This pattern strongly suggests a single upstream failure — most likely a shared network gateway, DNS resolver, CDN edge node, or hosting provider outage. Individual service-level root causes are secondary until the infrastructure issue is resolved.`,
                    },
                });

                // Notify about the cascade (single notification)
                const discordWebhook = await db.setting.findUnique({ where: { key: "discordWebhook" } });
                if (discordWebhook?.value) {
                    const webhookUrl = decrypt(discordWebhook.value);
                    sendDiscordNotification(
                        webhookUrl,
                        "⚡ Mass Outage Detected",
                        `${uniqueMonitors.size} services offline simultaneously`,
                        "OFFLINE",
                        0
                    ).catch(() => { });
                }

                const notifyDown = await db.setting.findUnique({ where: { key: "notifyDown" } });
                if (notifyDown?.value === "true") {
                    sendMonitorAlert(
                        `Mass Outage — ${uniqueMonitors.size} monitors`,
                        "OFFLINE",
                        `${uniqueMonitors.size} monitors went offline within ${windowSeconds} seconds`
                    ).catch(() => { });
                }

                return {
                    suppressed: true,
                    reason: `Cascade outage detected (${uniqueMonitors.size}/${threshold} monitors offline in ${windowSeconds}s window) — individual alerts suppressed`,
                    cascadeIncidentId: cascadeIncident.id,
                };
            }

            // Cascade incident already exists — still suppress individual notification
            return {
                suppressed: true,
                reason: `Cascade outage already tracked — suppressing duplicate notification for ${monitor.name}`,
                cascadeIncidentId: existing.id,
            };
        }
    }

    // ── 3. No suppression — create the individual incident now ─────────────────
    const aiRCA = generateMockRCA(monitor.type, result.message || "");
    await db.incident.create({
        data: {
            monitorId: monitor.id,
            title: `Service Down: ${monitor.name}`,
            description: result.message || "The service is unreachable.",
            status: "INVESTIGATING",
            aiRCA,
        },
    });

    return { suppressed: false };
}
