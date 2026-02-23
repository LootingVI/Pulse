import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { startMonitor } from "@/lib/scheduler";
import { randomUUID } from "crypto";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const monitors = await prisma.monitor.findMany({
        where: { userId },
        include: { group: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(monitors);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const data = await req.json();

    try {
        const isHeartbeat = data.type === "HEARTBEAT";

        const monitor = await prisma.monitor.create({
            data: {
                name: data.name,
                type: data.type,
                // Heartbeat monitors don't have an active target — use placeholder
                target: isHeartbeat ? "heartbeat" : data.target,
                port: data.port ? parseInt(data.port) : null,
                keyword: data.keyword || null,
                interval: parseInt(data.interval) || 300,
                timeout: data.timeout ? parseInt(data.timeout) : 30,
                retries: data.retries ? parseInt(data.retries) : 3,
                maxResponseTime: data.maxResponseTime ? parseInt(data.maxResponseTime) : null,
                customWebhook: data.customWebhook || null,
                isPaused: data.isPaused || false,
                regions: data.regions || "eu-central",
                userId,
                groupId: data.groupId || null,
                // Generate unique token for heartbeat monitors
                heartbeatToken: isHeartbeat ? randomUUID() : null,
                parentMonitorId: data.parentMonitorId || null,
                tags: data.tags || null,
            },
        });

        if (!monitor.isPaused) {
            startMonitor(monitor.id, monitor.interval);
        }

        return NextResponse.json(monitor);
    } catch (error) {
        console.error("Failed to create monitor:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
