"use client";

import { Info, Zap, Settings2, BellRing, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SelfHealingTutorial() {
    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Pulse Self-Healing Tutorial
                </CardTitle>
                <CardDescription className="text-xs">
                    Automate downtime recovery with webhooks and logic.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
                <div className="space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold">1</span>
                        What is Self-Healing?
                    </p>
                    <p className="text-muted-foreground">
                        When a monitor fails, Pulse can automatically trigger a "Recovery Webhook"
                        to restart your server, clear cache, or notify a specific dev-ops endpoint.
                    </p>
                </div>

                <div className="space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold">2</span>
                        Workflow Example
                    </p>
                    <div className="rounded border bg-muted/50 p-2 font-mono text-[10px] space-y-1">
                        <p className="text-rose-500 font-bold">1. Monitor FAILS</p>
                        <p className="text-muted-foreground pl-2">↓ Wait 10 seconds</p>
                        <p className="text-blue-500 font-bold">2. Trigger Webhook</p>
                        <p className="text-muted-foreground pl-2">POST https://api.render.com/deploy/...</p>
                        <p className="text-emerald-500 font-bold">3. Service REANIMATES</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-primary">
                        <Info className="h-3 w-3" />
                        Pro Tip: Not Mandatory
                    </p>
                    <p className="text-muted-foreground italic">
                        This feature is disabled by default. You can use it ONLY for critical services
                        where a simple restart can solve 90% of issues.
                    </p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className="text-[10px] gap-1 bg-background">
                        <Terminal className="h-3 w-3" /> cURL Support
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1 bg-background">
                        <Settings2 className="h-3 w-3" /> Custom Body
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
