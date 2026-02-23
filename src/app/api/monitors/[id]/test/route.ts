import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { performCheck } from "@/lib/monitor";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = (session.user as any).id;

    const monitor = await prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        const result = await performCheck(
            monitor.type,
            monitor.target,
            monitor.port,
            monitor.timeout,
            monitor.keyword
        );
        return NextResponse.json({
            success: true,
            status: result.status,
            responseTime: result.responseTime,
            message: result.message
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
