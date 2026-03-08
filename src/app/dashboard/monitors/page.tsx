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
    Heart,
    Tag,
    X,
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { SelfHealingTutorial } from "@/components/SelfHealingTutorial";

export interface Monitor {
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
    tags: string | null;
    flowSteps?: string;
    parentMonitorId?: string | null;
    recoveryEnabled?: boolean;
    recoveryWebhookUrl?: string | null;
    recoveryWebhookMethod?: string | null;
    recoveryWebhookBody?: string | null;
    recoveryInterval?: number;
    recoveryRetries?: number;
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
    {
        group: "Cron & Scripts",
        items: [
            { value: "HEARTBEAT", label: "Heartbeat", icon: Heart, desc: "Your script pings Pulse — alerts if silent", placeholder: "(auto-generated URL)" },
        ],
    },
    {
        group: "Advanced",
        items: [
            { value: "FLOW", label: "Flow (E2E)", icon: Zap, desc: "Chain of HTTP requests with logic", placeholder: "https://api.example.com" },
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
        regions: "eu-central", // Added regions default
        parentMonitorId: "",
        tags: "",
        flowSteps: "[]",
        recoveryEnabled: false,
        recoveryWebhookUrl: "",
        recoveryWebhookMethod: "POST",
        recoveryWebhookBody: "",
        recoveryInterval: "0",
    });
    const [monitorToDelete, setMonitorToDelete] = useState<{ id: string, name: string } | null>(null);
    const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
    const [heartbeatUrl, setHeartbeatUrl] = useState<string | null>(null);
    const [selectedMonitorIds, setSelectedMonitorIds] = useState<Set<string>>(new Set());
    const [tagFilter, setTagFilter] = useState("");
    const [editForm, setEditForm] = useState({
        name: "",
        target: "",
        port: "",
        keyword: "",
        interval: "300",
        maxResponseTime: "",
        customWebhook: "",
        regions: "",
        tags: "",
        flowSteps: "",
        recoveryEnabled: false,
        recoveryWebhookUrl: "",
        recoveryWebhookMethod: "POST",
        recoveryWebhookBody: "",
        recoveryInterval: "0",
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
            if (newMonitor.parentMonitorId) payload.parentMonitorId = newMonitor.parentMonitorId;
            if (newMonitor.tags) payload.tags = newMonitor.tags;
            if (newMonitor.flowSteps) payload.flowSteps = newMonitor.flowSteps;
            payload.regions = selectedRegions.length > 0 ? selectedRegions.join(",") : "local";

            // Self-Healing Payload
            payload.recoveryEnabled = newMonitor.recoveryEnabled;
            payload.recoveryWebhookUrl = newMonitor.recoveryWebhookUrl;
            payload.recoveryWebhookMethod = newMonitor.recoveryWebhookMethod;
            payload.recoveryWebhookBody = newMonitor.recoveryWebhookBody;
            payload.recoveryInterval = newMonitor.recoveryInterval;

            const res = await fetch("/api/monitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const created = await res.json();
                toast.success("Monitor created and started!");
                setIsDialogOpen(false);
                setNewMonitor({
                    name: "", type: "HTTP", target: "", port: "", keyword: "",
                    interval: "300", maxResponseTime: "", customWebhook: "",
                    regions: "eu-central", parentMonitorId: "", tags: "",
                    flowSteps: "[]",
                    recoveryEnabled: false,
                    recoveryWebhookUrl: "",
                    recoveryWebhookMethod: "POST",
                    recoveryWebhookBody: "",
                    recoveryInterval: "0"
                });
                setSelectedType("HTTP");
                // Show heartbeat URL if applicable
                if (created.heartbeatToken) {
                    setHeartbeatUrl(`${window.location.origin}/api/heartbeat/${created.heartbeatToken}`);
                }
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
                    tags: monitor.tags,
                    flowSteps: monitor.flowSteps, // Added flowSteps
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
            tags: monitor.tags || "",
            flowSteps: monitor.flowSteps || "[]",
            recoveryEnabled: monitor.recoveryEnabled || false,
            recoveryWebhookUrl: monitor.recoveryWebhookUrl || "",
            recoveryWebhookMethod: monitor.recoveryWebhookMethod || "POST",
            recoveryWebhookBody: monitor.recoveryWebhookBody || "",
            recoveryInterval: String(monitor.recoveryInterval || 0),
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
            payload.tags = editForm.tags;
            payload.flowSteps = editForm.flowSteps;

            // Self-Healing Payload (Edit)
            payload.recoveryEnabled = editForm.recoveryEnabled;
            payload.recoveryWebhookUrl = editForm.recoveryWebhookUrl;
            payload.recoveryWebhookMethod = editForm.recoveryWebhookMethod;
            payload.recoveryWebhookBody = editForm.recoveryWebhookBody;
            payload.recoveryInterval = editForm.recoveryInterval;

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

    const handleBulkAction = async (action: string, data?: any) => {
        if (selectedMonitorIds.size === 0) return;
        const monitorIds = Array.from(selectedMonitorIds);
        try {
            toast.loading(`Applying bulk action...`, { id: "bulk-action" });
            const res = await fetch("/api/monitors/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, monitorIds, data }),
            });
            if (res.ok) {
                toast.success(`Bulk action successful!`, { id: "bulk-action" });
                setSelectedMonitorIds(new Set());
                fetchMonitors();
            } else {
                toast.error(`Bulk action failed`, { id: "bulk-action" });
            }
        } catch {
            toast.error("An error occurred", { id: "bulk-action" });
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
    const isHeartbeatType = selectedType === "HEARTBEAT";

    const filteredMonitors = monitors.filter(m => {
        if (!tagFilter) return true;
        if (!m.tags) return false;
        const searchTags = tagFilter.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
        const monitorTags = m.tags.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
        return searchTags.some(t => monitorTags.includes(t));
    });

    const toggleSelectAll = () => {
        if (selectedMonitorIds.size === filteredMonitors.length && filteredMonitors.length > 0) {
            setSelectedMonitorIds(new Set());
        } else {
            setSelectedMonitorIds(new Set(filteredMonitors.map(m => m.id)));
        }
    };

    const toggleSelectMonitor = (id: string) => {
        const next = new Set(selectedMonitorIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedMonitorIds(next);
    };

    const allUniqueTags = Array.from(new Set(
        monitors.flatMap(m => m.tags ? m.tags.split(",").map(t => t.trim()) : [])
    )).filter(Boolean).sort();

    const toggleTagInString = (currentTags: string, tagToToggle: string) => {
        const tags = currentTags.split(",").map(t => t.trim()).filter(Boolean);
        const index = tags.indexOf(tagToToggle);
        if (index > -1) {
            tags.splice(index, 1);
        } else {
            tags.push(tagToToggle);
        }
        return tags.join(", ");
    };

    return (
        <div className="space-y-6">
            {/* Heartbeat URL banner — shown after creating a heartbeat monitor */}
            {heartbeatUrl && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-400 mb-1">✅ Heartbeat Monitor Created!</p>
                            <p className="text-xs text-muted-foreground mb-2">Ping this URL from your cron job or script to signal it&apos;s alive. Both GET and POST are accepted.</p>
                            <code className="block text-xs bg-muted rounded px-3 py-2 text-foreground break-all">{heartbeatUrl}</code>
                            <p className="text-xs text-muted-foreground mt-2">Example: <code className="bg-muted px-1 rounded">curl {heartbeatUrl}</code></p>
                        </div>
                        <button
                            onClick={() => { navigator.clipboard.writeText(heartbeatUrl); toast.success("URL copied!"); }}
                            className="shrink-0 text-xs px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                        >Copy</button>
                    </div>
                    <button onClick={() => setHeartbeatUrl(null)} className="text-xs text-muted-foreground mt-2 hover:text-foreground">Dismiss</button>
                </div>
            )}
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
                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="general">General</TabsTrigger>
                                        <TabsTrigger value="automation">Automation & Healing</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="general" className="space-y-4 mt-4">
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

                                        {/* Target — hidden for HEARTBEAT */}
                                        {!isHeartbeatType && (
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
                                                    required={!isHeartbeatType}
                                                />
                                            </div>
                                        )}

                                        {/* Heartbeat info box */}
                                        {isHeartbeatType && (
                                            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-400 space-y-1">
                                                <p className="font-medium">🫀 How Heartbeat Monitors Work</p>
                                                <p>After creation, Pulse generates a unique URL for this monitor. Your cron job, script, or service pings that URL periodically. If no ping is received within <strong>1.5× the check interval</strong>, the monitor goes OFFLINE and an alert is triggered.</p>
                                                <p className="text-muted-foreground">The ping URL will be shown after saving.</p>
                                            </div>
                                        )}

                                        {/* Port */}
                                        {showPort && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Port</label>
                                                <Input
                                                    type="number"
                                                    value={newMonitor.port}
                                                    onChange={(e) => setNewMonitor({ ...newMonitor, port: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        {/* Keyword */}
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

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Interval</label>
                                                <Select
                                                    value={newMonitor.interval}
                                                    onValueChange={(val) => setNewMonitor({ ...newMonitor, interval: val })}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="60">1 min</SelectItem>
                                                        <SelectItem value="300">5 min</SelectItem>
                                                        <SelectItem value="600">10 min</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Tags</label>
                                                <Input
                                                    placeholder="prod, api"
                                                    value={newMonitor.tags}
                                                    onChange={(e) => setNewMonitor({ ...newMonitor, tags: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="automation" className="space-y-4 mt-4">
                                        <SelfHealingTutorial />

                                        <div className="flex items-center justify-between space-x-2 border rounded-lg p-3 bg-muted/30">
                                            <div className="space-y-0.5">
                                                <label className="text-sm font-bold flex items-center gap-2">
                                                    <Zap className="h-3.5 w-3.5 text-primary" />
                                                    Enable Self-Healing
                                                </label>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Trigger a webhook automatically when this monitor goes OFFLINE.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={newMonitor.recoveryEnabled}
                                                onCheckedChange={(checked) => setNewMonitor({ ...newMonitor, recoveryEnabled: checked })}
                                            />
                                        </div>

                                        {newMonitor.recoveryEnabled && (
                                            <div className="space-y-3 p-3 border rounded-lg bg-background animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium">Recovery Webhook URL</label>
                                                    <Input
                                                        placeholder="https://api.render.com/deploy/..."
                                                        value={newMonitor.recoveryWebhookUrl}
                                                        onChange={(e) => setNewMonitor({ ...newMonitor, recoveryWebhookUrl: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium">Method</label>
                                                        <Select
                                                            value={newMonitor.recoveryWebhookMethod}
                                                            onValueChange={(val) => setNewMonitor({ ...newMonitor, recoveryWebhookMethod: val })}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="POST">POST</SelectItem>
                                                                <SelectItem value="GET">GET</SelectItem>
                                                                <SelectItem value="PUT">PUT</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium">Delay (seconds)</label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-xs"
                                                            placeholder="0"
                                                            value={newMonitor.recoveryInterval}
                                                            onChange={(e) => setNewMonitor({ ...newMonitor, recoveryInterval: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium">Custom JSON Body (Optional)</label>
                                                    <Input
                                                        placeholder='{"action": "restart"}'
                                                        className="font-mono text-[10px]"
                                                        value={newMonitor.recoveryWebhookBody}
                                                        onChange={(e) => setNewMonitor({ ...newMonitor, recoveryWebhookBody: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>

                                <Button type="submit" className="w-full mt-4">
                                    <Zap className="mr-2 h-4 w-4" />
                                    Create Monitor
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by tags (e.g. prod, api)..."
                            className="pl-8 pr-8"
                            value={tagFilter}
                            onChange={(e) => setTagFilter(e.target.value)}
                        />
                        {tagFilter && (
                            <button
                                onClick={() => setTagFilter("")}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {allUniqueTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium mr-1 uppercase tracking-wider">Quick Filter:</span>
                        {allUniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setTagFilter(tag === tagFilter ? "" : tag)}
                                className={cn(
                                    "text-[11px] px-2 py-0.5 rounded-full border transition-all",
                                    tagFilter === tag
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedMonitorIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-popover/90 backdrop-blur-md border border-border shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium mr-2">
                        {selectedMonitorIds.size} monitor{selectedMonitorIds.size > 1 ? "s" : ""} selected
                    </span>
                    <div className="h-4 w-px bg-border" />
                    <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={() => handleBulkAction("PAUSE")}>
                        Pause
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={() => handleBulkAction("RESUME")}>
                        Resume
                    </Button>
                    <Select onValueChange={(val) => handleBulkAction("UPDATE_INTERVAL", { interval: val })}>
                        <SelectTrigger className="w-[120px] h-8 rounded-full border-none bg-muted/50 focus:ring-0">
                            <SelectValue placeholder="Interval" />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectItem value="60">1m</SelectItem>
                            <SelectItem value="300">5m</SelectItem>
                            <SelectItem value="600">10m</SelectItem>
                            <SelectItem value="1800">30m</SelectItem>
                            <SelectItem value="3600">60m</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="destructive" className="h-8 rounded-full ml-2" onClick={() => handleBulkAction("DELETE")}>
                        Delete
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-full border-dashed" onClick={() => {
                        const newTags = prompt("Enter replacement tags for selected monitors (comma separated):");
                        if (newTags !== null) handleBulkAction("UPDATE_TAGS", { tags: newTags });
                    }}>
                        <Tag className="h-3.5 w-3.5 mr-1" />
                        Tags
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setSelectedMonitorIds(new Set())}>
                        ✕
                    </Button>
                </div>
            )}

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="accent-primary w-4 h-4 cursor-pointer"
                                    checked={selectedMonitorIds.size === filteredMonitors.length && filteredMonitors.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-28">Type</TableHead>
                            <TableHead className="w-40">Tags</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-24">Interval</TableHead>
                            <TableHead className="w-32">Last Check</TableHead>
                            <TableHead className="w-16 text-right">Del</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                    Loading monitors…
                                </TableCell>
                            </TableRow>
                        ) : filteredMonitors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                    No monitors yet — add your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMonitors.map((monitor) => (
                                <TableRow key={monitor.id} className={monitor.isPaused ? "opacity-60" : ""}>
                                    <TableCell className="text-center">
                                        <input
                                            type="checkbox"
                                            className="accent-primary w-4 h-4 cursor-pointer"
                                            checked={selectedMonitorIds.has(monitor.id)}
                                            onChange={() => toggleSelectMonitor(monitor.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{getStatusBadge(monitor)}</TableCell>
                                    <TableCell className="font-medium">
                                        {monitor.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                            {getTypeIcon(monitor.type)}
                                            {monitor.type}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {monitor.tags ? (
                                                monitor.tags.split(",").map((t, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="text-[10px] bg-muted/30 font-normal px-2 py-0 h-5"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTagFilter(t.trim());
                                                        }}
                                                    >
                                                        {t.trim()}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/40 italic">No tags</span>
                                            )}
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
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="general">General Settings</TabsTrigger>
                                <TabsTrigger value="automation">Automation & Healing</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
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
                                        <label className="text-sm font-medium">Keyword to find</label>
                                        <Input value={editForm.keyword} onChange={(e) => setEditForm({ ...editForm, keyword: e.target.value })} />
                                    </div>
                                )}

                                {editMonitor?.type === "FLOW" && (
                                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-yellow-500">
                                                <Zap className="h-4 w-4" />
                                                Flow Steps
                                            </h4>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const steps = JSON.parse(editForm.flowSteps || "[]");
                                                    steps.push({ method: "GET", url: "", expectedCode: "200" });
                                                    setEditForm({ ...editForm, flowSteps: JSON.stringify(steps) });
                                                }}
                                            >
                                                Add Step
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {JSON.parse(editForm.flowSteps || "[]").map((step: any, idx: number) => (
                                                <div key={idx} className="p-3 border rounded-md bg-background space-y-3 relative group">
                                                    <button
                                                        type="button"
                                                        className="absolute top-2 right-2 text-destructive"
                                                        onClick={() => {
                                                            const steps = JSON.parse(editForm.flowSteps || "[]");
                                                            steps.splice(idx, 1);
                                                            setEditForm({ ...editForm, flowSteps: JSON.stringify(steps) });
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <Select
                                                            value={step.method || "GET"}
                                                            onValueChange={(val) => {
                                                                const steps = JSON.parse(editForm.flowSteps || "[]");
                                                                steps[idx].method = val;
                                                                setEditForm({ ...editForm, flowSteps: JSON.stringify(steps) });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GET">GET</SelectItem>
                                                                <SelectItem value="POST">POST</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            className="col-span-3 h-8"
                                                            placeholder="/api/health"
                                                            value={step.url}
                                                            onChange={(e) => {
                                                                const steps = JSON.parse(editForm.flowSteps || "[]");
                                                                steps[idx].url = e.target.value;
                                                                setEditForm({ ...editForm, flowSteps: JSON.stringify(steps) });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Interval</label>
                                        <Select value={editForm.interval} onValueChange={(val) => setEditForm({ ...editForm, interval: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="60">1 min</SelectItem>
                                                <SelectItem value="300">5 min</SelectItem>
                                                <SelectItem value="600">10 min</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Tags</label>
                                        <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="prod, api" />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="automation" className="space-y-4 mt-4">
                                <SelfHealingTutorial />

                                <div className="flex items-center justify-between space-x-2 border rounded-lg p-3 bg-muted/30">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-bold flex items-center gap-2">
                                            <Zap className="h-3.5 w-3.5 text-primary" />
                                            Enable Self-Healing
                                        </label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Automatically trigger a recovery webhook when OFFLINE.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={editForm.recoveryEnabled}
                                        onCheckedChange={(checked) => setEditForm({ ...editForm, recoveryEnabled: checked })}
                                    />
                                </div>

                                {editForm.recoveryEnabled && (
                                    <div className="space-y-3 p-3 border rounded-lg bg-background animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Recovery Webhook URL</label>
                                            <Input
                                                placeholder="https://api.render.com/deploy/..."
                                                value={editForm.recoveryWebhookUrl}
                                                onChange={(e) => setEditForm({ ...editForm, recoveryWebhookUrl: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Method</label>
                                                <Select
                                                    value={editForm.recoveryWebhookMethod}
                                                    onValueChange={(val) => setEditForm({ ...editForm, recoveryWebhookMethod: val })}
                                                >
                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="POST">POST</SelectItem>
                                                        <SelectItem value="GET">GET</SelectItem>
                                                        <SelectItem value="PUT">PUT</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Delay (seconds)</label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs"
                                                    placeholder="0"
                                                    value={editForm.recoveryInterval}
                                                    onChange={(e) => setEditForm({ ...editForm, recoveryInterval: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Custom JSON Body (Optional)</label>
                                            <Input
                                                placeholder='{"action": "restart"}'
                                                className="font-mono text-[10px]"
                                                value={editForm.recoveryWebhookBody}
                                                onChange={(e) => setEditForm({ ...editForm, recoveryWebhookBody: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>

                        <div className="flex gap-2 pt-4 border-t">
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
