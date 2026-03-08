"use client";

import { useEffect, useState } from "react";
import { NerveSystem3D } from "@/components/NerveSystem3D";
import { Monitor } from "@/app/dashboard/monitors/page";
import { LoadingSpinner } from "../../../components/ui/loading-spinner";

export default function ThreeDMapPage() {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMonitors = async () => {
        try {
            const res = await fetch("/api/monitors");
            if (res.ok) {
                const data = await res.json();
                setMonitors(data);
            }
        } catch (err) {
            console.error("Failed to fetch monitors:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
        const interval = setInterval(fetchMonitors, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center space-y-4">
                    <LoadingSpinner className="h-12 w-12 text-blue-500 mx-auto" />
                    <p className="text-blue-400 font-medium animate-pulse uppercase tracking-widest text-xs">
                        Initalizing Nerve System Data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="no-scrollbar h-screen overflow-hidden">
            <NerveSystem3D monitors={monitors} />
        </div>
    );
}
