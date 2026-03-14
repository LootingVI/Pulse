import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        // Test database connectivity
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 503 });
    }
}
