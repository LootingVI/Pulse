import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET all incidents for the logged-in user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;

    const incidents = await prisma.incident.findMany({
        where: { monitor: { userId } },
        include: {
            monitor: { select: { id: true, name: true, target: true } },
            updates: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(incidents);
}
