import { NextResponse } from "next/server";

/**
 * This route initializes the monitor scheduler when first called.
 * Next.js calls this on startup via the instrumentation hook below.
 */
let initialized = false;

export async function GET() {
    if (!initialized) {
        initialized = true;
        const { initScheduler } = await import("@/lib/scheduler");
        await initScheduler();
    }
    return NextResponse.json({ ok: true });
}