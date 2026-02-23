"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSent(true);
                toast.success("Password recovery email sent.");
            } else {
                toast.error("An error occurred. Please try again.");
            }
        } catch (error) {
            toast.error("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full bg-purple-500/5 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <Card className="w-full max-w-[420px] z-10 border-muted/30 shadow-2xl backdrop-blur-xl bg-card/60">
                <CardHeader className="space-y-4 flex flex-col items-center pt-8">
                    <div className="relative bg-[#0d0914] border border-primary/20 p-2 rounded-2xl shadow-inner shadow-primary/10 mb-2">
                        <Image src="/pulse-logo.png" alt="Pulse Logo" width={48} height={48} className="rounded-xl object-contain" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight">Account Recovery</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            Enter your email to receive a password reset link.
                        </CardDescription>
                    </div>
                </CardHeader>

                {sent ? (
                    <CardContent className="px-8 flex flex-col items-center text-center space-y-4 pb-8">
                        <div className="bg-green-500/10 p-4 rounded-full text-green-500">
                            <Send className="h-8 w-8" />
                        </div>
                        <p className="text-sm text-muted-foreground w-full">
                            If an account exists for {email}, we have sent instructions to reset your password.
                        </p>
                        <Link href="/login" className="mt-4 w-full">
                            <Button variant="outline" className="w-full">Return to Login</Button>
                        </Link>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 px-8">
                            <div className="space-y-2.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">Email address</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your registered email"
                                    className="h-11 bg-background/50 focus-visible:ring-primary/50 transition-all border-muted/50"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4 pb-8 px-8">
                            <Button
                                className="w-full h-11 text-md font-medium"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : "Send Reset Link"}
                            </Button>
                            <Link href="/login" className="flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to login
                            </Link>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
