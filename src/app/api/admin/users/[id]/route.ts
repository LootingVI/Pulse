import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") return false;
    return true;
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: any = {};

    if (body.role) {
        if (!["USER", "ADMIN"].includes(body.role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        data.role = body.role;
    }

    if (body.name !== undefined) data.name = body.name;
    if (body.email) data.email = body.email;

    // We need to import bcrypt if password is provided
    if (body.password) {
        const bcrypt = require("bcrypt");
        data.password = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
        where: { id },
        data,
    });

    return NextResponse.json(user);
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const session = await getServerSession(authOptions);
    if ((session?.user as any).id === id) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
