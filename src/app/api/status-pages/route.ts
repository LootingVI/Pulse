import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET all status pages for the logged-in user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;

    const pages = await prisma.statusPage.findMany({
        where: { userId },
        include: {
            monitors: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pages);
}

// POST create a new status page
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const data = await req.json();

    // Validate slug uniqueness
    const existing = await prisma.statusPage.findUnique({ where: { slug: data.slug } });
    if (existing) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 400 });
    }

    try {
        const page = await prisma.statusPage.create({
            data: {
                slug: data.slug,
                title: data.title,
                description: data.description || null,
                logo: data.logo || null,
                config: data.customButtons ? JSON.stringify(data.customButtons) : null,
                userId,
                monitors: data.monitorIds?.length
                    ? { connect: data.monitorIds.map((id: string) => ({ id })) }
                    : undefined,
            },
        });

        return NextResponse.json(page);
    } catch (error) {
        console.error("Failed to create status page:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
