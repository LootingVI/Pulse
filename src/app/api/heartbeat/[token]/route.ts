import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/heartbeat/[token]
 * POST /api/heartbeat/[token]
 *
 * Called by external cron jobs / scripts to signal "I'm still alive".
 * Both GET and POST are accepted so it works with any HTTP client.
 *
 * Example usage in a cron job:
 *   curl https://your-pulse.com/api/heartbeat/abc123xyz
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
    return handleHeartbeat(await params);
}

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
    return handleHeartbeat(await params);
}

async function handleHeartbeat({ token }: { token: string }) {
    const monitor = await prisma.monitor.findUnique({
        where: { heartbeatToken: token },
    });

    if (!monitor) {
        return NextResponse.json({ error: "Invalid heartbeat token" }, { status: 404 });
    }

    if (monitor.isPaused) {
        return NextResponse.json({ ok: false, message: "Monitor is paused" });
    }

    const previousStatus = monitor.status;

    // Update lastHeartbeat and mark ONLINE
    await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
            lastHeartbeat: new Date(),
            lastChecked: new Date(),
            status: "ONLINE",
        },
    });

    // Save a check result
    await prisma.checkResult.create({
        data: {
            monitorId: monitor.id,
            status: "ONLINE",
            responseTime: 0,
            region: "heartbeat",
        },
    });

    // If it was OFFLINE before, resolve existing incidents
    if (previousStatus === "OFFLINE") {
        await prisma.incident.updateMany({
            where: { monitorId: monitor.id, status: { not: "RESOLVED" } },
            data: { status: "RESOLVED" },
        });

        // Notify recovery
        const { sendDiscordNotification } = await import("@/lib/notifications");
        const { sendMonitorAlert } = await import("@/lib/email");

        const discordWebhook = await prisma.setting.findUnique({ where: { key: "discordWebhook" } });
        if (discordWebhook?.value) {
            sendDiscordNotification(discordWebhook.value, "Heartbeat Restored", monitor.name, "ONLINE", 0).catch(() => { });
        }

        const notifyUp = await prisma.setting.findUnique({ where: { key: "notifyUp" } });
        if (notifyUp?.value === "true") {
            sendMonitorAlert(monitor.name, "ONLINE", "Heartbeat signal received again").catch(() => { });
        }
    }

    return NextResponse.json({
        ok: true,
        monitor: monitor.name,
        receivedAt: new Date().toISOString(),
    });
}
