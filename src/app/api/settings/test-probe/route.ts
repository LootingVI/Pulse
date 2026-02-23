import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/settings/test-probe
// Tests connectivity to a Cloudflare Edge Probe worker
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url, secret } = await req.json();

    if (!url || !secret) {
        return NextResponse.json({ error: "URL and secret are required" }, { status: 400 });
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${secret}`,
            },
            body: JSON.stringify({
                type: "HTTP",
                target: "https://cloudflare.com",
                timeout: 10,
            }),
            signal: AbortSignal.timeout(15_000),
        });

        if (res.ok) {
            const data = await res.json();
            return NextResponse.json({
                success: true,
                responseTime: data.responseTime,
                status: data.status,
            });
        } else if (res.status === 401) {
            return NextResponse.json({ error: "Wrong secret — probe returned Unauthorized" }, { status: 400 });
        } else {
            return NextResponse.json({ error: `Probe returned HTTP ${res.status}` }, { status: 400 });
        }
    } catch (err: any) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            return NextResponse.json({ error: "Probe did not respond within 15 seconds" }, { status: 408 });
        }
        return NextResponse.json({ error: `Could not reach probe: ${err.message}` }, { status: 400 });
    }
}
