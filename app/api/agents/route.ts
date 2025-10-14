// app/api/agents/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {Prisma} from "@prisma/client";
import bcrypt from "bcryptjs";
import {appUrl, getFromAddress, getResend} from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/agents?q=&page=&pageSize=  (keep your current GET here)

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
    const skip = (page - 1) * pageSize;

    const where = q
        ? {
            OR: [
                { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { code: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { id: { contains: q } },
                { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
        }
        : undefined;

    const [total, items] = await Promise.all([
        prisma.agent.count({ where }),
        prisma.agent.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { applications: true } } },
        }),
    ]);

    return NextResponse.json({
        page,
        pageSize,
        total,
        items: items.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            email: a.email,
            phone: a.phone,
            createdAt: a.createdAt,
            applicationsCount: a._count.applications,
        })),
    });
}

// POST /api/agents
export async function POST(req: Request) {
    const data = await req.json();
    const required = ["code", "name", "email", "username", "password"] as const;
    for (const key of required) {
        if (!data[key] || String(data[key]).trim() === "") {
            return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const agent = await prisma.agent.create({
            data: {
                code: String(data.code).trim(),
                name: String(data.name).trim(),
                email: String(data.email).trim(),
                phone: data.phone ? String(data.phone).trim() : null,
                username: String(data.username).trim(),
                password: hashedPassword,
            },
            select: { id: true, code: true, /* we need email & name to mail */ },
        });

        // Fire-and-forget welcome email to the agent
        sendNewAgentWelcomeEmailSafe({
            toEmail: String(data.email).trim(),
            agentName: String(data.name).trim(),
            agentCode: String(data.code).trim(),
            username: String(data.username).trim(),
            plainPassword: String(data.password), // You just received this; OK to email now if you want.
        }).catch((err) => console.error("Agent welcome email failed:", err));

        return NextResponse.json({ ok: true, id: agent.id, code: agent.code }, { status: 201 });
    } catch (e: any) {
        if (e?.code === "P2002" && Array.isArray(e.meta?.target)) {
            return NextResponse.json(
                { error: `Duplicate entry for: ${e.meta.target.join(", ")}` },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: e?.message || "Failed to create agent" }, { status: 500 });
    }
}

async function sendNewAgentWelcomeEmailSafe(input: {
    toEmail: string;
    agentName: string;
    agentCode: string;
    username: string;
    plainPassword: string; // temporary/initial password
}) {
    const resend = getResend();
    if (!resend) {
        console.warn("RESEND_API_KEY not set — skipping agent welcome email.");
        return;
    }

    const from = getFromAddress();
    const subject = `Welcome to TJS Agent Portal`;

    const loginUrl = appUrl("/agent/login");
    const html = renderAgentWelcomeHtml({ ...input, loginUrl });
    const text = renderAgentWelcomeText({ ...input, loginUrl });

    await resend.emails.send({
        from,
        to: [input.toEmail],
        subject,
        html,
        text,
    });
}

function esc(str: string) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderAgentWelcomeHtml({
                                    agentName,
                                    agentCode,
                                    username,
                                    plainPassword,
                                    loginUrl,
                                }: {
    agentName: string;
    agentCode: string;
    username: string;
    plainPassword: string;
    loginUrl: string;
}) {
    return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827">Welcome to the TJS Agent Portal</h2>
    <p style="margin:0 0 16px">Hello ${esc(agentName)},</p>
    <p style="margin:0 0 16px">
      Your agent account has been created. Use the credentials below to sign in and start managing your applicants.
    </p>

    <table style="border-collapse:collapse;width:100%;margin:8px 0 16px">
      <tbody>
        <tr><td style="padding:6px 0;color:#64748b;width:180px">Agent Code</td><td style="padding:6px 0;color:#0f172a">${esc(agentCode)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Username</td><td style="padding:6px 0;color:#0f172a">${esc(username)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Temporary Password</td><td style="padding:6px 0;color:#0f172a">${esc(plainPassword)}</td></tr>
      </tbody>
    </table>

    <p style="margin:16px 0">
      <a href="${loginUrl}" style="display:inline-block;background:#be123c;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:600">
        Go to Agent Login
      </a>
    </p>

    <p style="margin:12px 0;color:#334155;font-size:14px">
      For security, please sign in and change your password immediately.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <p style="margin:0;color:#64748b;font-size:12px">
      This email was sent by TJS StudySteps.
    </p>
  </div>
  `;
}

function renderAgentWelcomeText({
                                    agentName,
                                    agentCode,
                                    username,
                                    plainPassword,
                                    loginUrl,
                                }: {
    agentName: string;
    agentCode: string;
    username: string;
    plainPassword: string;
    loginUrl: string;
}) {
    return [
        `Welcome to the TJS Agent Portal`,
        ``,
        `Hello ${agentName},`,
        ``,
        `Your agent account has been created. Use the credentials below to sign in:`,
        `Agent Code: ${agentCode}`,
        `Username: ${username}`,
        `Password: ${plainPassword}`,
        ``,
        `Login: ${loginUrl}`,
        ``,
        `For security, please sign in and change your password immediately.`,
        ``,
        `— TJS StudySteps`,
    ].join("\n");
}
