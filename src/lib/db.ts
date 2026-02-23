import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In Prisma 7, the Better-SQLite3 adapter can take the URL directly in some configurations
// or manage the connection itself.
const adapter = new PrismaBetterSqlite3({
    url: "file:./dev.db",
});

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
