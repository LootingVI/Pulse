import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const windows = await prisma.maintenanceWindow.findMany({
        where: { userId: (session.user as any).id },
        include: {
            monitors: { select: { id: true, name: true } },
        },
        orderBy: { startTime: "asc" },
    });

    return NextResponse.json(windows);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description, startTime, endTime, monitorIds } = await req.json();

    if (!name || !startTime || !endTime) {
        return NextResponse.json({ error: "name, startTime, endTime are required" }, { status: 400 });
    }

    const window = await prisma.maintenanceWindow.create({
        data: {
            name,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            userId: (session.user as any).id,
            monitors: monitorIds?.length
                ? { connect: monitorIds.map((id: string) => ({ id })) }
                : undefined,
        },
        include: { monitors: { select: { id: true, name: true } } },
    });

    return NextResponse.json(window, { status: 201 });
}
