import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any).id;

    const [totalMonitors, onlineMonitors, offlineMonitors, activeIncidents] =
        await prisma.$transaction([
            prisma.monitor.count({ where: { userId } }),
            prisma.monitor.count({ where: { userId, status: "ONLINE" } }),
            prisma.monitor.count({ where: { userId, status: "OFFLINE" } }),
            prisma.incident.count({
                where: { monitor: { userId }, status: { not: "RESOLVED" } },
            }),
        ]);

    const recentEvents = await prisma.checkResult.findMany({
        where: { monitor: { userId } },
        take: 8,
        orderBy: { timestamp: "desc" },
        include: { monitor: { select: { name: true } } },
    });

    // Real monitors list for the health panel
    const monitors = await prisma.monitor.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            status: true,
            lastChecked: true,
            target: true,
            results: {
                take: 100,
                orderBy: { timestamp: "desc" },
                select: { status: true },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
    });

    const uptimePercentage =
        totalMonitors > 0
            ? ((onlineMonitors / totalMonitors) * 100).toFixed(1)
            : "0";

    // Compute uptime % per monitor from last 100 checks
    const monitorHealth = monitors.map((m) => {
        const total = m.results.length;
        const up = m.results.filter((r) => r.status === "ONLINE").length;
        const uptime = total > 0 ? ((up / total) * 100).toFixed(1) : "–";
        return { ...m, uptime };
    });

    return (
        <DashboardClient
            user={session?.user}
            stats={{ uptimePercentage, onlineMonitors, offlineMonitors, activeIncidents, totalMonitors }}
            recentEvents={recentEvents}
            monitorHealth={monitorHealth}
        />
    );
}
