"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, ShieldCheck, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function SetupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            if (res.ok) {
                toast.success("Welcome to Pulse! Your account has been created.");
                router.push("/login");
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to initialize Pulse.");
            }
        } catch (error) {
            toast.error("An error occurred during setup.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
            {/* Animated Mesh Gradients */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-green-500/20 blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <Card className="w-full max-w-[480px] z-10 border-muted/30 shadow-2xl backdrop-blur-xl bg-card/60">
                <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl animate-pulse" />
                        <div className="relative bg-[#0d0914] border border-green-500/20 p-3 rounded-2xl shadow-inner shadow-green-500/10">
                            <HeartPulse className="w-10 h-10 text-green-500" />
                        </div>
                    </div>
                    <div className="text-center space-y-1.5">
                        <CardTitle className="text-3xl font-extrabold tracking-tight">Welcome to Pulse</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            Let&apos;s get your mission control initialized. Create your master admin account to start monitoring.
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5 px-8">
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="name">Your Name</label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Admin"
                                className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">Admin Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">Admin Password</label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-6 pb-8 px-8">
                        <Button
                            className="w-full h-11 text-md font-medium group transition-all bg-green-600 hover:bg-green-700 text-white"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Initialize System
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                        <div className="text-center text-xs text-muted-foreground font-medium">
                            This creates the root administrator account.
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
