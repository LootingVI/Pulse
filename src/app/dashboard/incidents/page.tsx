"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Incident {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    monitor: {
        id: string;
        name: string;
        target: string;
    };
    updates: {
        id: string;
        status: string;
        message: string;
        createdAt: string;
    }[];
    aiRCA: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
    INVESTIGATING: { label: "Investigating", color: "text-red-500", icon: AlertCircle },
    IDENTIFIED: { label: "Identified", color: "text-orange-500", icon: AlertTriangle },
    MONITORING: { label: "Monitoring", color: "text-blue-500", icon: Clock },
    RESOLVED: { label: "Resolved", color: "text-green-500", icon: CheckCircle2 },
};

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<Incident | null>(null);
    const [updateStatus, setUpdateStatus] = useState("INVESTIGATING");
    const [updateMessage, setUpdateMessage] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchIncidents = async () => {
        try {
            const res = await fetch("/api/incidents");
            setIncidents(await res.json());
        } catch {
            toast.error("Failed to load incidents");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/incidents/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: updateStatus, message: updateMessage }),
            });
            if (res.ok) {
                toast.success("Incident updated");
                setSelected(null);
                setUpdateMessage("");
                fetchIncidents();
            } else {
                toast.error("Failed to update incident");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    const openIncidents = incidents.filter((i) => i.status !== "RESOLVED");
    const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
                <p className="text-muted-foreground">
                    Track and manage service incidents.
                </p>
            </div>

            {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : incidents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <p className="text-muted-foreground font-medium">
                            No incidents reported — all systems are operational!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {openIncidents.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Active ({openIncidents.length})
                            </h2>
                            {openIncidents.map((incident) => {
                                const cfg = statusConfig[incident.status] || statusConfig.INVESTIGATING;
                                const Icon = cfg.icon;
                                return (
                                    <Card key={incident.id} className="border-l-4 border-l-red-500">
                                        <CardContent className="pt-4 pb-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", cfg.color)} />
                                                    <div>
                                                        <p className="font-semibold">{incident.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {incident.monitor.name} · {new Date(incident.createdAt).toLocaleString()}
                                                        </p>
                                                        {incident.description && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {incident.description}
                                                            </p>
                                                        )}
                                                        {incident.aiRCA && (
                                                            <div className="mt-3 bg-primary/10 border border-primary/20 rounded-md p-3 text-sm flex items-start gap-2 shadow-inner">
                                                                <span className="text-primary mt-0.5">🤖</span>
                                                                <p className="text-muted-foreground leading-relaxed">
                                                                    <strong className="text-primary font-semibold mr-1">AI Root Cause Analysis:</strong>
                                                                    {incident.aiRCA.replace('🤖 **AI Analysis:** Based on telemetric patterns, ', 'Based on telemetric patterns, ')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="destructive">{cfg.label}</Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelected(incident);
                                                            setUpdateStatus(incident.status);
                                                        }}
                                                    >
                                                        Update
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {resolvedIncidents.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Resolved ({resolvedIncidents.length})
                            </h2>
                            {resolvedIncidents.slice(0, 10).map((incident) => (
                                <Card key={incident.id} className="opacity-70">
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                                            <div>
                                                <p className="font-semibold">{incident.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {incident.monitor.name} · Resolved{" "}
                                                    {new Date(incident.updatedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Update incident dialog */}
            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Incident</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
                            <p className="text-sm font-medium">{selected.title}</p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Status</label>
                                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                                        <SelectItem value="IDENTIFIED">Identified</SelectItem>
                                        <SelectItem value="MONITORING">Monitoring</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Update Message</label>
                                <Input
                                    placeholder="Describe the current situation..."
                                    value={updateMessage}
                                    onChange={(e) => setUpdateMessage(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isUpdating}>
                                {isUpdating ? "Updating..." : "Post Update"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
