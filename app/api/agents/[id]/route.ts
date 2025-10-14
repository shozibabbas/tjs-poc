import { NextResponse } from "next/server";
import {prismaEdge} from "@/lib/prisma-edge";

export const dynamic = "force-dynamic";

// GET /api/agents/:id
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const prisma = prismaEdge();
    const { id } = await ctx.params;
    const agent = await prisma.agent.findUnique({
        where: { id },
        include: { _count: { select: { applications: true } } },
    });
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
        id: agent.id,
        code: agent.code,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        username: agent.username,
        createdAt: agent.createdAt,
        applicationsCount: agent._count.applications,
    });
}

// PATCH /api/agents/:id
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const prisma = prismaEdge();
    const { id } = await ctx.params;
    const data = await req.json();

    // Whitelist editable fields
    const payload: any = {};
    for (const key of ["name", "email", "phone", "username", "password", "code"] as const) {
        if (data[key] !== undefined) payload[key] = data[key];
    }

    try {
        const agent = await prisma.agent.update({
            where: { id },
            data: payload,
            select: { id: true },
        });
        return NextResponse.json({ ok: true, id: agent.id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
