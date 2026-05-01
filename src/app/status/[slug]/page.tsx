import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, ShieldCheck, Globe, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { CopyBadgeButton } from "@/components/copy-badge-button";

interface CustomButton {
    label: string;
    url: string;
    color?: string;
}

export default async function PublicStatusPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const statusPage = await prisma.statusPage.findUnique({
        where: { slug },
        include: {
            monitors: {
                include: {
                    results: {
                        where: { timestamp: { gte: ninetyDaysAgo } },
                        orderBy: { timestamp: "desc" },
                        select: { status: true, timestamp: true, responseTime: true, region: true },
                    },
                    incidents: {
                        where: {
                            OR: [
                                { createdAt: { gte: ninetyDaysAgo } },
                                { updatedAt: { gte: ninetyDaysAgo }, status: "RESOLVED" }
                            ]
                        },
                        orderBy: { createdAt: "desc" },
                        include: {
                            updates: {
                                orderBy: { createdAt: "desc" },
                                take: 3,
                            },
                        },
                    },
                },
            },
        },
    });

    if (!statusPage) {
        notFound();
    }

    const allOperational = statusPage.monitors.every((m) => m.status === "ONLINE");

    // Parse custom buttons from config
    let customButtons: CustomButton[] = [];
    try {
        if (statusPage.config) customButtons = JSON.parse(statusPage.config);
    } catch { }

    // Collect all incidents across all monitors (unresolved first)
    const allIncidents = statusPage.monitors
        .flatMap((m) =>
            m.incidents.map((inc) => ({
                ...inc,
                monitorName: m.name,
            }))
        )
        .sort((a, b) => {
            if (a.status !== "RESOLVED" && b.status === "RESOLVED") return -1;
            if (a.status === "RESOLVED" && b.status !== "RESOLVED") return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto py-12 px-4">
                {/* Header */}
                <div className="flex flex-col items-center mb-12 text-center">
                    {/* Logo or fallback icon */}
                    {statusPage.logo ? (
                        <img
                            src={statusPage.logo}
                            alt={statusPage.title}
                            className="h-20 w-auto object-contain mb-4 rounded-xl"
                        />
                    ) : (
                        <div className="bg-primary p-3 rounded-2xl mb-4">
                            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
                        </div>
                    )}
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        {statusPage.title}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {statusPage.description || "System Status & Incidents"}
                    </p>

                    {/* Custom Buttons */}
                    {customButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5 justify-center">
                            {customButtons.map((btn, i) => (
                                <a
                                    key={i}
                                    href={btn.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80"
                                    style={{
                                        borderColor: btn.color || "#3b82f6",
                                        color: btn.color || "#3b82f6",
                                        background: `${(btn.color || "#3b82f6")}15`,
                                    }}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {btn.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Global Status Banner */}
                <div
                    className={cn(
                        "p-6 rounded-xl border flex items-center gap-4 mb-8 transition-all",
                        allOperational
                            ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                    )}
                >
                    {allOperational ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                    ) : (
                        <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
                    )}
                    <div>
                        <h2 className="text-xl font-bold">
                            {allOperational
                                ? "All Systems Operational"
                                : "Partial System Outage"}
                        </h2>
                        <p className="text-sm opacity-80">
                            Last updated {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Services List */}
                <div className="space-y-4 mb-12">
                    <h3 className="text-lg font-semibold px-1">Services</h3>
                    {statusPage.monitors.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                No services configured for this status page.
                            </CardContent>
                        </Card>
                    ) : (
                        statusPage.monitors.map((monitor) => {
                            const results = monitor.results;
                            // Generate 90 days of bars
                            const dailyStatus = Array.from({ length: 90 }, (_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (89 - i));
                                date.setHours(0, 0, 0, 0);
                                const nextDate = new Date(date);
                                nextDate.setDate(date.getDate() + 1);

                                // Find incidents overlapping this day to calculate downtime
                                const dayIncidents = monitor.incidents.filter(inc => {
                                    const start = new Date(inc.createdAt);
                                    const end = inc.status === "RESOLVED" ? new Date(inc.updatedAt) : new Date();
                                    return start < nextDate && end > date;
                                });

                                let downtimeMinutes = 0;
                                dayIncidents.forEach(inc => {
                                    const start = new Date(inc.createdAt);
                                    const end = inc.status === "RESOLVED" ? new Date(inc.updatedAt) : new Date();
                                    const overlapStart = Math.max(date.getTime(), start.getTime());
                                    const overlapEnd = Math.min(nextDate.getTime(), end.getTime());
                                    const duration = Math.max(0, overlapEnd - overlapStart);
                                    downtimeMinutes += duration / 60000;
                                });

                                // Check if there's data for this day
                                const dayResults = monitor.results.filter(r => {
                                    const resDate = new Date(r.timestamp);
                                    return resDate >= date && resDate < nextDate;
                                });

                                let status = "ONLINE";
                                if (downtimeMinutes > 5) status = "OFFLINE"; // Significant outage
                                else if (downtimeMinutes > 0) status = "PARTIAL"; // Minor outage
                                else if (dayResults.length === 0) status = "NODATA";

                                return {
                                    date: date.toLocaleDateString(),
                                    status,
                                    downtime: Math.round(downtimeMinutes)
                                };
                            });

                            const totalChecks = results.length;
                            const upChecks = results.filter((r) => r.status === "ONLINE").length;
                            const uptimePct =
                                totalChecks > 0
                                    ? ((upChecks / totalChecks) * 100).toFixed(2)
                                    : null;

                            // ... rest of logic for regionStats ...
                            const regionMap = new Map<string, { pings: number[]; status: string }>();
                            // We only take the last 100 results for region stats to avoid massive iterations
                            for (const r of results.slice(0, 100)) {
                                if (!(r as any).region) continue;
                                const region = (r as any).region;
                                if (!regionMap.has(region)) {
                                    regionMap.set(region, { pings: [], status: r.status });
                                }
                                const entry = regionMap.get(region)!;
                                if (entry.pings.length < 10 && r.status === "ONLINE") {
                                    entry.pings.push(r.responseTime);
                                }
                            }

                            const regionStats = Array.from(regionMap.entries()).map(([region, data]) => ({
                                region,
                                status: data.status,
                                avgPing:
                                    data.pings.length > 0
                                        ? Math.round(data.pings.reduce((a, b) => a + b, 0) / data.pings.length)
                                        : null,
                            }));

                            const hasRegions = regionStats.length > 1;

                            return (
                                <Card key={monitor.id} className="overflow-hidden border-muted group/monitor">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "h-2.5 w-2.5 rounded-full shrink-0",
                                                        monitor.status === "ONLINE"
                                                            ? "bg-green-500 animate-pulse"
                                                            : "bg-red-500"
                                                    )}
                                                />
                                                <span className="font-semibold">{monitor.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CopyBadgeButton monitorId={monitor.id} />
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0",
                                                        monitor.status === "ONLINE"
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                                    )}
                                                >
                                                    {monitor.status === "ONLINE" ? "Operational" : "Offline"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 90 Days Uptime bar */}
                                        <div className="flex gap-[2px] h-10 items-end">
                                            {dailyStatus.map((day, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "flex-1 rounded-sm transition-all hover:scale-y-110 cursor-help relative group",
                                                        day.status === "ONLINE"
                                                            ? "bg-green-500/80 h-full"
                                                            : day.status === "PARTIAL"
                                                                ? "bg-orange-500/80 h-full"
                                                                : day.status === "OFFLINE"
                                                                    ? "bg-red-500/80 h-full"
                                                                    : "bg-muted h-3"
                                                    )}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-zinc-800 transition-opacity">
                                                        <div className="font-bold">{day.date}</div>
                                                        <div>{day.status === "ONLINE" ? "100% Uptime" : day.status === "NODATA" ? "No Data" : `${day.downtime} min downtime`}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                            <span>90 days ago</span>
                                            <div className="h-px bg-muted flex-1 mx-4 self-center" />
                                            <span>
                                                {uptimePct !== null ? `${uptimePct}% uptime` : "No data yet"}
                                            </span>
                                            <div className="h-px bg-muted flex-1 mx-4 self-center" />
                                            <span>Today</span>
                                        </div>

                                        {/* Per-Node / Region Stats */}
                                        {hasRegions && (
                                            <div className="mt-4 pt-4 border-t">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                                    <Globe className="h-3.5 w-3.5" />
                                                    Node Status
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {regionStats.map((node) => (
                                                        <div
                                                            key={node.region}
                                                            className={cn(
                                                                "flex items-center justify-between px-3 py-2 rounded-lg text-xs border",
                                                                node.status === "ONLINE"
                                                                    ? "bg-green-500/5 border-green-500/20"
                                                                    : "bg-red-500/5 border-red-500/20"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={cn(
                                                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                                                        node.status === "ONLINE" ? "bg-green-500" : "bg-red-500"
                                                                    )}
                                                                />
                                                                <span className="font-medium text-foreground truncate max-w-[80px]">
                                                                    {node.region}
                                                                </span>
                                                            </div>
                                                            <span
                                                                className={cn(
                                                                    "font-mono tabular-nums",
                                                                    node.status === "ONLINE"
                                                                        ? "text-green-600 dark:text-green-400"
                                                                        : "text-red-500"
                                                                )}
                                                            >
                                                                {node.status === "ONLINE" && node.avgPing !== null
                                                                    ? `${node.avgPing}ms`
                                                                    : node.status === "OFFLINE"
                                                                        ? "Down"
                                                                        : "—"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Real Incident History */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold px-1">Incident History</h3>
                    {allIncidents.length === 0 ? (
                        <div className="border-l-2 border-muted ml-4 pl-8">
                            <div className="relative">
                                <div className="absolute -left-[37px] top-1 bg-background p-1">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </div>
                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                    Today
                                </h4>
                                <p className="text-sm text-muted-foreground italic">
                                    No incidents reported.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="border-l-2 border-muted ml-4 pl-8 space-y-10">
                            {allIncidents.map((incident) => (
                                <div key={incident.id} className="relative">
                                    <div className="absolute -left-[37px] top-1 bg-background p-1">
                                        {incident.status === "RESOLVED" ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        {new Date(incident.createdAt).toLocaleDateString("en-US", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </h4>
                                    <div className="space-y-1">
                                        <p className="font-bold">{incident.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Service: {incident.monitorName}
                                        </p>
                                        {incident.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {incident.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Status:{" "}
                                            <span
                                                className={cn(
                                                    "font-semibold",
                                                    incident.status === "RESOLVED"
                                                        ? "text-green-500"
                                                        : "text-red-500"
                                                )}
                                            >
                                                {incident.status}
                                            </span>
                                        </p>
                                        {incident.updates.length > 0 && (
                                            <div className="mt-2 space-y-1 border-l pl-3 ml-1">
                                                {incident.updates.map((u) => (
                                                    <div key={u.id} className="text-sm">
                                                        <span className="text-muted-foreground text-xs">
                                                            {new Date(u.createdAt).toLocaleString()} —{" "}
                                                        </span>
                                                        {u.message}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-24 pt-8 border-t text-center text-sm text-muted-foreground">
                    <p>Powered by Pulse</p>
                    <p className="text-xs mt-1">Updated {new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
