// app/api/applications/[id]/view/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request, ctx: { params: Promise<{ id: string }> }
) {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const app = await prisma.application.findUnique({
        where: { id },
        include: {
            agent: { select: { id: true, name: true, code: true, email: true, phone: true } },
            EMGSLink: {
                include: {
                    applicationUpdates: { orderBy: { createdAt: "desc" } },
                    applicationIssues: { orderBy: { reportedAt: "desc" } },
                },
            },
        },
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
        agentReferralCode: app.agentReferralCode,
        agentApproval: app.agentApproval,
        agent: app.agent ? { id: app.agent.id, name: app.agent.name, code: app.agent.code, email: app.agent.email, phone: app.agent.phone } : null,
        emgs: app.EMGSLink
            ? {
                ...app.EMGSLink,
                applicationUpdates: app.EMGSLink.applicationUpdates.map(u => ({
                    id: u.id, status: u.status, remark: u.remark, createdAt: u.createdAt,
                })),
                applicationIssues: app.EMGSLink.applicationIssues.map(i => ({
                    id: i.id, issue: i.issue, status: i.status, comment: i.comment, reportedAt: i.reportedAt,
                })),
            }
            : null,
    });
}
