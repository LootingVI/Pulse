"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    Plus,
    Globe,
    Wifi,
    Server,
    Trash2,
    RefreshCw,
    Clock,
    Shield,
    Mail,
    Search,
    Gamepad2,
    MessageSquare,
    Zap,
    Copy,
    CodeXml,
    LineChart,
    Pencil,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";
import { useRouter } from "next/navigation";

interface Monitor {
    id: string;
    name: string;
    type: string;
    target: string;
    port: number | null;
    status: string;
    interval: number;
    lastChecked: string | null;
    isPaused: boolean;
    maxResponseTime: number | null;
    customWebhook: string | null;
    keyword: string | null;
    regions: string;
}

const MONITOR_TYPES = [
    {
        group: "Web",
        items: [
            { value: "HTTP", label: "HTTP(s)", icon: Globe, desc: "Website / REST API", placeholder: "https://example.com" },
            { value: "KEYWORD", label: "Keyword", icon: Search, desc: "Check for a keyword on page", placeholder: "https://example.com" },
            { value: "SSL", label: "SSL / TLS", icon: Shield, desc: "Certificate validity & expiry", placeholder: "example.com" },
            { value: "DNS", label: "DNS", icon: Search, desc: "DNS resolution check", placeholder: "example.com" },
        ],
    },
    {
        group: "Network",
        items: [
            { value: "PING", label: "TCP Ping", icon: Wifi, desc: "TCP connect to port 80", placeholder: "8.8.8.8 or example.com" },
            { value: "PORT", label: "TCP Port", icon: Server, desc: "Any TCP port open check", placeholder: "192.168.1.1" },
            { value: "SMTP", label: "SMTP", icon: Mail, desc: "Email server check", placeholder: "mail.example.com" },
        ],
    },
    {
        group: "Game Servers",
        items: [
            { value: "MINECRAFT", label: "Minecraft", icon: Gamepad2, desc: "Minecraft Java server ping", placeholder: "mc.hypixel.net" },
            { value: "STEAM", label: "Steam / Source", icon: Gamepad2, desc: "Steam/Source engine server", placeholder: "192.168.1.1" },
        ],
    },
    {
        group: "Apps & Services",
        items: [
            { value: "DISCORD", label: "Discord", icon: MessageSquare, desc: "Discord status API or bot endpoint", placeholder: "https://your-bot.com/health" },
        ],
    },
];

const ALL_TYPES = MONITOR_TYPES.flatMap((g) => g.items);

function getTypeInfo(type: string) {
    return ALL_TYPES.find((t) => t.value === type);
}

