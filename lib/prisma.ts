// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Avoid creating many clients during dev hot-reloads
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV === "development") globalForPrisma.prisma = prisma;

// TTL helper (48h)
export const REPORT_TTL_MS = 1000 * 60 * 60 * 48;

// Purge on-demand (called in API and creation)
export async function purgeExpiredReports() {
    await prisma.report.deleteMany({
        where: { expiresAt: { lte: new Date() } },
    });
}
