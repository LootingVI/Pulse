import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// PATCH /api/incidents/[id] — update incident status
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;
    const data = await req.json();

    const existing = await prisma.incident.findFirst({
        where: { id, monitor: { userId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const incident = await prisma.incident.update({
        where: { id },
        data: {
            status: data.status,
            updates: data.message
                ? {
                    create: {
                        status: data.status,
                        message: data.message,
                    },
                }
                : undefined,
        },
    });

    return NextResponse.json(incident);
}
