"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Activity, Globe, HeartPulse, Search, Settings, ShieldAlert, Users } from "lucide-react";

export function CommandMenu() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const [monitors, setMonitors] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Fetch monitors when menu opens for the first time
    useEffect(() => {
        if (open && monitors.length === 0) {
            fetch("/api/monitors").then(r => r.json()).then(data => {
                if (Array.isArray(data)) {
                    setMonitors(data.map(m => ({ id: m.id, name: m.name })));
                }
            }).catch(() => { });
        }
    }, [open, monitors.length]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search monitors..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Navigation">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <HeartPulse className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/monitors"))}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Monitors...</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/incidents"))}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        <span>Incidents</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/status-pages"))}>
                        <Globe className="mr-2 h-4 w-4" />
                        <span>Status Pages</span>
                    </CommandItem>
                </CommandGroup>

                {monitors.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Monitors">
                            {monitors.map((m) => (
                                <CommandItem key={m.id} onSelect={() => runCommand(() => router.push(`/dashboard/monitors/${m.id}`))}>
                                    <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>{m.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                <CommandSeparator />
                <CommandGroup heading="Administration">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Users</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
