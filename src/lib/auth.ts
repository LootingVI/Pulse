import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

// Simple in-memory rate limiter for login attempts 
// (Tracks failed attempts by email to prevent brute-force attacks)
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days (reduces risk of long-lived hijacked sessions)
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email.toLowerCase();

                // Rate limiting check
                const attempt = failedAttempts.get(email);
                if (attempt && attempt.lockUntil > Date.now()) {
                    throw new Error("Account locked due to too many failed attempts. Try again in 15 minutes.");
                }

                const user = await prisma.user.findUnique({
                    where: { email: email },
                });

                if (!user) {
                    // Register failure
                    const currentAttempt = failedAttempts.get(email) || { count: 0, lockUntil: 0 };
                    currentAttempt.count += 1;
                    if (currentAttempt.count >= MAX_ATTEMPTS) {
                        currentAttempt.lockUntil = Date.now() + LOCK_TIME_MS;
                    }
                    failedAttempts.set(email, currentAttempt);
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    // Register failure
                    const currentAttempt = failedAttempts.get(email) || { count: 0, lockUntil: 0 };
                    currentAttempt.count += 1;
                    if (currentAttempt.count >= MAX_ATTEMPTS) {
                        currentAttempt.lockUntil = Date.now() + LOCK_TIME_MS;
                    }
                    failedAttempts.set(email, currentAttempt);
                    return null;
                }

                // Reset failed attempts on success
                failedAttempts.delete(email);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};
