/**
 * Next.js instrumentation hook — runs once when the server starts.
 * We use it to boot the monitor scheduler.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { initScheduler } = await import("./src/lib/scheduler");
        await initScheduler();
    }
}
