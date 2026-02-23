"use client";

import { Code } from "lucide-react";
import { toast } from "sonner";

export function CopyBadgeButton({ monitorId }: { monitorId: string }) {
    const copyBadge = () => {
        const url = `${window.location.origin}/api/monitors/${monitorId}/badge`;
        const code = `[![Pulse Status](${url})](${window.location.origin})`;
        navigator.clipboard.writeText(code);
        toast.success("Markdown badge code copied to clipboard!");
    };

    return (
        <button
            onClick={copyBadge}
            title="Copy Markdown Badge"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
            <Code className="h-4 w-4" />
        </button>
    );
}
