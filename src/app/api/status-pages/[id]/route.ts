import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// PATCH /api/status-pages/[id]
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;
    const data = await req.json();

    const existing = await prisma.statusPage.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const page = await prisma.statusPage.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description ?? null,
            logo: data.logo ?? null,
            config: data.customButtons ? JSON.stringify(data.customButtons) : null,
            monitors: data.monitorIds !== undefined
                ? {
                    set: data.monitorIds.map((mid: string) => ({ id: mid })),
                }
                : undefined,
        },
    });

    return NextResponse.json(page);
}

// DELETE /api/status-pages/[id]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;

    const existing = await prisma.statusPage.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.statusPage.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
