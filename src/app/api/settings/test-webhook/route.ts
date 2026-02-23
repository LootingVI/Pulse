import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendDiscordNotification } from "@/lib/notifications";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();

    if (!url) {
        return NextResponse.json({ error: "Webhook URL missing" }, { status: 400 });
    }

    try {
        await sendDiscordNotification(
            url,
            "✅ Test Notification",
            "Pulse Test",
            "ONLINE",
            120, // dummy ms
            undefined
        );
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to send payload to Discord" }, { status: 500 });
    }
}
