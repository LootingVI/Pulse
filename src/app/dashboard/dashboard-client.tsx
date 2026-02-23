"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle2, Clock, MapPin, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function DashboardClient({
    user,
    stats,
    recentEvents,
    monitorHealth,
}: {
    user: any;
    stats: any;
    recentEvents: any[];
    monitorHealth: any[];
}) {
    // 1. Manage state for stat cards ordering
    const [cardOrder, setCardOrder] = useState(["uptime", "online", "offline", "incidents"]);
    // 2. Manage state for panels ordering
    const [panelOrder, setPanelOrder] = useState(["activity", "health"]);

    // Ensure hydrating matches server
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedCards = localStorage.getItem("pulse_dashboard_cards");
        const savedPanels = localStorage.getItem("pulse_dashboard_panels");
        if (savedCards) setCardOrder(JSON.parse(savedCards));
        if (savedPanels) setPanelOrder(JSON.parse(savedPanels));
    }, []);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, type } = result;

        if (type === "cards") {
            const items = Array.from(cardOrder);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setCardOrder(items);
            localStorage.setItem("pulse_dashboard_cards", JSON.stringify(items));
        } else if (type === "panels") {
            const items = Array.from(panelOrder);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            setPanelOrder(items);
            localStorage.setItem("pulse_dashboard_panels", JSON.stringify(items));
        }
    };

    const cardsMap: Record<string, React.ReactNode> = {
        uptime: (
            <Card className="relative overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Global Uptime</CardTitle>
                    <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="relative z-10 flex-1">
                    <div className="text-2xl font-bold">{stats.uptimePercentage}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Across all {stats.totalMonitors} services</p>
                </CardContent>
            </Card>
        ),
        online: (
            <Card className="relative overflow-hidden group border-green-500/20 hover:border-green-500/50 transition-colors h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Online Now</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent className="relative z-10 flex-1">
                    <div className="text-2xl font-bold text-green-500 font-mono tracking-tight">{stats.onlineMonitors}</div>
                    <p className="text-xs text-muted-foreground mt-1">Services responding normally</p>
                </CardContent>
            </Card>
        ),
        offline: (
            <Card className="relative overflow-hidden group border-red-500/20 hover:border-red-500/50 transition-colors h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Offline Now</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent className="relative z-10 flex-1">
                    <div className="text-2xl font-bold text-red-500 font-mono tracking-tight">{stats.offlineMonitors}</div>
                    <p className="text-xs text-muted-foreground mt-1">Services requiring attention</p>
                </CardContent>
            </Card>
        ),
        incidents: (
            <Card className="relative overflow-hidden group border-orange-500/20 hover:border-orange-500/50 transition-colors h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent className="relative z-10 flex-1">
                    <div className="text-2xl font-bold font-mono tracking-tight">{stats.activeIncidents}</div>
                    <p className="text-xs text-muted-foreground mt-1">Open investigations</p>
                </CardContent>
            </Card>
        ),
    };

    const panelsMap: Record<string, { span: string, element: React.ReactNode }> = {
        activity: {
            span: "md:col-span-4",
            element: (
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="space-y-4">
                            {recentEvents.length > 0 ? (
                                recentEvents.map((event) => (
                                    <div key={event.id} className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                "h-2 w-2 rounded-full shrink-0",
                                                event.status === "ONLINE" ? "bg-green-500" : "bg-red-500"
                                            )}
                                        />
                                        <div className="flex-1 space-y-0.5 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">{event.monitor.name}</p>
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
            )
        },
        health: {
            span: "md:col-span-3",
            element: (
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Monitor Health</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {monitorHealth.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No monitors configured yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {monitorHealth.map((m) => (
                                    <div key={m.id} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-sm font-medium truncate">{m.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{m.target}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-muted-foreground">{m.uptime !== "–" ? `${m.uptime}%` : "No data"}</span>
                                                <div
                                                    className={cn(
                                                        "h-2 w-2 rounded-full border border-black/20",
                                                        m.status === "ONLINE" ? "bg-green-500" : "bg-red-500"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-1 h-6 w-full opacity-90 overflow-hidden items-end">
                                            {m.results.length === 0 ? (
                                                <div className="text-[10px] text-muted-foreground min-w-max">Awaiting first check...</div>
                                            ) : (
                                                [...m.results]
                                                    .reverse()
                                                    .slice(-30)
                                                    .map((res, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "flex-1 rounded-sm shadow-sm hover:opacity-80 transition-opacity",
                                                                res.status === "ONLINE" ? "bg-green-500/80" : "bg-red-500/90"
                                                            )}
                                                            style={{ height: res.status === "ONLINE" ? "100%" : "60%" }}
                                                            title={res.status === "ONLINE" ? "Online" : "Offline"}
                                                        />
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {stats.totalMonitors > 5 && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                        +{stats.totalMonitors - 5} more monitors
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )
        }
    };

    if (!mounted) return null; // Wait for hydration to avoid drag/drop layout mismatch

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user?.name}. Here&apos;s what&apos;s happening now.
                    </p>
                </div>
                <div className="hidden sm:flex text-xs text-muted-foreground items-center gap-1.5 opacity-60">
                    <GripHorizontal className="h-3 w-3" />
                    Layout is draggable
                </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                {/* Stat cards Top row */}
                <Droppable droppableId="stat-cards" direction="horizontal" type="cards">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            {cardOrder.map((id, index) => (
                                <Draggable key={id} draggableId={id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                                "h-full transition-transform",
                                                snapshot.isDragging && "scale-105 z-50 shadow-2xl opacity-90 ring-2 ring-primary/50 rounded-xl"
                                            )}
                                        >
                                            {cardsMap[id]}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {/* Main panels bottom row */}
                <Droppable droppableId="main-panels" direction="vertical" type="panels">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex flex-col md:grid md:grid-cols-7 gap-4"
                        >
                            {panelOrder.map((id, index) => (
                                <Draggable key={id} draggableId={id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                                panelsMap[id].span,
                                                "h-full transition-transform",
                                                snapshot.isDragging && "scale-[1.02] z-50 shadow-2xl opacity-90 ring-2 ring-primary/50 rounded-xl"
                                            )}
                                            style={{
                                                ...provided.draggableProps.style,
                                                ...(snapshot.isDragging ? { gridColumn: "span 7" } : {})
                                            }}
                                        >
                                            <div className={cn(
                                                "absolute top-4 right-4 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-1 rounded-md mb-2 transition-colors z-50",
                                                snapshot.isDragging && "text-primary cursor-grabbing"
                                            )}>
                                                <GripHorizontal className="h-5 w-5" />
                                            </div>
                                            {panelsMap[id].element}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}
