"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save, Bell, Webhook, Mail, Globe, Trash2, Plus, GitFork } from "lucide-react";
import { toast } from "sonner";

interface EdgeNode {
    id: string;
    name: string;
    url: string;
    secret: string;
}

export default function SettingsPage() {
    const [discordWebhook, setDiscordWebhook] = useState("");
    const [notifyDown, setNotifyDown] = useState(true);
    const [notifyUp, setNotifyUp] = useState(true);

    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");
    const [smtpFrom, setSmtpFrom] = useState("");

    const [edgeNodes, setEdgeNodes] = useState<EdgeNode[]>([]);
    const [testingNode, setTestingNode] = useState<number | null>(null);

    // Cascade Detection
    const [cascadeEnabled, setCascadeEnabled] = useState(false);
    const [cascadeThreshold, setCascadeThreshold] = useState("3");
    const [cascadeWindow, setCascadeWindow] = useState("60");

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const res = await fetch("/api/settings");
            const data = await res.json();
            if (data.discordWebhook) setDiscordWebhook(data.discordWebhook);
            if (data.notifyDown) setNotifyDown(data.notifyDown === "true");
            if (data.notifyUp) setNotifyUp(data.notifyUp === "true");
            if (data.smtpHost) setSmtpHost(data.smtpHost);
            if (data.smtpPort) setSmtpPort(data.smtpPort);
            if (data.smtpUser) setSmtpUser(data.smtpUser);
            if (data.smtpPass) setSmtpPass(data.smtpPass);
            if (data.smtpFrom) setSmtpFrom(data.smtpFrom);
            if (data.edgeNodes) {
                try {
                    setEdgeNodes(JSON.parse(data.edgeNodes));
                } catch { }
            }
            if (data.cascadeEnabled) setCascadeEnabled(data.cascadeEnabled === "true");
            if (data.cascadeThreshold) setCascadeThreshold(data.cascadeThreshold);
            if (data.cascadeWindow) setCascadeWindow(data.cascadeWindow);
        };
        fetchSettings();
    }, []);

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    discordWebhook,
                    notifyDown: notifyDown.toString(),
                    notifyUp: notifyUp.toString(),
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPass,
                    smtpFrom,
                    edgeNodes: JSON.stringify(edgeNodes.filter((n) => n.id && n.url)),
                    cascadeEnabled: cascadeEnabled.toString(),
                    cascadeThreshold,
                    cascadeWindow,
                }),
            });
            toast.success("Settings saved!");
        } catch {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const updateEdgeNode = (index: number, field: keyof EdgeNode, value: string) => {
        const newNodes = [...edgeNodes];
        newNodes[index][field] = value;
        setEdgeNodes(newNodes);
    };

    const removeEdgeNode = (index: number) => {
        setEdgeNodes(edgeNodes.filter((_, i) => i !== index));
    };

    const testEdgeNode = async (index: number) => {
        const node = edgeNodes[index];
        if (!node.url || !node.secret) {
            toast.error("Please fill in the Worker URL and Probe Secret first.");
            return;
        }
        setTestingNode(index);
        try {
            const res = await fetch("/api/settings/test-probe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: node.url, secret: node.secret }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`✅ Node "${node.name || node.id}" is reachable! Latency: ${data.responseTime}ms`);
            } else {
                toast.error(`❌ Test failed: ${data.error}`);
            }
        } catch {
            toast.error("Could not reach the probe endpoint.");
        } finally {
            setTestingNode(null);
        }
    };


    const testEmail = async () => {
        if (!smtpHost || !smtpFrom) {
            toast.error("Please fill in SMTP Host and From Address and save first.");
            return;
        }
        try {
            const res = await fetch("/api/settings/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: smtpFrom }),
            });
            if (res.ok) {
                toast.success("Test email sent! Check your inbox.");
            } else {
                toast.error("Failed to send test email. Check your settings.");
            }
        } catch {
            toast.error("Error occurred while sending test email");
        }
    };

    const testWebhook = async () => {
        if (!discordWebhook) {
            toast.error("Please enter a Discord Webhook URL first");
            return;
        }
        try {
            const res = await fetch("/api/settings/test-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: discordWebhook }),
            });
            if (res.ok) {
                toast.success("Test message sent! Check your Discord.");
            } else {
                toast.error("Webhook test failed — check the URL");
            }
        } catch {
            toast.error("Failed to reach the webhook URL");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Configure notifications and account preferences.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications
                    </CardTitle>
                    <CardDescription>
                        Choose when you want to be notified.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Monitor goes offline</p>
                            <p className="text-xs text-muted-foreground">
                                Get notified when a service goes down
                            </p>
                        </div>
                        <Switch checked={notifyDown} onCheckedChange={setNotifyDown} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Monitor recovers</p>
                            <p className="text-xs text-muted-foreground">
                                Get notified when a service comes back up
                            </p>
                        </div>
                        <Switch checked={notifyUp} onCheckedChange={setNotifyUp} />
                    </div>
                </CardContent>
            </Card>

            {/* ── Cascade / Dependency Detection ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitFork className="h-5 w-5" />
                        Cascade Detection
                    </CardTitle>
                    <CardDescription>
                        Automatically group simultaneous outages into a single incident and suppress duplicate alerts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Enable Cascade Detection</p>
                            <p className="text-xs text-muted-foreground">When multiple monitors fail at once, group them into one "Mass Outage" incident</p>
                        </div>
                        <Switch checked={cascadeEnabled} onCheckedChange={setCascadeEnabled} />
                    </div>

                    <div className={cascadeEnabled ? "space-y-4" : "space-y-4 opacity-40 pointer-events-none"}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Outage Threshold</label>
                                <Input
                                    type="number"
                                    min="2"
                                    max="50"
                                    value={cascadeThreshold}
                                    onChange={(e) => setCascadeThreshold(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Min. monitors that must fail to trigger cascade grouping</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Time Window (seconds)</label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="600"
                                    value={cascadeWindow}
                                    onChange={(e) => setCascadeWindow(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">How wide the time window is to detect a simultaneous failure</p>
                            </div>
                        </div>
                        <div className="rounded-md bg-muted/40 border p-3 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">💡 Parent–Child Dependencies</p>
                            <p>You can also assign a <strong>Parent Monitor</strong> to individual monitors (e.g. "Database" is the parent of "API Server"). If the parent goes OFFLINE, child alerts are automatically suppressed — configured per monitor in the Monitors page.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Webhook className="h-5 w-5" />
                        Discord Webhook
                    </CardTitle>
                    <CardDescription>
                        Receive notifications directly in your Discord server.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Webhook URL</label>
                        <Input
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={discordWebhook}
                            onChange={(e) => setDiscordWebhook(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Create a webhook in your Discord server under Server Settings →
                            Integrations → Webhooks.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={testWebhook}>
                            Test Webhook
                        </Button>
                        <Button onClick={saveSettings} disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        SMTP Email Settings
                    </CardTitle>
                    <CardDescription>
                        Configure SMTP to send email notifications for monitor incidents and password resets.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SMTP Host</label>
                            <Input
                                placeholder="smtp.example.com"
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SMTP Port</label>
                            <Input
                                placeholder="465 or 587"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SMTP User</label>
                            <Input
                                placeholder="alerts@example.com"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SMTP Password</label>
                            <Input
                                type="password"
                                placeholder={"••••••••"}
                                value={smtpPass}
                                onChange={(e) => setSmtpPass(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium">From Address</label>
                            <Input
                                placeholder="Pulse Monitoring <alerts@example.com>"
                                value={smtpFrom}
                                onChange={(e) => setSmtpFrom(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={testEmail}>
                            Test Email
                        </Button>
                        <Button onClick={saveSettings} disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Cloudflare Edge Probes (Multi-Region)
                    </CardTitle>
                    <CardDescription>
                        Run real ping/http checks from distributed nodes across the globe. Download the <a href="/edge-probe.js" download className="text-primary underline">Cloudflare Worker Script</a>, deploy it to a region, and link it here.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {edgeNodes.map((node, i) => (
                        <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg">
                            <div className="flex gap-2 items-center flex-wrap">
                                <Input value={node.id} onChange={(e) => updateEdgeNode(i, 'id', e.target.value)} placeholder="Node ID (e.g. us-east)" className="w-[130px]" />
                                <Input value={node.name} onChange={(e) => updateEdgeNode(i, 'name', e.target.value)} placeholder="Display Name (e.g. US East)" className="w-[160px]" />
                                <Input value={node.url} onChange={(e) => updateEdgeNode(i, 'url', e.target.value)} placeholder="Worker URL (https://...)" className="flex-1 min-w-[180px]" />
                                <Input value={node.secret} onChange={(e) => updateEdgeNode(i, 'secret', e.target.value)} placeholder="Probe Secret" type="password" className="w-[130px]" />
                                <Button variant="outline" size="sm" onClick={() => testEdgeNode(i)} disabled={testingNode === i}>
                                    {testingNode === i ? "Testing..." : "Test"}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeEdgeNode(i)} className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => setEdgeNodes([...edgeNodes, { id: "", name: "", url: "", secret: "" }])}>
                            <Plus className="h-4 w-4 mr-2" /> Add Edge Node
                        </Button>
                        <Button onClick={saveSettings} disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
