import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({
    url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Check if the database has already been seeded or if users exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
        // If there are already users, we silently skip the seed process
        // to prevent overwriting or re-creating demo data on every restart.
        console.log("Database is already initialized. Skipping seed.");
        return;
    }

    console.log("-----------------------------------------");
    console.log("🚀 Initializing Pulse Database for the first time...");
    console.log("-----------------------------------------");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.create({
        data: {
            email: "admin@example.com",
            name: "Admin User",
            password: hashedPassword,
            role: "ADMIN",
        },
    });

    const monitor = await prisma.monitor.create({
        data: {
            id: "demo-monitor",
            name: "Pulse Demo Monitor",
            target: "https://example.com",
            type: "HTTP",
            userId: admin.id,
            status: "ONLINE",
        },
    });

    await prisma.statusPage.create({
        data: {
            slug: "main",
            title: "Main Systems Health",
            description: "Public monitoring for our core services.",
            userId: admin.id,
            monitors: {
                connect: { id: monitor.id },
            },
        },
    });

    console.log("✅ Seed completed successfully!\n");
    console.log("┌───────────────────────────────────────────┐");
    console.log("│                                           │");
    console.log("│        🔑 PULSE ADMIN CREDENTIALS         │");
    console.log("│                                           │");
    console.log("│   Email:     admin@example.com            │");
    console.log("│   Password:  admin123                     │");
    console.log("│                                           │");
    console.log("└───────────────────────────────────────────┘");
    console.log("⚠️ Please log in and change these instantly.\n");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
