import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

        if (!resetToken) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        if (resetToken.expiresAt < new Date()) {
            await prisma.passwordResetToken.delete({ where: { token } });
            return NextResponse.json({ error: "Token has expired" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user
        await prisma.user.update({
            where: { email: resetToken.email },
            data: { password: hashedPassword },
        });

        // Clean up token
        await prisma.passwordResetToken.delete({ where: { token } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "An error occurred while resetting password." }, { status: 500 });
    }
}
