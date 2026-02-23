import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { startMonitor, stopMonitor } from "@/lib/scheduler";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { action, monitorIds, data } = await req.json();

    if (!Array.isArray(monitorIds) || monitorIds.length === 0) {
        return NextResponse.json({ error: "No monitors selected" }, { status: 400 });
    }

    // Verify all monitors belong to the user
    const monitors = await prisma.monitor.findMany({
        where: {
            id: { in: monitorIds },
            userId: userId,
        },
    });

    if (monitors.length !== monitorIds.length) {
        return NextResponse.json({ error: "One or more monitors not found or unauthorized" }, { status: 403 });
    }

    try {
        switch (action) {
            case "DELETE":
                for (const m of monitors) stopMonitor(m.id);
                await prisma.monitor.deleteMany({
                    where: { id: { in: monitorIds }, userId },
                });
                break;

            case "PAUSE":
                for (const m of monitors) stopMonitor(m.id);
                await prisma.monitor.updateMany({
                    where: { id: { in: monitorIds }, userId },
                    data: { isPaused: true },
                });
                break;

            case "RESUME":
                await prisma.monitor.updateMany({
                    where: { id: { in: monitorIds }, userId },
                    data: { isPaused: false },
                });
                for (const m of monitors) startMonitor(m.id, m.interval);
                break;

            case "UPDATE_INTERVAL":
                if (!data || !data.interval) throw new Error("Interval required");
                const interval = parseInt(data.interval);
                await prisma.monitor.updateMany({
                    where: { id: { in: monitorIds }, userId },
                    data: { interval },
                });
                // Restart running monitors with new interval
                for (const m of monitors) {
                    if (!m.isPaused) {
                        stopMonitor(m.id);
                        startMonitor(m.id, interval);
                    }
                }
                break;

            case "UPDATE_TAGS":
                if (!data || data.tags === undefined) throw new Error("Tags required");
                await prisma.monitor.updateMany({
                    where: { id: { in: monitorIds }, userId },
                    data: { tags: data.tags },
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Bulk action failed" }, { status: 500 });
    }
}
