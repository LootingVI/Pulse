import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { startMonitor, stopMonitor } from "@/lib/scheduler";

// GET /api/monitors/[id] — fetch single monitor with recent results
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;

    const monitor = await prisma.monitor.findFirst({
        where: { id, userId },
        include: {
            results: {
                take: 90,
                orderBy: { timestamp: "desc" },
            },
            incidents: {
                orderBy: { createdAt: "desc" },
                take: 10,
            },
        },
    });

    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(monitor);
}

// PATCH /api/monitors/[id] — update a monitor
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;
    const data = await req.json();

    const existing = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const monitor = await prisma.monitor.update({
        where: { id },
        data: {
            name: data.name !== undefined ? data.name : existing.name,
            target: data.target !== undefined ? data.target : existing.target,
            interval: data.interval !== undefined ? parseInt(data.interval) : existing.interval,
            port: data.port !== undefined ? parseInt(data.port) : existing.port,
            keyword: data.keyword !== undefined ? data.keyword : existing.keyword,
            maxResponseTime: data.maxResponseTime !== undefined ? parseInt(data.maxResponseTime) : existing.maxResponseTime,
            customWebhook: data.customWebhook !== undefined ? data.customWebhook : existing.customWebhook,
            isPaused: data.isPaused !== undefined ? data.isPaused : existing.isPaused,
            regions: data.regions !== undefined ? data.regions : existing.regions,
            tags: data.tags !== undefined ? data.tags : (existing as any).tags,
            flowSteps: data.flowSteps !== undefined ? data.flowSteps : (existing as any).flowSteps,
            recoveryEnabled: data.recoveryEnabled !== undefined ? data.recoveryEnabled : (existing as any).recoveryEnabled,
            recoveryWebhookUrl: data.recoveryWebhookUrl !== undefined ? data.recoveryWebhookUrl : (existing as any).recoveryWebhookUrl,
            recoveryWebhookMethod: data.recoveryWebhookMethod !== undefined ? data.recoveryWebhookMethod : (existing as any).recoveryWebhookMethod,
            recoveryWebhookBody: data.recoveryWebhookBody !== undefined ? data.recoveryWebhookBody : (existing as any).recoveryWebhookBody,
            recoveryInterval: data.recoveryInterval !== undefined ? parseInt(data.recoveryInterval) : (existing as any).recoveryInterval,
        },
    });

    if (monitor.isPaused) {
        stopMonitor(monitor.id);
    } else {
        // Reschedule
        startMonitor(monitor.id, monitor.interval);
    }

    return NextResponse.json(monitor);
}

// DELETE /api/monitors/[id] — delete a monitor
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;

    const existing = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    stopMonitor(id);
    await prisma.monitor.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
