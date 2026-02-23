"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Server, AlertTriangle, ShieldCheck, Activity, Globe, Trash2, ArrowRightLeft, UserCog, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { ConfirmModal } from "@/components/confirm-modal";


interface AdminData {
    stats: {
        totalUsers: number;
        totalMonitors: number;
        onlineMonitors: number;
        offlineMonitors: number;
        activeIncidents: number;
        totalStatusPages: number;
    };
    users: {
        id: string;
        name: string | null;
        email: string;
        role: "ADMIN" | "USER";
        createdAt: string;
        _count: { monitors: number; statusPages: number };
    }[];
}

export default function AdminDashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<AdminData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [modalUser, setModalUser] = useState<{ id?: string, name: string, email: string, password?: string, role: "ADMIN" | "USER" }>({ name: "", email: "", password: "", role: "USER" });
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string, email: string } | null>(null);

    const fetchAdminData = async () => {
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                setData(await res.json());
            } else {
                toast.error("Not authorized or failed to fetch data");
            }
        } catch {
            toast.error("An error occurred loading admin overview");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if ((session?.user as any)?.role === "ADMIN") {
            fetchAdminData();
        }
    }, [session]);

    const handleRoleChange = async (userId: string, newRole: "ADMIN" | "USER") => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                toast.success(`User role updated to ${newRole}`);
                fetchAdminData();
            } else {
                toast.error(await res.text());
            }
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingUser(true);
        try {
            const isEditing = !!modalUser.id;
            const url = isEditing ? `/api/admin/users/${modalUser.id}` : "/api/admin/users";
            const method = isEditing ? "PATCH" : "POST";

            const payload: any = {
                name: modalUser.name,
                email: modalUser.email,
                role: modalUser.role,
            };
            if (modalUser.password) {
                payload.password = modalUser.password;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(`User ${isEditing ? "updated" : "created"} successfully`);
                setIsUserModalOpen(false);
                fetchAdminData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save user");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsSavingUser(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("User deleted completely.");
                fetchAdminData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete user");
            }
        } catch {
            toast.error("Failed to delete user");
        } finally {
            setUserToDelete(null);
        }
    };

    if (isLoading) {
        return <div className="text-muted-foreground p-10">Loading Admin Dashboard...</div>;
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <ShieldCheck className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground">You do not have administrative privileges to view this page.</p>
            </div>
        );
    }

    const { stats, users } = data;
    const currentUserId = (session?.user as any)?.id;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Control Panel</h1>
                <p className="text-muted-foreground">Manage the platform, users, and overall system health.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Registered accounts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Monitors</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMonitors}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.onlineMonitors} UP, <span className="text-destructive font-medium">{stats.offlineMonitors} DOWN</span>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeIncidents}</div>
                        <p className="text-xs text-muted-foreground">Total unresolved incidents</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status Pages</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStatusPages}</div>
                        <p className="text-xs text-muted-foreground">Public-facing endpoints</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>View and manage all registered accounts on the platform</CardDescription>
                    </div>
                    <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setModalUser({ name: "", email: "", password: "", role: "USER" })}>
                                <Plus className="mr-2 h-4 w-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{modalUser.id ? "Edit User" : "Create New User"}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSaveUser} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input
                                        value={modalUser.name}
                                        onChange={(e) => setModalUser({ ...modalUser, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        type="email"
                                        value={modalUser.email}
                                        onChange={(e) => setModalUser({ ...modalUser, email: e.target.value })}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {modalUser.id ? "Password (leave blank to keep current)" : "Password"}
                                    </label>
                                    <Input
                                        type="password"
                                        value={modalUser.password || ""}
                                        onChange={(e) => setModalUser({ ...modalUser, password: e.target.value })}
                                        placeholder="••••••••"
                                        required={!modalUser.id}
                                        minLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSavingUser}>
                                    {isSavingUser ? "Saving..." : "Save User"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-center">Monitors</TableHead>
                                <TableHead className="text-center">Status Pages</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Admin Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => {
                                const isSelf = u.id === currentUserId;
                                return (
                                    <TableRow key={u.id} className={isSelf ? "bg-muted/30" : ""}>
                                        <TableCell>
                                            <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className={u.role === "ADMIN" ? "bg-primary" : ""}>
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {u.email} {isSelf && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                                        </TableCell>
                                        <TableCell>{u.name || "—"}</TableCell>
                                        <TableCell className="text-center">{u._count.monitors}</TableCell>
                                        <TableCell className="text-center">{u._count.statusPages}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setModalUser({
                                                        id: u.id,
                                                        name: u.name || "",
                                                        email: u.email,
                                                        role: u.role,
                                                        password: ""
                                                    });
                                                    setIsUserModalOpen(true);
                                                }}
                                            >
                                                <UserCog className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRoleChange(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
                                                disabled={isSelf}
                                            >
                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                Toggle Role
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={isSelf}
                                                onClick={() => setUserToDelete({ id: u.id, email: u.email })}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={confirmDeleteUser}
                title="Delete User"
                description={`CAREFUL! This will PERMANENTLY delete user ${userToDelete?.email} and ALL their monitors, status pages, and incidents! Continue?`}
            />
        </div>
    );
}
