"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, Pencil, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { cn } from "@/lib/utils";

interface Monitor { id: string; name: string; }
interface MaintenanceWindow {
    id: string;
    name: string;
    description?: string;
    startTime: string;
    endTime: string;
    monitors: Monitor[];
}

function windowStatus(w: MaintenanceWindow): "upcoming" | "active" | "past" {
    const now = Date.now();
    const start = new Date(w.startTime).getTime();
    const end = new Date(w.endTime).getTime();
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "active";
    return "past";
}

const STATUS_CONFIG = {
    active: { label: "Active", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: <Clock className="h-3.5 w-3.5" /> },
    upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <CalendarClock className="h-3.5 w-3.5" /> },
    past: { label: "Completed", color: "bg-muted text-muted-foreground border-border", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

export default function MaintenancePage() {
    const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
    const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [toDelete, setToDelete] = useState<MaintenanceWindow | null>(null);
    const [editing, setEditing] = useState<MaintenanceWindow | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        startTime: "",
        endTime: "",
        monitorIds: [] as string[],
    });

    const fetchData = async () => {
        const [winRes, monRes] = await Promise.all([
            fetch("/api/maintenance"),
            fetch("/api/monitors"),
        ]);
        if (winRes.ok) setWindows(await winRes.json());
        if (monRes.ok) {
            const data = await monRes.json();
            setAllMonitors(Array.isArray(data) ? data : data.monitors ?? []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", description: "", startTime: "", endTime: "", monitorIds: [] });
        setIsOpen(true);
    };

    const openEdit = (w: MaintenanceWindow) => {
        setEditing(w);
        setForm({
            name: w.name,
            description: w.description ?? "",
            startTime: new Date(w.startTime).toISOString().slice(0, 16),
            endTime: new Date(w.endTime).toISOString().slice(0, 16),
            monitorIds: w.monitors.map((m) => m.id),
        });
        setIsOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const url = editing ? `/api/maintenance/${editing.id}` : "/api/maintenance";
        const method = editing ? "PATCH" : "POST";
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                toast.success(editing ? "Maintenance window updated!" : "Maintenance window created!");
                setIsOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error ?? "Failed to save");
            }
        } catch { toast.error("Unexpected error"); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!toDelete) return;
        const res = await fetch(`/api/maintenance/${toDelete.id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Deleted"); fetchData(); }
        else toast.error("Failed to delete");
        setToDelete(null);
    };

    const toggleMonitor = (id: string) => {
        setForm((f) => ({
            ...f,
            monitorIds: f.monitorIds.includes(id)
                ? f.monitorIds.filter((m) => m !== id)
                : [...f.monitorIds, id],
        }));
    };

    if (isLoading) return <div className="text-muted-foreground p-10">Loading...</div>;

    const sortedWindows = [...windows].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Maintenance Windows</h1>
                    <p className="text-muted-foreground">Schedule planned downtime to suppress false alerts and inform users.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> New Window
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editing ? "Edit Maintenance Window" : "Create Maintenance Window"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Name</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Database upgrade" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Description (optional)</label>
                                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's happening during this window?" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Start</label>
                                    <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">End</label>
                                    <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Affected Monitors</label>
                                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border rounded-md bg-muted/30">
                                    {allMonitors.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleMonitor(m.id)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                                form.monitorIds.includes(m.id)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background text-muted-foreground border-border hover:border-primary"
                                            )}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                    {!allMonitors.length && <span className="text-xs text-muted-foreground">No monitors found</span>}
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Window"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {!sortedWindows.length ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No maintenance windows</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">Create a maintenance window to pause monitors and notify users on your status page during planned downtime.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sortedWindows.map((w) => {
                        const status = windowStatus(w);
                        const cfg = STATUS_CONFIG[status];
                        return (
                            <Card key={w.id} className={cn("transition-colors", status === "active" && "border-amber-500/40")}>
                                <CardContent className="flex items-start justify-between gap-4 py-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-foreground">{w.name}</span>
                                            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", cfg.color)}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>
                                        {w.description && <p className="text-sm text-muted-foreground mb-2">{w.description}</p>}
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>🕐 {new Date(w.startTime).toLocaleString()} → {new Date(w.endTime).toLocaleString()}</span>
                                        </div>
                                        {w.monitors.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {w.monitors.map((m) => (
                                                    <Badge key={m.id} variant="secondary" className="text-xs">{m.name}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="outline" size="icon" onClick={() => openEdit(w)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => setToDelete(w)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Maintenance Window"
                description={`Delete "${toDelete?.name}"? This cannot be undone.`}
            />
        </div>
    );
}
