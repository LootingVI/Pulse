import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, description, startTime, endTime, monitorIds } = await req.json();

    const existing = await prisma.maintenanceWindow.findFirst({
        where: { id, userId: (session.user as any).id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.maintenanceWindow.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(startTime && { startTime: new Date(startTime) }),
            ...(endTime && { endTime: new Date(endTime) }),
            ...(monitorIds && {
                monitors: { set: monitorIds.map((mid: string) => ({ id: mid })) },
            }),
        },
        include: { monitors: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.maintenanceWindow.findFirst({
        where: { id, userId: (session.user as any).id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.maintenanceWindow.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
