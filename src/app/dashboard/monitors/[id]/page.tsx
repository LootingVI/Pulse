"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Globe, AlertTriangle, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
    monitor: {
        id: string;
        name: string;
        target: string;
        type: string;
        status: string;
        regions: string;
        maxResponseTime: number | null;
    };
    chartData: {
        timestamp: string;
        responseTime: number;
        status: string;
        region: string;
    }[];
    recentIncidents: {
        id: string;
        title: string;
        status: string;
        createdAt: string;
    }[];
}

export default function MonitorAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
                if (!id) return;

                const res = await fetch(`/api/monitors/${id}/analytics`);
                if (res.ok) {
                    setData(await res.json());
                } else {
                    toast.error("Failed to load analytics");
                    router.push("/dashboard/monitors");
                }
            } catch (err) {
                toast.error("An error occurred");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30_000); // refresh every 30s
        return () => clearInterval(interval);
    }, [params?.id, router]);

    if (isLoading) {
        return <div className="p-10 text-muted-foreground">Loading Analytics Data...</div>;
    }

    if (!data) return null;

    const { monitor, chartData, recentIncidents } = data;

    // Calculate aggregations
    const pingTimes = chartData.filter(d => d.status === "ONLINE").map(d => d.responseTime);
    const avgPing = pingTimes.length > 0 ? Math.round(pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length) : 0;
    const uptimePercentage = chartData.length > 0
        ? ((chartData.filter(d => d.status === "ONLINE").length / chartData.length) * 100).toFixed(2)
        : "N/A";

    const formatTime = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold">{new Date(dataPoint.timestamp).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${dataPoint.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{dataPoint.status}</span>
                    </div>
                    {dataPoint.status === "ONLINE" && (
                        <p className="text-muted-foreground mt-1 text-xs">
                            Response: <span className="text-foreground font-mono">{dataPoint.responseTime}ms</span>
                        </p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                        Node: <span className="text-foreground">{dataPoint.region}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{monitor.name}</h1>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <Globe className="h-4 w-4" /> {monitor.target}
                            <span className="mx-2">•</span>
                            <Badge variant="outline">{monitor.type}</Badge>
                            <span className="mx-2">•</span>
                            Nodes: {monitor.regions}
                        </div>
                    </div>
                </div>
                <Badge variant={monitor.status === "ONLINE" ? "default" : "destructive"} className={monitor.status === "ONLINE" ? "bg-green-500 text-lg px-4 py-1" : "text-lg px-4 py-1"}>
                    {monitor.status}
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Uptime (Last 100 Checks)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uptimePercentage}%</div>
                        <p className="text-xs text-muted-foreground">Recent availability average</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgPing}ms</div>
                        <p className="text-xs text-muted-foreground">In recent checks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SLA Threshold</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monitor.maxResponseTime ? `${monitor.maxResponseTime}ms` : "None"}</div>
                        <p className="text-xs text-muted-foreground">Alerts if SLA breached</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Global Latency Trend</CardTitle>
                    <CardDescription>Response time in milliseconds over the last 100 automated checks from all geographical nodes.</CardDescription>
                </CardHeader>
                <CardContent className="pl-0 h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-50" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                                tickFormatter={(val) => `${val}ms`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="responseTime"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorResponse)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentIncidents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent incidents recorded.</p>
                    ) : (
                        <div className="space-y-4">
                            {recentIncidents.map(inc => (
                                <div key={inc.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className={`h-4 w-4 ${inc.status === 'RESOLVED' ? 'text-green-500' : 'text-orange-500'}`} />
                                            <p className="font-medium">{inc.title}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(inc.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Badge variant="outline">{inc.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

