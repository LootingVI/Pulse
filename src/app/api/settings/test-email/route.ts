import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const to = session.user.email;

    try {
        const success = await sendEmail({
            to,
            subject: "Pulse - SMTP Configuration Test",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>✅ SMTP Test Successful</h2>
                    <p>Your Pulse Uptime Monitor SMTP configuration is working correctly!</p>
                </div>
            `,
        });

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Failed to send payload to SMTP Server." }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}
