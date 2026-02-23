"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Key } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!token) {
        return (
            <div className="text-center space-y-4 p-4 text-destructive">
                <p>Invalid or missing reset token.</p>
                <Link href="/forgot-password"><Button variant="outline">Request New Link</Button></Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirm) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            if (res.ok) {
                toast.success("Password successfully changed! You can now log in.");
                router.push("/login");
            } else {
                const data = await res.json();
                toast.error(data.error || "An error occurred.");
            }
        } catch {
            toast.error("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-8">
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Password</label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>
            </CardContent>
            <CardFooter className="pb-8 px-8">
                <Button className="w-full h-11 text-md font-medium" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Change Password"}
                </Button>
            </CardFooter>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full bg-purple-500/5 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <Card className="w-full max-w-[420px] z-10 border-muted/30 shadow-2xl backdrop-blur-xl bg-card/60">
                <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                    <div className="relative bg-[#0d0914] border border-primary/20 p-2 rounded-2xl shadow-inner shadow-primary/10 mb-2">
                        <Key className="h-8 w-8 text-white object-contain p-1" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight">Secure Reset</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            Create a new, strong password.
                        </CardDescription>
                    </div>
                </CardHeader>
                <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </Card>
        </div>
    );
}
