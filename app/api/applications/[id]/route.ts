// app/api/applications/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/applications/:id
export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const app = await prisma.application.findUnique({
        where: { id },
        include: { agent: true },
    });

    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
        id: app.id,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        firstName: app.firstName,
        lastName: app.lastName,
        passport: app.passport,
        email: app.email,
        phone: app.phone,
        nationality: app.nationality,
        visaCity: app.visaCity,
        country: app.country,
        university: app.university,
        program: app.program,
        intake: app.intake,
        agentApproval: app.agentApproval,
        agentReferralCode: app.agentReferralCode,
        agent: app.agent
            ? { id: app.agent.id, name: app.agent.name, code: app.agent.code }
            : null,
    });
}

// PATCH /api/applications/:id
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const data = await req.json();

    // Optional fields allowed to update:
    const payload: any = {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        passport: data.passport?.trim(),
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        nationality: data.nationality?.trim(),
        visaCity: data.visaCity?.trim(),
        country: data.country?.trim(),
        university: data.university?.trim(),
        program: data.program?.trim(),
        intake: data.intake?.trim(),
        agentReferralCode: data.agentReferralCode?.trim(),
        agentApproval: typeof data.agentApproval === "boolean" ? data.agentApproval : undefined,
    };

    // Clean undefined keys so Prisma doesn't complain
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    // Agent resolution (optional):
    // - If client passed agentId, use it.
    // - Else if agentReferralCode is provided, try to resolve an Agent and set agentId.
    let agentIdToSet: string | null | undefined = undefined;

    if (data.agentId === null) {
        agentIdToSet = null; // explicitly unlink
    } else if (typeof data.agentId === "string") {
        agentIdToSet = data.agentId;
    } else if (typeof payload.agentReferralCode === "string" && payload.agentReferralCode.length > 0) {
        const agent = await prisma.agent.findUnique({
            where: { code: payload.agentReferralCode },
            select: { id: true },
        });
        agentIdToSet = agent ? agent.id : null; // null if not found
    }

    const updated = await prisma.application.update({
        where: { id },
        data: {
            ...payload,
            ...(agentIdToSet !== undefined ? { agentId: agentIdToSet } : {}),
        },
        include: { agent: true },
    });

    return NextResponse.json({
        id: updated.id,
        updatedAt: updated.updatedAt,
        agentApproval: updated.agentApproval,
        agent: updated.agent ? { id: updated.agent.id, name: updated.agent.name, code: updated.agent.code } : null,
    });
}
