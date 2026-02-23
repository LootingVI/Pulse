"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid credentials.");
            } else {
                toast.success("Welcome back!");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
            {/* Animated Mesh Gradients Background (Premium Feel) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-500/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
                <div className="absolute top-[40%] right-[30%] w-[20vw] h-[20vw] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />
            </div>

            <Card className="w-full max-w-[420px] z-10 border-muted/30 shadow-2xl backdrop-blur-xl bg-card/60">
                <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                    <div className="relative group cursor-pointer" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                        <div className={cn(
                            "absolute inset-0 bg-primary/20 rounded-2xl blur-xl transition-all duration-500",
                            isHovered ? "opacity-100 scale-110" : "opacity-0 scale-90"
                        )} />
                        <div className="relative bg-[#0d0914] border border-primary/20 p-2 rounded-2xl shadow-inner shadow-primary/10">
                            <Image src="/pulse-logo.png" alt="Pulse Logo" width={48} height={48} className="rounded-xl object-contain transition-transform duration-500 group-hover:scale-110" />
                        </div>
                    </div>
                    <div className="text-center space-y-1.5">
                        <CardTitle className="text-3xl font-extrabold tracking-tight">Pulse</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            Mission Control for your Infrastructure.
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5 px-8">
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">Email address</label>
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
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">Password</label>
                                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Recover account</Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-6 pb-8 px-8">
                        <Button
                            className="w-full h-11 text-md font-medium group transition-all"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Secure Login
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                        <div className="text-center text-xs text-muted-foreground font-medium">
                            Protected by Pulse Enterprise Security.
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