export default function MonitorsPage() {
    const router = useRouter();
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState("HTTP");
    const [edgeNodes, setEdgeNodes] = useState<{ id: string; name: string }[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [newMonitor, setNewMonitor] = useState({
        name: "",
        type: "HTTP",
        target: "",
        port: "",
        keyword: "",
        interval: "300",
        maxResponseTime: "",
        customWebhook: "",
    });
    const [monitorToDelete, setMonitorToDelete] = useState<{ id: string, name: string } | null>(null);
    const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        target: "",
        port: "",
        keyword: "",
        interval: "300",
        maxResponseTime: "",
        customWebhook: "",
        regions: "",
    });
    const [isEditSaving, setIsEditSaving] = useState(false);

    const fetchMonitors = async () => {
        try {
            const res = await fetch("/api/monitors");
            const data = await res.json();
            setMonitors(data);
        } catch {
            toast.error("Failed to fetch monitors");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
        const timer = setInterval(fetchMonitors, 30_000);

        // Fetch configured edge nodes from settings
        fetch("/api/settings").then(r => r.json()).then(data => {
            if (data.edgeNodes) {
                try {
                    const nodes = JSON.parse(data.edgeNodes);
                    setEdgeNodes(nodes.filter((n: any) => n.id && n.url));
                    // Pre-select all available nodes by default
                    setSelectedRegions(nodes.filter((n: any) => n.id && n.url).map((n: any) => n.id));
                } catch { }
            }
        }).catch(() => { });

        return () => clearInterval(timer);
    }, []);

    const handleTypeChange = (val: string) => {
        setSelectedType(val);
        setNewMonitor((prev) => ({ ...prev, type: val }));
    };

    const handleAddMonitor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                name: newMonitor.name,
                type: newMonitor.type,
                target: newMonitor.target,
                interval: newMonitor.interval,
            };
            if (newMonitor.port) payload.port = newMonitor.port;
            if (newMonitor.keyword) payload.keyword = newMonitor.keyword;
            if (newMonitor.maxResponseTime) payload.maxResponseTime = newMonitor.maxResponseTime;
            if (newMonitor.customWebhook) payload.customWebhook = newMonitor.customWebhook;
            payload.regions = selectedRegions.length > 0 ? selectedRegions.join(",") : "local";

            const res = await fetch("/api/monitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success("Monitor created and started!");
                setIsDialogOpen(false);
                setNewMonitor({ name: "", type: "HTTP", target: "", port: "", keyword: "", interval: "300", maxResponseTime: "", customWebhook: "" });
                setSelectedType("HTTP");
                fetchMonitors();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create monitor");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    const confirmDelete = async () => {
        if (!monitorToDelete) return;
        try {
            const res = await fetch(`/api/monitors/${monitorToDelete.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Monitor deleted");
                fetchMonitors();
            } else {
                toast.error("Failed to delete monitor");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setMonitorToDelete(null);
        }
    };

    const handleClone = async (monitor: Monitor) => {
        try {
            toast.loading(`Cloning ${monitor.name}...`, { id: `clone-${monitor.id}` });
            const res = await fetch("/api/monitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${monitor.name} (Copy)`,
                    type: monitor.type,
                    target: monitor.target,
                    port: monitor.port,
                    interval: monitor.interval,
                    keyword: monitor.keyword,
                    isPaused: monitor.isPaused,
                    maxResponseTime: monitor.maxResponseTime,
                    customWebhook: monitor.customWebhook,
                    regions: monitor.regions,
                }),
            });
            if (res.ok) {
                toast.success("Monitor cloned successfully!", { id: `clone-${monitor.id}` });
                fetchMonitors();
            } else {
                toast.error("Failed to clone monitor", { id: `clone-${monitor.id}` });
            }
        } catch {
            toast.error("An error occurred during cloning", { id: `clone-${monitor.id}` });
        }
    };

    const handleCopyBadge = (id: string, name: string) => {
        const url = `${window.location.origin}/api/monitors/${id}/badge`;
        const md = `[![${name} Uptime](${url})](${window.location.origin})`;
        navigator.clipboard.writeText(md);
        toast.success("Markdown badge code copied to clipboard!");
    };

    const handleTestNow = async (id: string) => {
        try {
            toast.loading("Testing monitor...", { id: `test-${id}` });
            const res = await fetch(`/api/monitors/${id}/test`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Check complete! Status: ${data.status} (${data.responseTime}ms)`, { id: `test-${id}` });
                fetchMonitors();
            } else {
                toast.error(`Test failed: ${data.error}`, { id: `test-${id}` });
            }
        } catch {
            toast.error("An error occurred during test", { id: `test-${id}` });
        }
    };

    const togglePause = async (id: string, currentlyPaused: boolean) => {
        try {
            const res = await fetch(`/api/monitors/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPaused: !currentlyPaused })
            });
            if (res.ok) {
                toast.success(currentlyPaused ? "Monitor Resumed" : "Monitor Paused");
                fetchMonitors();
            } else {
                toast.error("Failed to update monitor state");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    const openEditDialog = (monitor: Monitor) => {
        setEditMonitor(monitor);
        setEditForm({
            name: monitor.name,
            target: monitor.target,
            port: monitor.port ? String(monitor.port) : "",
            keyword: monitor.keyword || "",
            interval: String(monitor.interval),
            maxResponseTime: monitor.maxResponseTime ? String(monitor.maxResponseTime) : "",
            customWebhook: monitor.customWebhook || "",
            regions: monitor.regions || "",
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editMonitor) return;
        setIsEditSaving(true);
        try {
            const payload: any = {
                name: editForm.name,
                target: editForm.target,
                interval: editForm.interval,
            };
            if (editForm.port) payload.port = editForm.port;
            if (editForm.keyword) payload.keyword = editForm.keyword;
            if (editForm.maxResponseTime) payload.maxResponseTime = editForm.maxResponseTime;
            if (editForm.customWebhook) payload.customWebhook = editForm.customWebhook;
            if (editForm.regions) payload.regions = editForm.regions;

            const res = await fetch(`/api/monitors/${editMonitor.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success("Monitor updated!");
                setEditMonitor(null);
                fetchMonitors();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update monitor");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsEditSaving(false);
        }
    };

    const getStatusBadge = (monitor: Monitor) => {

        if (monitor.isPaused) {
            return (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1.5" />
                    Paused
                </Badge>
            );
        }

        switch (monitor.status) {
            case "ONLINE":
                return (
                    <Badge className="bg-green-500 hover:bg-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                        Online
                    </Badge>
                );
            case "OFFLINE":
                return (
                    <Badge variant="destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-white mr-1.5" />
                        Offline
                    </Badge>
                );
            default:
                return <Badge variant="outline">Pending…</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        const info = getTypeInfo(type);
        const Icon = info?.icon ?? Activity;
        return <Icon className="h-4 w-4" />;
    };

    const formatInterval = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${seconds / 60}m`;
        return `${seconds / 3600}h`;
    };

    const currentTypeInfo = getTypeInfo(selectedType);
    const showPort = ["PORT", "SMTP", "STEAM", "MINECRAFT"].includes(selectedType);
    const showKeyword = selectedType === "KEYWORD";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
                    <p className="text-muted-foreground">Manage your uptime monitoring probes.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchMonitors}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Monitor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add New Monitor</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddMonitor} className="space-y-4 pt-2">
                                {/* Type selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Protocol / Type</label>
                                    <Select value={selectedType} onValueChange={handleTypeChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MONITOR_TYPES.map((group) => (
                                                <SelectGroup key={group.group}>
                                                    <SelectLabel>{group.group}</SelectLabel>
                                                    {group.items.map((item) => (
                                                        <SelectItem key={item.value} value={item.value}>
                                                            <div className="flex flex-col">
                                                                <span>{item.label}</span>
                                                                <span className="text-xs text-muted-foreground">{item.desc}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {currentTypeInfo && (
                                        <p className="text-xs text-muted-foreground pl-1">
                                            {currentTypeInfo.desc}
                                        </p>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Display Name</label>
                                    <Input
                                        placeholder="My Minecraft Server"
                                        value={newMonitor.name}
                                        onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Target */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {selectedType === "DNS" ? "Domain" :
                                            selectedType === "STEAM" || selectedType === "PORT" ? "IP Address / Host" :
                                                selectedType === "SSL" ? "Domain (without https://)" :
                                                    selectedType === "SMTP" ? "Mail Server Host" :
                                                        selectedType === "DISCORD" ? "Discord Bot User ID" :
                                                            "Target URL / Host"}
                                    </label>
                                    <Input
                                        placeholder={currentTypeInfo?.placeholder ?? "https://example.com"}
                                        value={newMonitor.target}
                                        onChange={(e) => setNewMonitor({ ...newMonitor, target: e.target.value })}
                                        required={true}
                                    />
                                </div>

                                {/* Port (for PORT, SMTP, STEAM, MINECRAFT) */}
                                {showPort && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Port
                                            <span className="text-muted-foreground ml-1 font-normal text-xs">
                                                {selectedType === "MINECRAFT" && "(default: 25565)"}
                                                {selectedType === "STEAM" && "(default: 27015)"}
                                                {selectedType === "SMTP" && "(default: 25)"}
                                            </span>
                                        </label>
                                        <Input
                                            type="number"
                                            placeholder={
                                                selectedType === "MINECRAFT" ? "25565" :
                                                    selectedType === "STEAM" ? "27015" :
                                                        selectedType === "SMTP" ? "25" : "80"
                                            }
                                            value={newMonitor.port}
                                            onChange={(e) => setNewMonitor({ ...newMonitor, port: e.target.value })}
                                        />
                                    </div>
                                )}

                                {/* Keyword (for KEYWORD type) */}
                                {showKeyword && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Keyword to find</label>
                                        <Input
                                            placeholder="Online"
                                            value={newMonitor.keyword}
                                            onChange={(e) => setNewMonitor({ ...newMonitor, keyword: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}

                                {/* Advanced/Unique Features */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Max Expected Response Time (ms) <span className="text-xs text-muted-foreground ml-1">(Optional)</span></label>
                                        <Input
                                            type="number"
                                            placeholder="1000"
                                            value={newMonitor.maxResponseTime}
                                            onChange={(e) => setNewMonitor({ ...newMonitor, maxResponseTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Custom Webhook Trigger <span className="text-xs text-muted-foreground ml-1">(Optional)</span></label>
                                        <Input
                                            type="url"
                                            placeholder="https://api.example.com/webhook"
                                            value={newMonitor.customWebhook}
                                            onChange={(e) => setNewMonitor({ ...newMonitor, customWebhook: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Interval */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Check Interval</label>
                                    <Select
                                        value={newMonitor.interval}
                                        onValueChange={(val) => setNewMonitor({ ...newMonitor, interval: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="60">Every 1 minute</SelectItem>
                                            <SelectItem value="300">Every 5 minutes</SelectItem>
                                            <SelectItem value="600">Every 10 minutes</SelectItem>
                                            <SelectItem value="1800">Every 30 minutes</SelectItem>
                                            <SelectItem value="3600">Every hour</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>


                                {/* Edge Node Regions */}
                                {edgeNodes.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Probe Regions
                                            <span className="text-xs text-muted-foreground ml-2 font-normal">Select which edge nodes should check this monitor</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {edgeNodes.map((node) => (
                                                <label key={node.id} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${selectedRegions.includes(node.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRegions.includes(node.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRegions([...selectedRegions, node.id]);
                                                            } else {
                                                                setSelectedRegions(selectedRegions.filter(r => r !== node.id));
                                                            }
                                                        }}
                                                        className="accent-primary"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium">{node.name || node.id}</div>
                                                        <div className="text-xs text-muted-foreground">{node.id}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        {selectedRegions.length === 0 && (
                                            <p className="text-xs text-amber-500">⚠ No region selected — monitor will run locally only.</p>
                                        )}
                                    </div>
                                )}

                                <Button type="submit" className="w-full">
                                    <Zap className="mr-2 h-4 w-4" />
                                    Create Monitor
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-28">Type</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-24">Interval</TableHead>
                            <TableHead className="w-32">Last Check</TableHead>
                            <TableHead className="w-16 text-right">Del</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    Loading monitors…
                                </TableCell>
                            </TableRow>
                        ) : monitors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    No monitors yet — add your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            monitors.map((monitor) => (
                                <TableRow key={monitor.id} className={monitor.isPaused ? "opacity-60" : ""}>
                                    <TableCell>{getStatusBadge(monitor)}</TableCell>
                                    <TableCell className="font-medium">{monitor.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                            {getTypeIcon(monitor.type)}
                                            {monitor.type}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm truncate max-w-[180px]">
                                        {monitor.target}{monitor.port ? `:${monitor.port}` : ""}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                            <Clock className="h-3 w-3" />
                                            {formatInterval(monitor.interval)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {monitor.lastChecked
                                            ? new Date(monitor.lastChecked).toLocaleTimeString()
                                            : "Pending…"}
                                    </TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                                            onClick={() => router.push(`/dashboard/monitors/${monitor.id}`)}
                                            title="View Detailed Analytics"
                                        >
                                            <LineChart className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                                            onClick={() => handleTestNow(monitor.id)}
                                            title="Test Now"
                                        >
                                            <Zap className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                                            onClick={() => handleClone(monitor)}
                                            title="Clone Monitor"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-foreground h-8"
                                            onClick={() => togglePause(monitor.id, monitor.isPaused)}
                                        >
                                            {monitor.isPaused ? "Resume" : "Pause"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                                            onClick={() => handleCopyBadge(monitor.id, monitor.name)}
                                            title="Copy Status Badge"
                                        >
                                            <CodeXml className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                                            onClick={() => openEditDialog(monitor)}
                                            title="Edit Monitor"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                            onClick={() => setMonitorToDelete({ id: monitor.id, name: monitor.name })}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConfirmModal
                isOpen={!!monitorToDelete}
                onClose={() => setMonitorToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Monitor"
                description={`Are you sure you want to delete "${monitorToDelete?.name}"? All related history and incidents will be permanently removed.`}
            />

            {/* Edit Monitor Dialog */}
            <Dialog open={!!editMonitor} onOpenChange={(open) => { if (!open) setEditMonitor(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Monitor — {editMonitor?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Display Name</label>
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target URL / Host</label>
                            <Input value={editForm.target} onChange={(e) => setEditForm({ ...editForm, target: e.target.value })} required />
                        </div>
                        {editMonitor?.port !== null && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Port</label>
                                <Input type="number" value={editForm.port} onChange={(e) => setEditForm({ ...editForm, port: e.target.value })} />
                            </div>
                        )}
                        {editMonitor?.type === "KEYWORD" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Keyword</label>
                                <Input value={editForm.keyword} onChange={(e) => setEditForm({ ...editForm, keyword: e.target.value })} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Max Response Time (ms)</label>
                                <Input type="number" placeholder="1000" value={editForm.maxResponseTime} onChange={(e) => setEditForm({ ...editForm, maxResponseTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Custom Webhook</label>
                                <Input type="url" placeholder="https://..." value={editForm.customWebhook} onChange={(e) => setEditForm({ ...editForm, customWebhook: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Probe Regions <span className="text-xs text-muted-foreground font-normal">(comma-separated node IDs)</span></label>
                            <Input value={editForm.regions} onChange={(e) => setEditForm({ ...editForm, regions: e.target.value })} placeholder="eu-central,us-east" />
                            {edgeNodes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {edgeNodes.map(node => (
                                        <button key={node.id} type="button"
                                            onClick={() => {
                                                const current = editForm.regions.split(",").map(s => s.trim()).filter(Boolean);
                                                const next = current.includes(node.id)
                                                    ? current.filter(r => r !== node.id)
                                                    : [...current, node.id];
                                                setEditForm({ ...editForm, regions: next.join(",") });
                                            }}
                                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${editForm.regions.split(",").map(s => s.trim()).includes(node.id)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background border-border hover:bg-muted"
                                                }`}>
                                            {node.name || node.id}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Check Interval</label>
                            <Select value={editForm.interval} onValueChange={(val) => setEditForm({ ...editForm, interval: val })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="60">Every 1 minute</SelectItem>
                                    <SelectItem value="300">Every 5 minutes</SelectItem>
                                    <SelectItem value="600">Every 10 minutes</SelectItem>
                                    <SelectItem value="1800">Every 30 minutes</SelectItem>
                                    <SelectItem value="3600">Every hour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditMonitor(null)}>Cancel</Button>
                            <Button type="submit" className="flex-1" disabled={isEditSaving}>
                                {isEditSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
