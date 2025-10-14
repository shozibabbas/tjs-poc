import {appUrl, getFromAddress, getResend} from "@/lib/email";
import {NextResponse} from "next/server";


export async function GET(req: Request) {
    sendAgentApprovalEmailSafe({
        id: "app_123456",
        createdAt: new Date(),
        firstName: "John",
        lastName: "Doe",
        passport: "X1234567",
        nationality: "Countryland",
        visaCity: "Cityville",
        country: "Utopia",
        university: "University of Examples",
        program: "Computer Science",
        intake: "Fall 2024",
        agentReferralCode: "AGENT001",
        agentId: "agent_123456",
    }, {
        id: "agent_123456",
        name: "Agent Smith",
        email: "shozibabbas@gmail.com",
        code: "AGENT001",
    }).catch((err) => {
        console.error("Resend email failed:", err);
    });


    return NextResponse.json({
        status: "sent"
    });
}

type CreatedApplication = {
    id: string;
    createdAt: Date;
    firstName: string;
    lastName: string;
    passport: string;
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
