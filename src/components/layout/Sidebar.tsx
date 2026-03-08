"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Activity,
    LayoutDashboard,
    Globe,
    Users,
    Bell,
    Settings,
    ShieldCheck,
    FolderTree,
    CalendarClock,
    BarChart2,
    Zap,
} from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Monitors", href: "/dashboard/monitors", icon: Activity },
    { name: "Status Pages", href: "/dashboard/status-pages", icon: Globe },
    { name: "Incidents", href: "/dashboard/incidents", icon: Bell },
    { name: "Infrastructure", href: "/dashboard/topology", icon: FolderTree },
    { name: "3D Nerve System", href: "/dashboard/3d-map", icon: Zap },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: CalendarClock },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart2, role: "ADMIN" },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Admin Panel", href: "/dashboard/admin", icon: ShieldCheck, role: "ADMIN" },
];

export default function Sidebar({ userRole }: { userRole?: string }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-card border-r w-64 fixed left-0 top-0 pt-16">
            <div className="flex-1 overflow-y-auto py-4 px-3">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        if (item.role && item.role !== userRole) return null;

                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "" : "text-muted-foreground")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
