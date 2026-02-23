"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Globe,
    Plus,
    Trash2,
    ExternalLink,
    Copy,
    Check,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/confirm-modal";

interface StatusPage {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    monitors: { id: string; name: string; status: string }[];
    createdAt: string;
}

interface Monitor {
    id: string;
    name: string;
    status: string;
}

export default function StatusPagesPage() {
    const [pages, setPages] = useState<StatusPage[]>([]);
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [newPage, setNewPage] = useState({
        slug: "",
        title: "",
        description: "",
        monitorIds: [] as string[],
    });
    const [pageToDelete, setPageToDelete] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [pagesRes, monitorsRes] = await Promise.all([
                fetch("/api/status-pages"),
                fetch("/api/monitors"),
            ]);
            setPages(await pagesRes.json());
            setMonitors(await monitorsRes.json());
        } catch {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/status-pages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPage),
            });
            if (res.ok) {
                toast.success("Status page created!");
                setIsDialogOpen(false);
                setNewPage({ slug: "", title: "", description: "", monitorIds: [] });
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create page");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    const confirmDelete = async () => {
        if (!pageToDelete) return;
        try {
            const res = await fetch(`/api/status-pages/${pageToDelete}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Page deleted");
                fetchData();
            } else {
                toast.error("Failed to delete page");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setPageToDelete(null);
        }
    };

    const copyLink = (slug: string, id: string) => {
        const url = `${window.location.origin}/status/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Link copied!");
    };

    const toggleMonitor = (id: string) => {
        setNewPage((prev) => ({
            ...prev,
            monitorIds: prev.monitorIds.includes(id)
                ? prev.monitorIds.filter((m) => m !== id)
                : [...prev.monitorIds, id],
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Status Pages</h1>
                    <p className="text-muted-foreground">
                        Share public status pages with your users.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Page
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Status Page</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Page Title</label>
                                <Input
                                    placeholder="My System Status"
                                    value={newPage.title}
                                    onChange={(e) =>
                                        setNewPage({ ...newPage, title: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">URL Slug</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        /status/
                                    </span>
                                    <Input
                                        placeholder="my-service"
                                        value={newPage.slug}
                                        onChange={(e) =>
                                            setNewPage({
                                                ...newPage,
                                                slug: e.target.value
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9-]/g, "-"),
                                            })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Description (optional)
                                </label>
                                <Input
                                    placeholder="Current status of our services"
                                    value={newPage.description}
                                    onChange={(e) =>
                                        setNewPage({ ...newPage, description: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monitors to include</label>
                                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                    {monitors.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-3">
                                            No monitors yet.
                                        </p>
                                    ) : (
                                        monitors.map((m) => (
                                            <label
                                                key={m.id}
                                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={newPage.monitorIds.includes(m.id)}
                                                    onChange={() => toggleMonitor(m.id)}
                                                    className="rounded"
                                                />
                                                <span className="text-sm flex-1">{m.name}</span>
                                                <span
                                                    className={`text-xs font-medium ${m.status === "ONLINE"
                                                        ? "text-green-500"
                                                        : "text-red-500"
                                                        }`}
                                                >
                                                    {m.status}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Create Status Page
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : pages.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <Globe className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            No status pages yet. Create your first one!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {pages.map((page) => {
                        const allOk = page.monitors.every((m) => m.status === "ONLINE");
                        return (
                            <Card key={page.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-base">{page.title}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                /status/{page.slug}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={allOk ? "default" : "destructive"}
                                            className={allOk ? "bg-green-500" : ""}
                                        >
                                            {allOk ? "All OK" : "Issues"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {page.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {page.description}
                                        </p>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {page.monitors.length} monitor
                                        {page.monitors.length !== 1 ? "s" : ""}:{" "}
                                        {page.monitors.map((m) => m.name).join(", ") || "none"}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => copyLink(page.slug, page.id)}
                                        >
                                            {copiedId === page.id ? (
                                                <Check className="h-3 w-3 mr-1" />
                                            ) : (
                                                <Copy className="h-3 w-3 mr-1" />
                                            )}
                                            Copy Link
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            asChild
                                        >
                                            <a
                                                href={`/status/${page.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                Open
                                            </a>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setPageToDelete(page.id)}
                                        >
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
                isOpen={!!pageToDelete}
                onClose={() => setPageToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Status Page"
                description="Are you sure you want to delete this status page? This action cannot be undone."
            />
        </div>
    );
}
