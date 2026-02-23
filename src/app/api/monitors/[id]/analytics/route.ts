import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    try {
        const monitor = await prisma.monitor.findUnique({
            where: { id },
            include: {
                results: {
                    orderBy: { timestamp: "desc" },
                    take: 100, // last 100 checks
                },
                incidents: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                }
            }
        });

        if (!monitor) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Reverse to get chronological order for charts
        const chartData = monitor.results.reverse().map(r => ({
            timestamp: r.timestamp.toISOString(),
            responseTime: r.status === "ONLINE" ? r.responseTime : 0,
            status: r.status,
            region: r.region,
        }));

        return NextResponse.json({
            monitor: {
                id: monitor.id,
                name: monitor.name,
                target: monitor.target,
                type: monitor.type,
                status: monitor.status,
                regions: monitor.regions,
                maxResponseTime: monitor.maxResponseTime,
            },
            chartData,
            recentIncidents: monitor.incidents,
        });
    } catch (e) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
