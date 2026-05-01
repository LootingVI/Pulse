"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Monitor as MonitorIcon, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Monitor {
    id: string;
    name: string;
    status: string;
    type: string;
    lastChecked: string;
}

interface Incident {
    id: string;
    title: string;
    status: string;
}

export default function TvClient() {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [time, setTime] = useState(new Date());

    const fetchData = async () => {
        try {
            const [monRes, incRes] = await Promise.all([
                fetch("/api/monitors"),
                fetch("/api/incidents")
            ]);
            
            if (monRes.ok) setMonitors(await monRes.json());
            if (incRes.ok) setIncidents(await incRes.json());
        } catch (e) {
            console.error("TV Mode fetch failed", e);
        }
    };

    useEffect(() => {
        fetchData();
        const dataTimer = setInterval(fetchData, 10000); // 10s refresh
        const clockTimer = setInterval(() => setTime(new Date()), 1000);
        return () => {
            clearInterval(dataTimer);
            clearInterval(clockTimer);
        };
    }, []);

    const total = monitors.length;
    const online = monitors.filter(m => m.status === "ONLINE").length;
    const offline = monitors.filter(m => m.status === "OFFLINE").length;
    const activeIncidents = incidents.filter(i => i.status !== "RESOLVED");

    const uptimePercent = total > 0 ? ((online / total) * 100).toFixed(1) : "100.0";
    const isDegraded = offline > 0 || activeIncidents.length > 0;

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-mono selection:bg-transparent cursor-none">
            {/* Header */}
            <header className={cn(
                "w-full px-8 py-6 flex justify-between items-center border-b-4",
                isDegraded ? "border-red-500/50 bg-red-950/20" : "border-green-500/30 bg-green-950/20"
            )}>
                <div className="flex items-center gap-4">
                    <Activity className={cn("h-12 w-12", isDegraded ? "text-red-500 animate-pulse" : "text-green-500")} />
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">NOC Operations</h1>
                        <p className={cn("text-xl font-bold mt-1", isDegraded ? "text-red-400" : "text-green-400")}>
                            {isDegraded ? "SYSTEM DEGRADED" : "ALL SYSTEMS NOMINAL"}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-black tracking-tight">{time.toLocaleTimeString()}</h2>
                    <p className="text-xl text-zinc-500 font-bold mt-1 uppercase">{time.toLocaleDateString()}</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 grid grid-cols-4 gap-8 p-8">
                {/* Left Column - Big Stats */}
                <div className="col-span-1 space-y-8 flex flex-col">
                    <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-transparent" />
                        <h3 className="text-zinc-400 text-2xl font-bold uppercase mb-2">Global Uptime</h3>
                        <div className="text-8xl font-black text-green-400 tracking-tighter">{uptimePercent}%</div>
                    </div>
                    
                    <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className={cn("absolute top-0 left-0 w-full h-1", offline > 0 ? "bg-red-500" : "bg-zinc-800")} />
                        <h3 className="text-zinc-400 text-2xl font-bold uppercase mb-2">Offline Nodes</h3>
                        <div className={cn("text-8xl font-black tracking-tighter", offline > 0 ? "text-red-500 animate-pulse" : "text-zinc-600")}>
                            {offline}
                        </div>
                    </div>
                    
                    <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className={cn("absolute top-0 left-0 w-full h-1", activeIncidents.length > 0 ? "bg-orange-500" : "bg-zinc-800")} />
                        <h3 className="text-zinc-400 text-2xl font-bold uppercase mb-2">Active Incidents</h3>
                        <div className={cn("text-8xl font-black tracking-tighter", activeIncidents.length > 0 ? "text-orange-500" : "text-zinc-600")}>
                            {activeIncidents.length}
                        </div>
                    </div>
                </div>

                {/* Right Column - Monitor Logs & Incidents */}
                <div className="col-span-3 grid grid-rows-2 gap-8">
                    {/* Offline / Warning Block */}
                    <div className={cn(
                        "rounded-2xl p-8 border flex flex-col",
                        offline > 0 ? "bg-red-950/20 border-red-500/30" : "bg-zinc-900/50 border-zinc-800"
                    )}>
                        <h3 className="text-2xl font-bold uppercase flex items-center gap-3 mb-6">
                            <ShieldAlert className={offline > 0 ? "text-red-500" : "text-zinc-500"} />
                            Critical Alerts
                        </h3>
                        <div className="flex-1 overflow-hidden flex flex-col gap-4">
                            {offline === 0 && activeIncidents.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-zinc-600 text-3xl font-black uppercase tracking-widest">
                                    No Active Alerts
                                </div>
                            ) : (
                                <>
                                    {monitors.filter(m => m.status === "OFFLINE").map(m => (
                                        <div key={m.id} className="bg-red-500/10 border-l-4 border-red-500 p-4 flex justify-between items-center text-xl">
                                            <div className="flex items-center gap-4">
                                                <AlertTriangle className="text-red-500 h-8 w-8 animate-pulse" />
                                                <span className="font-bold text-red-100">{m.name}</span>
                                                <span className="px-3 py-1 bg-red-500/20 rounded text-red-400 text-sm">{m.type}</span>
                                            </div>
                                            <div className="text-red-500/80 font-bold uppercase animate-pulse">OFFLINE</div>
                                        </div>
                                    ))}
                                    {activeIncidents.map(i => (
                                        <div key={i.id} className="bg-orange-500/10 border-l-4 border-orange-500 p-4 flex justify-between items-center text-xl">
                                            <div className="flex items-center gap-4">
                                                <Clock className="text-orange-500 h-8 w-8" />
                                                <span className="font-bold text-orange-100">{i.title}</span>
                                            </div>
                                            <div className="text-orange-500/80 font-bold uppercase">Investigating</div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* All Nodes Matrix */}
                    <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 flex flex-col">
                        <h3 className="text-2xl font-bold uppercase flex items-center gap-3 mb-6 text-zinc-400">
                            <MonitorIcon />
                            Live Matrix
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-hidden">
                            {monitors.slice(0, 24).map(m => (
                                <div key={m.id} className="bg-black/50 p-4 border border-zinc-800/50 rounded-lg flex items-center justify-between">
                                    <span className="truncate font-medium text-zinc-300 pr-4">{m.name}</span>
                                    <div className={cn(
                                        "h-3 w-3 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                        m.status === "ONLINE" ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50 animate-ping"
                                    )} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
