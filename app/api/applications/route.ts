import { NextResponse } from "next/server";
import {prismaEdge} from "@/lib/prisma-edge";
import {appUrl, getFromAddress, getResend} from "@/lib/email";
import {prisma} from "@/lib/prisma";
import {Prisma} from "@prisma/client";
import {cookies} from "next/headers";
import {verifySession} from "@/lib/auth";
import {x} from "tinyexec";

export const dynamic = "force-dynamic";

function parseEmgsProgressPercentage(value: string | null | undefined) {
    if (!value) return null;
    const numeric = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
}

// GET /api/applications?q=&agentId=&page=1&pageSize=10
export async function GET(req: Request) {
    const prisma = prismaEdge();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const agentId = (searchParams.get("agentId") || "").trim();
    const fetchAll = searchParams.get("all") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
    const skip = fetchAll ? undefined : (page - 1) * pageSize;
    const take = fetchAll ? undefined : pageSize;
    const token = (await cookies()).get("tjs_session")?.value;
    if(!token)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifySession(token);
    const role = session?.role;
    const username = session?.sub;

    const where: Prisma.ApplicationWhereInput = {};
    if (q) {
        where.OR = [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { university: { contains: q, mode: "insensitive" } },
            { program: { contains: q, mode: "insensitive" } },
            { passport: { contains: q, mode: "insensitive" } },
            { agentReferralCode: { contains: q, mode: "insensitive" } },
            { id: { contains: q } },
        ];
    }

    if (agentId) {
        if (!where.OR) where.OR = [];
        where.OR.push({
            agent: {
                OR: [
                    { id: agentId },
                ]
            }
        });
        where.OR.push({
            agentReferralCode: { contains: agentId, mode: "insensitive" }
        })
    }

    if(role === "agent") {
        where.agent = { username };
    }

    const allItems = await prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            agent: true,
            EMGSLink: {
                include: {
                    applicationUpdates: {
                        take: 1,
                        orderBy: {
                            createdAt: "desc"
                        }
                    }
                }
            }
        },
    });

    const filteredItems = allItems.filter((item) => {
        const progress = parseEmgsProgressPercentage(item.EMGSLink?.progressPercentage);
        return progress !== null && progress < 85;
    });

    const total = filteredItems.length;
    const items = fetchAll ? filteredItems : filteredItems.slice(skip ?? 0, (skip ?? 0) + (take ?? total));

    return NextResponse.json({
        page,
        pageSize: fetchAll ? total : pageSize,
        all: fetchAll,
        total,
        items: items.map((x) => ({
            id: x.id,
            createdAt: x.createdAt,
            firstName: x.firstName,
            lastName: x.lastName,
            passport: x.passport,
            nationality: x.nationality,
            visaCity: x.visaCity,
            country: x.country,
            university: x.university,
            program: x.program,
            intake: x.intake,
            agentApproval: x.agentApproval,
            agentReferralCode: x.agentReferralCode,
            agent: x.agent ? { id: x.agent.id, name: x.agent.name, code: x.agent.code } : null,
            EMGSLink: x.EMGSLink ? x.EMGSLink : null,
        })),
    });
}

