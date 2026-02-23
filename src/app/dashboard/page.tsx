import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session?.user?.name}. Here&apos;s what&apos;s
                    happening now.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Uptime</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">{uptimePercentage}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all {totalMonitors} services
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-green-500/20 hover:border-green-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Online Now</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-green-500 font-mono tracking-tight">{onlineMonitors}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Services responding normally
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-red-500/20 hover:border-red-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Offline Now</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-red-500 font-mono tracking-tight">
                            {offlineMonitors}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Services requiring attention
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-orange-500/20 hover:border-orange-500/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold font-mono tracking-tight">{activeIncidents}</div>
                        <p className="text-xs text-muted-foreground mt-1">Open investigations</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Activity — real check results */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentEvents.length > 0 ? (
                                recentEvents.map((event) => (
                                    <div key={event.id} className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                "h-2 w-2 rounded-full shrink-0",
                                                event.status === "ONLINE"
                                                    ? "bg-green-500"
                                                    : "bg-red-500"
                                            )}
                                        />
                                        <div className="flex-1 space-y-0.5 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">
                                                {event.monitor.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {event.status === "ONLINE"
                                                    ? `Responded in ${event.responseTime}ms`
                                                    : `Unreachable (${event.responseTime}ms)`}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground shrink-0">
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No activity yet — monitors will check shortly.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Monitor health — real uptime from DB */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Monitor Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monitorHealth.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No monitors configured yet.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {monitorHealth.map((m) => (
                                    <div key={m.id} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-sm font-medium truncate">{m.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {m.target}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {m.uptime !== "–" ? `${m.uptime}%` : "No data"}
                                                </span>
                                                <div
                                                    className={cn(
                                                        "h-2 w-2 rounded-full border border-black/20",
                                                        m.status === "ONLINE"
                                                            ? "bg-green-500"
                                                            : "bg-red-500"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Pulse Uptime Heatmap component */}
                                        <div className="flex gap-1 h-6 w-full opacity-90 overflow-hidden items-end">
                                            {m.results.length === 0 ? (
                                                <div className="text-[10px] text-muted-foreground min-w-max">Awaiting first check...</div>
                                            ) : (
                                                [...m.results]
                                                    .reverse()
                                                    .slice(-30) // last 30 checks
                                                    .map((res, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "flex-1 rounded-sm shadow-sm hover:opacity-80 transition-opacity",
                                                                res.status === "ONLINE" ? "bg-green-500/80" : "bg-red-500/90"
                                                            )}
                                                            style={{ height: res.status === "ONLINE" ? "100%" : "60%" }}
                                                            title={res.status === "ONLINE" ? "Online" : "Offline / Warning"}
                                                        />
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {totalMonitors > 5 && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                        +{totalMonitors - 5} more monitors
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
