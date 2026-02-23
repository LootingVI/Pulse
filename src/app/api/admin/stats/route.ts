import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Force admin check for all admin routes
async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return null; // Signals unauthorized
    }
    return session;
}

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get system-wide stats
    const globalStats = await prisma.$transaction([
        prisma.user.count(),
        prisma.monitor.count(),
        prisma.monitor.count({ where: { status: "ONLINE" } }),
        prisma.monitor.count({ where: { status: "OFFLINE" } }),
        prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
        prisma.statusPage.count(),
    ]);

    // Get all users with their monitor counts
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { monitors: true, statusPages: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
        stats: {
            totalUsers: globalStats[0],
            totalMonitors: globalStats[1],
            onlineMonitors: globalStats[2],
            offlineMonitors: globalStats[3],
            activeIncidents: globalStats[4],
            totalStatusPages: globalStats[5],
        },
        users,
    });
}
