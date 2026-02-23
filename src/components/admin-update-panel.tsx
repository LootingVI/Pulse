"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Download, CheckCircle2, GitCommit, AlertCircle, Loader2, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpdateInfo {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    newCommits: { hash: string; message: string; date: string }[];
    error?: string;
}

interface UpdateStep {
    step: string;
    success: boolean;
    output?: string;
}

export function AdminUpdatePanel() {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSteps, setUpdateSteps] = useState<UpdateStep[] | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);

    const checkForUpdates = async (silent = false) => {
        setIsChecking(true);
        try {
            const res = await fetch("/api/admin/update");
            if (res.ok) {
                const data = await res.json();
                setUpdateInfo(data);
                if (!silent) {
                    if (data.updateAvailable) {
                        toast.info(`Update available! ${data.newCommits.length} new commit(s) found.`);
                    } else {
                        toast.success("Pulse is up to date!");
                    }
                }
            }
        } catch {
            if (!silent) toast.error("Failed to check for updates.");
        } finally {
            setIsChecking(false);
        }
    };

    const applyUpdate = async () => {
        setIsUpdating(true);
        setUpdateSteps(null);
        setUpdateSuccess(null);
        toast.info("Update started. This may take a few minutes...");

        try {
            const res = await fetch("/api/admin/update", { method: "POST" });
            const data = await res.json();
            setUpdateSteps(data.steps || []);
            setUpdateSuccess(data.success);

            if (data.success) {
                toast.success("Update applied! Restart the server to activate the new version.");
                // Re-check update status
                await checkForUpdates(true);
            } else {
                toast.error("Update failed. Check the step log below for details.");
            }
        } catch {
            toast.error("An unexpected error occurred during update.");
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        checkForUpdates(true);
        // Auto-check every 6 hours
        const interval = setInterval(() => checkForUpdates(true), 6 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className={cn(
            "border transition-colors",
            updateInfo?.updateAvailable
                ? "border-amber-500/50 bg-amber-500/5"
                : "border-border"
        )}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        updateInfo?.updateAvailable ? "bg-amber-500/10" : "bg-muted"
                    )}>
                        <PackageCheck className={cn(
                            "h-5 w-5",
                            updateInfo?.updateAvailable ? "text-amber-500" : "text-muted-foreground"
                        )} />
                    </div>
                    <div>
                        <CardTitle className="text-base">Pulse Update Manager</CardTitle>
                        <CardDescription className="text-sm mt-0.5">
                            {updateInfo
                                ? updateInfo.updateAvailable
                                    ? `${updateInfo.newCommits.length} new commit(s) available from GitHub`
                                    : "Pulse is up to date"
                                : "Checking for updates..."}
                        </CardDescription>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {updateInfo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                            <span>Local: <code className="bg-muted px-1 py-0.5 rounded">{updateInfo.currentVersion}</code></span>
                            {updateInfo.updateAvailable && (
                                <>
                                    <span>→</span>
                                    <span>Remote: <code className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">{updateInfo.latestVersion}</code></span>
                                </>
                            )}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkForUpdates(false)}
                        disabled={isChecking || isUpdating}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
                        Check
                    </Button>
                    {updateInfo?.updateAvailable && (
                        <Button
                            size="sm"
                            onClick={applyUpdate}
                            disabled={isUpdating}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isUpdating ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            {isUpdating ? "Updating..." : "Apply Update"}
                        </Button>
                    )}
                </div>
            </CardHeader>

            {/* New commits list */}
            {updateInfo?.updateAvailable && updateInfo.newCommits.length > 0 && !updateSteps && (
                <CardContent className="pt-0">
                    <div className="rounded-md border bg-muted/30 divide-y text-sm">
                        {updateInfo.newCommits.slice(0, 6).map((commit) => (
                            <div key={commit.hash} className="flex items-start gap-3 px-3 py-2">
                                <GitCommit className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-foreground truncate block">{commit.message}</span>
                                    <span className="text-xs text-muted-foreground">
                                        <code className="mr-2">{commit.hash}</code>
                                        {new Date(commit.date).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {updateInfo.newCommits.length > 6 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                +{updateInfo.newCommits.length - 6} more commits
                            </div>
                        )}
                    </div>
                </CardContent>
            )}

            {/* Update progress steps */}
            {updateSteps && (
                <CardContent className="pt-0">
                    <div className="rounded-md border bg-muted/30 divide-y text-sm">
                        {updateSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2">
                                {step.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                )}
                                <div>
                                    <span className={cn("font-mono font-medium", step.success ? "text-foreground" : "text-destructive")}>
                                        {step.step}
                                    </span>
                                    {step.output && (
                                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{step.output}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {updateSuccess !== null && (
                            <div className={cn(
                                "px-3 py-2 text-sm font-medium flex items-center gap-2",
                                updateSuccess ? "text-green-600 dark:text-green-400" : "text-destructive"
                            )}>
                                {updateSuccess
                                    ? <><CheckCircle2 className="h-4 w-4" /> Update complete! Please restart the server.</>
                                    : <><AlertCircle className="h-4 w-4" /> Update failed. See errors above.</>}
                            </div>
                        )}
                    </div>
                </CardContent>
            )}

            {/* Up to date state */}
            {updateInfo && !updateInfo.updateAvailable && !updateSteps && (
                <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Running the latest version of Pulse.</span>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
