// app/api/reports/[id]/route.ts
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prismaEdge } from "@/lib/prisma-edge";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const prisma = prismaEdge();

    // Purge expired (edge-safe approach: one delete, no logs)
    await prisma.report.deleteMany({ where: { expiresAt: { lte: new Date() } } });

    const report = await prisma.report.findUnique({
        where: { id },
        select: { id: true, markdown: true, createdAt: true, expiresAt: true },
    });

    if (!report) {
        return NextResponse.json({ error: "Report not found or expired." }, { status: 404 });
    }
    return NextResponse.json(report);
}
