import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json({ error: "System is already initialized." }, { status: 400 });
        }

        const data = await req.json();

        if (!data.name || !data.email || !data.password) {
            return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const admin = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: "ADMIN",
            },
        });

        // Set the app URL setting based on the current origin if possible
        const host = req.headers.get("host");
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const appUrl = `${protocol}://${host}`;

        // Add a demo monitor and status page so the user isn't looking at an empty screen
        const monitor = await prisma.monitor.create({
            data: {
                id: "pulse-demo-monitor",
                name: "Demo API Check",
                target: appUrl + "/api/settings", // Target our own secure API so it runs fast
                type: "HTTP",
                userId: admin.id,
                status: "ONLINE",
            },
        });

        await prisma.statusPage.create({
            data: {
                slug: "main",
                title: "System Status",
                description: "Public monitoring for our core services.",
                userId: admin.id,
                monitors: { connect: { id: monitor.id } },
            },
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Setup error:", e);
        return NextResponse.json({ error: "Internal server error during setup." }, { status: 500 });
    }
}
