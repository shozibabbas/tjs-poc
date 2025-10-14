import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/agents/by-code?code=TJS-ISB-001
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim();

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
        where: { code },
        select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            // include office if you add it to schema; otherwise omit
        },
    });

    if (!agent) {
        return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json({ found: true, agent });
}
