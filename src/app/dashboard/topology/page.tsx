"use client";

import { useEffect, useState } from "react";
import { Monitor } from "../monitors/page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, Server, Globe, Zap, Database, ArrowRight } from "lucide-react";

export default function TopologyPage() {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/monitors")
            .then(res => res.json())
            .then(data => {
                setMonitors(data);
                setIsLoading(false);
            });
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ONLINE": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "OFFLINE": return "text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
            case "MAINTENANCE": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
            default: return "text-muted-foreground bg-muted/10 border-muted/20";
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "HTTP": return <Globe className="h-4 w-4" />;
            case "PORT": return <Server className="h-4 w-4" />;
            case "FLOW": return <Zap className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading topology...</div>;

    // Group monitors by parent
    const parents = monitors.filter(m => !m.parentMonitorId || m.parentMonitorId === "");
    const getChildren = (parentId: string) => monitors.filter(m => m.parentMonitorId === parentId);

    return (
        <div className="space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Infrastructure Topology</h1>
                <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest font-medium">Visual dependency mapping & real-time state</p>
            </div>

            <div className="grid gap-12">
                {parents.map(parent => (
                    <div key={parent.id} className="relative">
                        {/* Parent Node */}
                        <div className="flex flex-col items-center">
                            <Card className={`w-64 p-4 border-2 transition-all duration-500 ${parent.status === 'OFFLINE' ? 'border-rose-500 shadow-lg scale-105' : 'border-border'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className={getStatusColor(parent.status)}>
                                        {parent.status}
                                    </Badge>
                                    <div className="text-muted-foreground">{getTypeIcon(parent.type)}</div>
                                </div>
                                <h3 className="font-bold truncate" title={parent.name}>{parent.name}</h3>
                                <p className="text-[10px] text-muted-foreground truncate">{parent.target}</p>
                            </Card>

                            {/* Connection Lines (down to children) */}
                            {getChildren(parent.id).length > 0 && (
                                <div className="w-px h-12 bg-gradient-to-b from-primary/50 to-transparent my-2" />
                            )}
                        </div>

                        {/* Children Nodes */}
                        {getChildren(parent.id).length > 0 && (
                            <div className="flex flex-wrap justify-center gap-6 pt-4 px-4 overflow-x-auto">
                                {getChildren(parent.id).map(child => (
                                    <div key={child.id} className="relative group">
                                        {/* Pseudo-Connector */}
                                        <div className="absolute -top-6 left-1/2 w-px h-6 bg-border group-hover:bg-primary/50 transition-colors" />

                                        <Card className={`w-56 p-3 border transition-all hover:shadow-md ${child.status === 'OFFLINE' ? 'border-rose-500/50 bg-rose-500/5' : 'bg-card'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-2 h-2 rounded-full ${child.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500 pulse-glow'}`} />
                                                <div className="text-muted-foreground/50 scale-75">{getTypeIcon(child.type)}</div>
                                            </div>
                                            <h4 className="text-sm font-semibold truncate">{child.name}</h4>
                                            {child.tags && (
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    {child.tags.split(",").slice(0, 2).map((t: string, i: number) => (
                                                        <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                                                            {t.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {parents.length === 0 && !isLoading && (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                        <Activity className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No monitors found in your infrastructure.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Start by adding your first monitor in the Dashboard.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .pulse-glow {
                    box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
                }
            `}</style>
        </div>
    );
}
