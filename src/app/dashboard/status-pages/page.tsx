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
    Pencil,
    Image,
    Link2,
    X,
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

interface CustomButton {
    label: string;
    url: string;
    color?: string;
}

interface StatusPage {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    logo: string | null;
    config: string | null;
    monitors: { id: string; name: string; status: string }[];
    createdAt: string;
}

interface Monitor {
    id: string;
    name: string;
    status: string;
}

const defaultForm = {
    slug: "",
    title: "",
    description: "",
    logo: "",
    monitorIds: [] as string[],
    customButtons: [] as CustomButton[],
};

export default function StatusPagesPage() {
    const [pages, setPages] = useState<StatusPage[]>([]);
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<StatusPage | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...defaultForm });
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

    const openCreate = () => {
        setEditingPage(null);
        setForm({ ...defaultForm });
        setIsDialogOpen(true);
    };

    const openEdit = (page: StatusPage) => {
        setEditingPage(page);
        let buttons: CustomButton[] = [];
        try { buttons = page.config ? JSON.parse(page.config) : []; } catch { }
        setForm({
            slug: page.slug,
            title: page.title,
            description: page.description || "",
            logo: page.logo || "",
            monitorIds: page.monitors.map((m) => m.id),
            customButtons: buttons,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                slug: form.slug,
                title: form.title,
                description: form.description,
                logo: form.logo || null,
                monitorIds: form.monitorIds,
                customButtons: form.customButtons.filter((b) => b.label && b.url),
            };

            const res = editingPage
                ? await fetch(`/api/status-pages/${editingPage.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                : await fetch("/api/status-pages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

            if (res.ok) {
                toast.success(editingPage ? "Status page updated!" : "Status page created!");
                setIsDialogOpen(false);
                setForm({ ...defaultForm });
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save page");
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
        setForm((prev) => ({
            ...prev,
            monitorIds: prev.monitorIds.includes(id)
                ? prev.monitorIds.filter((m) => m !== id)
                : [...prev.monitorIds, id],
        }));
    };

    const addButton = () => {
        setForm((prev) => ({
            ...prev,
            customButtons: [...prev.customButtons, { label: "", url: "", color: "#3b82f6" }],
        }));
    };

    const updateButton = (idx: number, field: keyof CustomButton, value: string) => {
        setForm((prev) => {
            const buttons = [...prev.customButtons];
            buttons[idx] = { ...buttons[idx], [field]: value };
            return { ...prev, customButtons: buttons };
        });
    };

    const removeButton = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            customButtons: prev.customButtons.filter((_, i) => i !== idx),
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
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> New Page
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingPage ? "Edit Status Page" : "Create Status Page"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Page Title</label>
                                    <Input
                                        placeholder="My System Status"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL Slug</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">/status/</span>
                                        <Input
                                            placeholder="my-service"
                                            value={form.slug}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                                                })
                                            }
                                            disabled={!!editingPage}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description (optional)</label>
                                <Input
                                    placeholder="Current status of our services"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            {/* Branding */}
                            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    Branding
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Logo / Image URL
                                    </label>
                                    <Input
                                        placeholder="https://yourdomain.com/logo.png"
                                        value={form.logo}
                                        onChange={(e) => setForm({ ...form, logo: e.target.value })}
                                    />
                                    {form.logo && (
                                        <div className="flex items-center gap-3 p-2 bg-background rounded border">
                                            <img
                                                src={form.logo}
                                                alt="Logo preview"
                                                className="h-10 w-10 object-contain rounded"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                            />
                                            <span className="text-xs text-muted-foreground">Preview</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Buttons */}
                            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Link2 className="h-4 w-4" />
                                        Custom Buttons
                                    </h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addButton}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Button
                                    </Button>
                                </div>
                                {form.customButtons.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                        No custom buttons yet. Add links to docs, support, or any external page.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {form.customButtons.map((btn, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Label"
                                                    value={btn.label}
                                                    onChange={(e) => updateButton(idx, "label", e.target.value)}
                                                    className="w-32 text-xs h-8"
                                                />
                                                <Input
                                                    placeholder="https://..."
                                                    value={btn.url}
                                                    onChange={(e) => updateButton(idx, "url", e.target.value)}
                                                    className="flex-1 text-xs h-8"
                                                />
                                                <input
                                                    type="color"
                                                    value={btn.color || "#3b82f6"}
                                                    onChange={(e) => updateButton(idx, "color", e.target.value)}
                                                    title="Button color"
                                                    className="h-8 w-10 rounded border cursor-pointer"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive"
                                                    onClick={() => removeButton(idx)}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Monitors */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monitors to include</label>
                                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                    {monitors.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-3">No monitors yet.</p>
                                    ) : (
                                        monitors.map((m) => (
                                            <label
                                                key={m.id}
                                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.monitorIds.includes(m.id)}
                                                    onChange={() => toggleMonitor(m.id)}
                                                    className="rounded"
                                                />
                                                <span className="text-sm flex-1">{m.name}</span>
                                                <span
                                                    className={`text-xs font-medium ${m.status === "ONLINE" ? "text-green-500" : "text-red-500"}`}
                                                >
                                                    {m.status}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                {editingPage ? "Save Changes" : "Create Status Page"}
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
                        <p className="text-muted-foreground">No status pages yet. Create your first one!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {pages.map((page) => {
                        const allOk = page.monitors.every((m) => m.status === "ONLINE");
                        let buttons: CustomButton[] = [];
                        try { buttons = page.config ? JSON.parse(page.config) : []; } catch { }

                        return (
                            <Card key={page.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            {page.logo && (
                                                <img
                                                    src={page.logo}
                                                    alt="logo"
                                                    className="h-8 w-8 rounded object-contain shrink-0"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                            )}
                                            <div>
                                                <CardTitle className="text-base">{page.title}</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-1">/status/{page.slug}</p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={allOk ? "default" : "destructive"}
                                            className={allOk ? "bg-green-500 shrink-0" : "shrink-0"}
                                        >
                                            {allOk ? "All OK" : "Issues"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {page.description && (
                                        <p className="text-sm text-muted-foreground">{page.description}</p>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {page.monitors.length} monitor{page.monitors.length !== 1 ? "s" : ""}:{" "}
                                        {page.monitors.map((m) => m.name).join(", ") || "none"}
                                    </div>
                                    {buttons.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {buttons.map((btn, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                                                    style={{ borderColor: btn.color, color: btn.color }}
                                                >
                                                    {btn.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => copyLink(page.slug, page.id)}
                                        >
                                            {copiedId === page.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                            Copy Link
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            asChild
                                        >
                                            <a href={`/status/${page.slug}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3 mr-1" /> Open
                                            </a>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEdit(page)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
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