// POST /api/applications
export async function POST(req: Request) {
    const data = await req.json();
    const token = (await cookies()).get("tjs_session")?.value;
    const session = token ? await verifySession(token) : null;
    const isSuperAdmin = session?.role === "superadmin";

    // Basic required fields
    const required = isSuperAdmin
        ? (["firstName", "lastName", "passport"] as const)
        : ([
            "firstName","lastName","passport",
            "nationality","visaCity","country",
            "university","program","intake",
            "agentReferralCode","username","password","email","phone"
        ] as const);

    for (const key of required) {
        if (!data[key] || String(data[key]).trim() === "") {
            return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
        }
    }

    try {
        const normalizedAgentReferralCode = String(data.agentReferralCode || "").trim();
        const agent = normalizedAgentReferralCode
            ? await prisma.agent.findUnique({
                where: { code: normalizedAgentReferralCode },
                select: { id: true, name: true, email: true, code: true },
            })
            : null;

        if (normalizedAgentReferralCode && !agent) {
            return NextResponse.json({ error: "Invalid agent username" }, { status: 400 });
        }

        const firstName = String(data.firstName || "").trim();
        const lastName = String(data.lastName || "").trim();
        const passport = String(data.passport || "").trim();
        const email = String(data.email || "").trim();
        const phone = String(data.phone || "").trim();
        const nationality = String(data.nationality || "").trim();
        const visaCity = String(data.visaCity || "").trim();
        const country = String(data.country || (isSuperAdmin ? "Malaysia" : "")).trim() || (isSuperAdmin ? "Malaysia" : "");
        const university = String(data.university || "").trim();
        const program = String(data.program || "").trim();
        const intake = String(data.intake || "").trim();
        const generatedUsernameBase = `${firstName || "student"}.${lastName || "applicant"}`
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "");
        const username = String(data.username || generatedUsernameBase || "student").trim();
        const password = String(data.password || Math.random().toString(36).slice(2, 14)).trim();

        // Create the application
        const created = await prisma.application.create({
            data: {
                firstName,
                lastName,
                passport,
                phone,
                email,
                nationality,
                visaCity,
                country,
                university,
                program,
                intake,
                agentReferralCode: normalizedAgentReferralCode,
                agentApproval: false,
                username,
                password,
                agentId: agent?.id ?? null,
            },
            select: {
                id: true, createdAt: true, email: true, phone: true,
                firstName: true, lastName: true, passport: true,
                nationality: true, visaCity: true, country: true,
                university: true, program: true, intake: true,
                agentReferralCode: true, agentId: true
            },
        });

        // Fire-and-forget email (doesn't block response if it fails)
        sendAgentApprovalEmailSafe(created, agent).catch((err) => {
            console.error("Resend email failed:", err);
        });
        sendApplicantReceiptEmailSafe(created).catch((err) => {
            console.error("Resend email to applicant failed:", err);
        });

        return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

/* -------------- Email helpers -------------- */

type CreatedApplication = {
    id: string;
    createdAt: Date;
    firstName: string;
    lastName: string;
    passport: string;
    email: string;
    phone: string;
    nationality: string;
    visaCity: string;
    country: string;
    university: string;
    program: string;
    intake: string;
    agentReferralCode: string;
    agentId: string | null;
};

type AgentLite = { id: string; name: string; email: string; code: string } | null;

async function sendAgentApprovalEmailSafe(app: CreatedApplication, agent: AgentLite) {
    const resend = getResend();
    if (!resend) return; // no key -> skip gracefully

    // If agent email not available, skip sending
    if (!agent?.email) {
        console.warn("No agent email found. Skipping email for application:", app.id);
        return;
    }

    const to = [agent.email];
    const from = getFromAddress();
    const subject = `Approval needed: ${app.firstName} ${app.lastName} — ${app.university} (${app.program})`;

    const approveUrl = appUrl(`/super-admin/applications?agentId=${encodeURIComponent(agent.id)}`);
    const portalUrl  = appUrl(`/agent/login`);

    const html = renderAgentEmailHtml({ app, agent, approveUrl, portalUrl });
    const text = renderAgentEmailText({ app, agent, approveUrl, portalUrl });

    await resend.emails.send({ from, to, subject, html, text });
}

function esc(str: string) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderAgentEmailHtml({
                                  app, agent, approveUrl, portalUrl
                              }: {
    app: CreatedApplication;
    agent: NonNullable<AgentLite>;
    approveUrl: string;
    portalUrl: string;
}) {
    const created = new Date(app.createdAt).toLocaleString();
    return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827">New Application Requires Approval</h2>
    <p style="margin:0 0 16px">Hello ${esc(agent.name)},</p>
    <p style="margin:0 0 16px">
      A student has submitted an application and is awaiting your approval to proceed.
    </p>

    <table style="border-collapse:collapse;width:100%;margin:8px 0 16px">
      <tbody>
        <tr><td style="padding:6px 0;color:#64748b;width:180px">Submitted</td><td style="padding:6px 0;color:#0f172a">${esc(created)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Applicant</td><td style="padding:6px 0;color:#0f172a">${esc(app.firstName)} ${esc(app.lastName)} (Passport: ${esc(app.passport)})</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Contact</td><td style="padding:6px 0;color:#0f172a">${esc(app.email)} • ${esc(app.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Nationality</td><td style="padding:6px 0;color:#0f172a">${esc(app.nationality)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Visa City</td><td style="padding:6px 0;color:#0f172a">${esc(app.visaCity)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Destination</td><td style="padding:6px 0;color:#0f172a">${esc(app.country)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">University</td><td style="padding:6px 0;color:#0f172a">${esc(app.university)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Program</td><td style="padding:6px 0;color:#0f172a">${esc(app.program)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Intake</td><td style="padding:6px 0;color:#0f172a">${esc(app.intake)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Agent Code</td><td style="padding:6px 0;color:#0f172a">${esc(agent.code)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Application ID</td><td style="padding:6px 0;color:#0f172a">${esc(app.id)}</td></tr>
      </tbody>
    </table>

    <p style="margin:16px 0">
      <a href="${approveUrl}" style="display:inline-block;background:#be123c;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:600">
        Review / Approve in Portal
      </a>
    </p>

    <p style="margin:12px 0;color:#334155;font-size:14px">
      You can also access the agent portal here: <a href="${portalUrl}" style="color:#be123c;text-decoration:underline">${portalUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <p style="margin:0;color:#64748b;font-size:12px">
      This email was sent by TJS StudySteps. Please do not reply to this automated message.
    </p>
  </div>
  `;
}

function renderAgentEmailText({
                                  app, agent, approveUrl, portalUrl
                              }: {
    app: CreatedApplication;
    agent: NonNullable<AgentLite>;
    approveUrl: string;
    portalUrl: string;
}) {
    const created = new Date(app.createdAt).toLocaleString();
    return [
        `New Application Requires Approval`,
        ``,
        `Hello ${agent.name},`,
        ``,
        `A student has submitted an application and is awaiting your approval.`,
        ``,
        `Submitted: ${created}`,
        `Applicant: ${app.firstName} ${app.lastName} (Passport: ${app.passport})`,
        `Contact: ${app.email} • ${app.phone}`,
        `Nationality: ${app.nationality}`,
        `Visa City: ${app.visaCity}`,
        `Destination: ${app.country}`,
        `University: ${app.university}`,
        `Program: ${app.program}`,
        `Intake: ${app.intake}`,
        `Agent Code: ${agent.code}`,
        `Application ID: ${app.id}`,
        ``,
        `Review / Approve in Portal: ${approveUrl}`,
        `Agent Portal: ${portalUrl}`,
        ``,
        `— TJS StudySteps`,
    ].join("\n");
}

async function sendApplicantReceiptEmailSafe(app: CreatedApplication) {
    const resend = getResend();
    if (!resend) return; // gracefully skip if no key or in preview

    // if student email is missing, skip
    if (!app.email) {
        console.warn("No applicant email; skipping applicant email for", app.id);
        return;
    }

    const to = [app.email];
    const from = getFromAddress();
    const subject = `We received your application — TJS StudySteps`;

    const portalInfoUrl = appUrl(`/`); // or a help/faq page if you have one
    const html = renderApplicantEmailHtml({ app, portalInfoUrl });
    const text = renderApplicantEmailText({ app, portalInfoUrl });

    await resend.emails.send({ from, to, subject, html, text });
}

function renderApplicantEmailHtml({
                                      app, portalInfoUrl
                                  }: {
    app: CreatedApplication;
    portalInfoUrl: string;
}) {
    const created = new Date(app.createdAt).toLocaleString();
    return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827">Thank you — we received your application</h2>
    <p style="margin:0 0 12px">Hi ${esc(app.firstName)},</p>
    <p style="margin:0 0 16px">
      Your application has been submitted. Your assigned agent will review and approve it shortly.
      Once approved, you’ll receive separate login credentials for your applicant portal.
    </p>

    <table style="border-collapse:collapse;width:100%;margin:8px 0 16px">
      <tbody>
        <tr><td style="padding:6px 0;color:#64748b;width:180px">Submitted</td><td style="padding:6px 0;color:#0f172a">${esc(created)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Application ID</td><td style="padding:6px 0;color:#0f172a">${esc(app.id)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">University</td><td style="padding:6px 0;color:#0f172a">${esc(app.university)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Program</td><td style="padding:6px 0;color:#0f172a">${esc(app.program)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Intake</td><td style="padding:6px 0;color:#0f172a">${esc(app.intake)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Destination</td><td style="padding:6px 0;color:#0f172a">${esc(app.country)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Visa City</td><td style="padding:6px 0;color:#0f172a">${esc(app.visaCity)}</td></tr>
      </tbody>
    </table>

    <p style="margin:0 0 12px">
      If any detail is incorrect, reply to this email or contact your counsellor to update it.
    </p>

    <p style="margin:12px 0;color:#334155;font-size:14px">
      Learn about next steps here: <a href="${portalInfoUrl}" style="color:#be123c;text-decoration:underline">${portalInfoUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <p style="margin:0;color:#64748b;font-size:12px">
      Prepared by TJS StudySteps. This is an automated email — please do not share your passport or sensitive data via email.
    </p>
  </div>
  `;
}

function renderApplicantEmailText({
                                      app, portalInfoUrl
                                  }: {
    app: CreatedApplication;
    portalInfoUrl: string;
}) {
    const created = new Date(app.createdAt).toLocaleString();
    return [
        `Thank you — we received your application`,
        ``,
        `Hi ${app.firstName},`,
        ``,
        `Your application has been submitted. Your assigned agent will review and approve it shortly.`,
        `Once approved, you’ll receive separate login credentials for your applicant portal.`,
        ``,
        `Submitted: ${created}`,
        `Application ID: ${app.id}`,
        `University: ${app.university}`,
        `Program: ${app.program}`,
        `Intake: ${app.intake}`,
        `Destination: ${app.country}`,
        `Visa City: ${app.visaCity}`,
        ``,
        `Learn about next steps: ${portalInfoUrl}`,
        ``,
        `— TJS StudySteps`,
    ].join("\n");
}
