import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return success even if not found to prevent user enumeration
            return NextResponse.json({ success: true, message: "If an account exists, an email was sent." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        // Clear existing tokens for this user
        await prisma.passwordResetToken.deleteMany({ where: { email } });

        // Save new token
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt,
            },
        });

        // Generate absolute URL for reset link
        const baseUrl = process.env.NEXTAUTH_URL || req.headers.get("origin") || "http://localhost:3000";
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        await sendPasswordResetEmail(email, resetLink);

        return NextResponse.json({ success: true, message: "If an account exists, an email was sent." });
    } catch (error: any) {
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
