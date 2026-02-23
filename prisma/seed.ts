import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({
    url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: {
            email: "admin@example.com",
            name: "Admin User",
            password: hashedPassword,
            role: "ADMIN",
        },
    });

    console.log({ admin });

    const monitor = await prisma.monitor.upsert({
        where: { id: "demo-monitor" },
        update: {},
        create: {
            id: "demo-monitor",
            name: "Google",
            target: "https://google.com",
            type: "HTTP",
            userId: admin.id,
            status: "ONLINE",
        },
    });

    await prisma.statusPage.upsert({
        where: { slug: "main" },
        update: {},
        create: {
            slug: "main",
            title: "Main Systems Health",
            description: "Public monitoring for our core services.",
            userId: admin.id,
            monitors: {
                connect: { id: monitor.id },
            },
        },
    });

    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
