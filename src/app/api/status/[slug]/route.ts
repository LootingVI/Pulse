import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    const statusPage = await prisma.statusPage.findUnique({
        where: { slug },
        include: {
            monitors: {
                include: {
                    incidents: {
                        where: { status: { not: "RESOLVED" } },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!statusPage) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(statusPage);
}
