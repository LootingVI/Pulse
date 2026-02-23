"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Send, Eye, Loader2, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "weekly" | "monthly";

export default function ReportsPage() {
    const [period, setPeriod] = useState<Period>("weekly");
    const [recipients, setRecipients] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [lastResult, setLastResult] = useState<{ sent: number; total: number; subject: string } | null>(null);

    const loadPreview = async () => {
        setIsPreviewLoading(true);
        setPreview(null);
        try {
            const res = await fetch(`/api/admin/reports?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setPreview(data.html);
                toast.success("Preview loaded with real data!");
            } else {
                toast.error("Failed to load preview");
            }
        } catch { toast.error("Unexpected error"); }
        finally { setIsPreviewLoading(false); }
    };

    const sendReport = async () => {
        setIsSending(true);
        setLastResult(null);
        const recipientList = recipients.split(",").map((s) => s.trim()).filter(Boolean);
        try {
            const res = await fetch("/api/admin/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ period, recipients: recipientList }),
            });
            const data = await res.json();
            if (data.success) {
                setLastResult(data);
                toast.success(`Report sent to ${data.sent} recipient(s)!`);
            } else {
                toast.error(data.error ?? "Failed to send report. Check SMTP settings.");
            }
        } catch { toast.error("Unexpected error"); }
        finally { setIsSending(false); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Uptime Reports</h1>
                <p className="text-muted-foreground">Generate and send beautiful email reports from real monitoring data.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                {/* Config panel */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" /> Report Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Period selector */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Report Period</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["weekly", "monthly"] as Period[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={cn(
                                                "py-2 px-3 rounded-md border text-sm font-medium transition-colors",
                                                period === p
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background text-muted-foreground border-border hover:border-primary"
                                            )}
                                        >
                                            {p === "weekly" ? "📅 Last 7 Days" : "📆 Last 30 Days"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recipients */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" /> Recipients
                                </label>
                                <Input
                                    value={recipients}
                                    onChange={(e) => setRecipients(e.target.value)}
                                    placeholder="email@example.com, another@example.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Comma-separated. Leave empty to send to all admins.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="space-y-2 pt-1">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={loadPreview}
                                    disabled={isPreviewLoading}
                                >
                                    {isPreviewLoading
                                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        : <Eye className="h-4 w-4 mr-2" />
                                    }
                                    {isPreviewLoading ? "Loading real data..." : "Preview Report"}
                                </Button>
                                <Button
                                    className="w-full"
                                    onClick={sendReport}
                                    disabled={isSending}
                                >
                                    {isSending
                                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        : <Send className="h-4 w-4 mr-2" />
                                    }
                                    {isSending ? "Sending..." : "Send Report Now"}
                                </Button>
                            </div>

                            {/* Success result */}
                            {lastResult && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-green-400">Sent successfully!</p>
                                        <p className="text-green-400/70 text-xs mt-0.5">
                                            {lastResult.sent}/{lastResult.total} recipients • {lastResult.subject}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                💡 <strong>Tip:</strong> You can automate weekly/monthly reports by calling <code className="bg-muted px-1 rounded text-xs">POST /api/admin/reports</code> from a cron job or the Pelican Panel startup command.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview panel */}
                <Card className="overflow-hidden">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base">Email Preview</CardTitle>
                        <CardDescription>
                            {preview ? "Live preview with your real monitoring data" : "Click \"Preview Report\" to see the email with real data"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {preview ? (
                            <iframe
                                srcDoc={preview}
                                className="w-full border-0 rounded-b-lg"
                                style={{ height: "700px" }}
                                title="Report Preview"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                                <Mail className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-sm">Your report preview will appear here</p>
                                <p className="text-xs opacity-60 mt-1">Rendered with real uptime & incident data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
