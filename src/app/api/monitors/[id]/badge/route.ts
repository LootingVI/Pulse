import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const monitor = await prisma.monitor.findUnique({
        where: { id },
        include: {
            results: { take: 100, orderBy: { timestamp: "desc" } }
        }
    });

    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const total = monitor.results.length;
    const up = monitor.results.filter(r => r.status === "ONLINE").length;
    const uptime = total > 0 ? ((up / total) * 100).toFixed(1) : "100.0";

    let color = "#10B981"; // green
    if (parseFloat(uptime) < 99) color = "#F59E0B"; // yellow
    if (parseFloat(uptime) < 95) color = "#EF4444"; // red
    if (monitor.status === "OFFLINE") color = "#EF4444"; // red

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20" role="img" aria-label="uptime: ${uptime}%">
    <title>uptime: ${uptime}%</title>
    <linearGradient id="s" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r">
        <rect width="120" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#r)">
        <rect width="55" height="20" fill="#555"/>
        <rect x="55" width="65" height="20" fill="${color}"/>
        <rect width="120" height="20" fill="url(#s)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
        <text aria-hidden="true" x="285" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="450">uptime</text>
        <text x="285" y="140" transform="scale(.1)" fill="#fff" textLength="450">uptime</text>
        <text aria-hidden="true" x="865" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="550">${uptime}%</text>
        <text x="865" y="140" transform="scale(.1)" fill="#fff" textLength="550">${uptime}%</text>
    </g>
</svg>
    `.trim();

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=60"
        }
    });
}
