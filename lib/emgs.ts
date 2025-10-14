// app/api/applications/[id]/emgs/fetch/route.ts
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";
import lookup from "country-code-lookup";
import { getResend, getFromAddress, appUrl } from "@/lib/email";

export const dynamic = "force-dynamic";
// ensure Node runtime (NOT edge) because we parse HTML & manage cookies manually
export const runtime = "nodejs";

const ORIGIN = "https://visa.educationmalaysia.gov.my";
const SEARCH_FORM = `${ORIGIN}/emgs/application/searchForm`;
const SEARCH_POST = `${ORIGIN}/emgs/application/searchPost/`;

export async function fetchAndUpsertEMGS(id: string) {
    if (!id) return { error: "Missing id" };

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return { error: "Application not found" };

    if (application.country.toLowerCase() !== "malaysia") {
        return { error: "EMGS applies to Malaysia only." };
    }

    // Snapshot previous EMGS, updates, and issues for diffing later
    const prevEmgs = await prisma.eMGSLink.findUnique({
        where: { applicationId: application.id },
        include: {
            applicationUpdates: true,
            applicationIssues: true,
        },
    });

    // Map nationality -> ISO2 (e.g., Pakistan -> PK). Try common variants.
    const iso2 = resolveIso2(application.nationality);
    if (!iso2) {
        return { error: `Could not resolve ISO-2 code for nationality: ${application.nationality}` };
    }

    try {
        // 1) Load searchForm, extract form_key and set-cookie
        const formRes = await fetch(SEARCH_FORM, {
            method: "GET",
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "upgrade-insecure-requests": "1",
            },
        });

        const setCookie = mergeSetCookie(formRes.headers.getSetCookie?.() || []);
        const formHtml = await formRes.text();
        const $ = cheerio.load(formHtml);
        const formKey = $('input[name="form_key"]').attr("value") || "";

        if (!formKey) {
            return { error: "Unable to extract form_key from EMGS search form." };
        }

        // 2) POST the search with form_key + passport + nationality
        const body = new URLSearchParams({
            form_key: formKey,
            travel_doc_no: application.passport, // passport from Application
            nationality: iso2,                   // ISO-2 code
            agreement: "1",
        }).toString();

        const postRes = await fetch(SEARCH_POST, {
            method: "POST",
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "content-type": "application/x-www-form-urlencoded",
                "upgrade-insecure-requests": "1",
                "referer": SEARCH_FORM,
                // forward any cookies we got from the form page
                ...(setCookie ? { "cookie": setCookie } : {}),
            },
            body,
        });

        const postHtml = await postRes.text();
        const $$ = cheerio.load(postHtml);

        // 3) Extract first h2 and first p under #accordion1
        const h2Text = $$("#accordion1 h2").first().text().trim();
        const pText = $$("#accordion1 p").first().text().trim();

        if (!h2Text && !pText) {
            // Nothing found; keep or create empty EMGS row with a helpful remark
            const emgs = await prisma.eMGSLink.upsert({
                where: { applicationId: application.id },
                create: {
                    applicationId: application.id,
                    progressPercentage: "0",
                    progressRemark: "No EMGS result found for the provided passport/nationality.",
                },
                update: {
                    progressPercentage: "0",
                    progressRemark: "No EMGS result found for the provided passport/nationality.",
                },
            });

            return {
                ok: true,
                emgsId: emgs.id,
                progressPercentage: emgs.progressPercentage,
                progressRemark: emgs.progressRemark,
                source: "fallback",
            };
        }

        const progressPercentage = extractPercent(h2Text); // keep digits only if present
        const progressRemark = pText || h2Text || "—";

        // Parse updates table rows
        const tableUpdates: { dateStr: string; status: string; remark: string }[] = [];
        $$("#accordion .application-history #form-table > tbody > tr").each((_, el) => {
            const tds = $$(el).find("td");
            const dateStr = $$(tds[0]).text().trim();   // e.g., "06/10/2025"
            const status  = $$(tds[1]).text().trim();   // e.g., "Application completed"
            const remark  = $$(tds[2]).text().trim();   // e.g., "Your application with EMGS is complete."
            if (dateStr && status) {
                const existing = tableUpdates.find(u => (u.dateStr === dateStr && u.status === status) || (u.status === status && u.remark === remark));
                if (existing) {
                    if (remark && existing.remark !== remark) {
                        existing.remark = remark; // update to latest non-empty remark
                    }
                } else
                    tableUpdates.push({ dateStr, status, remark });
            }
        });

        // -------- Extract issues from #my-issues-table (handles rowspan groups) --------
        const issuesPayload: { issue: string; status: string; comment: string; dateStr: string }[] = [];

// Find each "master" group via td[id^="master-issueN"]
        $$("#accordion3 .application-issues #my-issues-table tbody td[id^='master-issue']").each((_, masterTd) => {
            const idAttr = $$(masterTd).attr("id") || "";       // e.g., "master-issue1"
            const n = (idAttr.match(/master-issue(\d+)/) || [])[1];
            if (!n) return;

            const masterTr = $$(masterTd).closest("tr");
            const tds = masterTr.find("td");

            // In master row: [0]=No., [1]=Issue (rowspan), [2]=Status, [3]=Comment, [4]=Updated At
            const issueText = normalizeHtmlText($$(tds[1]).html() || $$(tds[1]).text());
            const status0   = normalizeHtmlText($$(tds[2]).text());
            const comment0  = normalizeHtmlText($$(tds[3]).html() || $$(tds[3]).text());
            const date0     = normalizeHtmlText($$(tds[4]).text());

            if (issueText && status0 && date0) {
                issuesPayload.push({ issue: issueText, status: status0, comment: comment0, dateStr: date0 });
            }

            // Hidden detail rows carry classes like .issues1 (status/comment/date in that order)
            let next = masterTr.next();
            while (next && next.length) {
                const clsSel = `.issues${n}`;
                // if the row doesn't contain any of the .issuesN cells, we've reached next group
                if (next.find(clsSel).length === 0) break;

                const cells = next.find(clsSel);
                // order: [0]=Status, [1]=Comment, [2]=Updated At
                const status = normalizeHtmlText($$(cells[0]).text());
                const comment = normalizeHtmlText($$(cells[1]).html() || $$(cells[1]).text());
                const dateStr = normalizeHtmlText($$(cells[2]).text());
                if (issueText && status && dateStr) {
                    issuesPayload.push({ issue: issueText, status, comment, dateStr });
                }
                next = next.next();
            }
        });

        // 4) Upsert EMGSLink in Prisma
        const emgs = await prisma.eMGSLink.upsert({
            where: { applicationId: application.id },
            create: {
                applicationId: application.id,
                progressPercentage,
                progressRemark,
            },
            update: {
                progressPercentage,
                progressRemark,
            },
        });

        // Save updates without duplicates
        for (const u of tableUpdates) {
            const when = parseEmgsDate(u.dateStr); // normalized UTC midnight

            // If you added the @@unique, use upsert against the composite key:
            try {
                await prisma.applicationUpdate.upsert({
                    where: { emgs_update_unique: { emgsLinkId: emgs.id, createdAt: when, status: u.status } },
                    create: { emgsLinkId: emgs.id, createdAt: when, status: u.status, remark: u.remark || null },
                    update: { remark: u.remark || null }, // update remark if changed
                });
            } catch {
                // If you didn't add the unique constraint yet, fall back to find+create:
                const exists = await prisma.applicationUpdate.findFirst({
                    where: { emgsLinkId: emgs.id, status: u.status, createdAt: when },
                    select: { id: true },
                });
                if (!exists) {
                    await prisma.applicationUpdate.create({
                        data: { emgsLinkId: emgs.id, createdAt: when, status: u.status, remark: u.remark || null },
                    });
                }
            }
        }

        // -------- Upsert issues (dedupe by emgsLinkId + issue + reportedAt) --------
        for (const it of issuesPayload) {
            const reportedAt = parseEmgsDate(it.dateStr); // reuse your DD/MM/YYYY -> Date.UTC helper

            // If you added the @@unique constraint, use upsert:
            try {
                await prisma.applicationIssue.upsert({
                    where: { emgs_issue_unique: { emgsLinkId: emgs.id, issue: it.issue, reportedAt } },
                    create: {
                        emgsLinkId: emgs.id,
                        issue: it.issue,
                        status: it.status,
                        comment: it.comment || null,
                        reportedAt,
                    },
                    // If the same (issue, date) exists, we **update** status/comment to reflect changes (e.g., Open -> Closed)
                    update: {
                        status: it.status,
                        comment: it.comment || null,
                    },
                });
            } catch {
                // Fallback if you didn't migrate yet: findFirst -> create or update
                const existing = await prisma.applicationIssue.findFirst({
                    where: { emgsLinkId: emgs.id, issue: it.issue, reportedAt },
                    select: { id: true, status: true },
                });
                if (!existing) {
                    await prisma.applicationIssue.create({
                        data: {
                            emgsLinkId: emgs.id,
                            issue: it.issue,
                            status: it.status,
                            comment: it.comment || null,
                            reportedAt,
                        },
                    });
                } else {
                    await prisma.applicationIssue.update({
                        where: { id: existing.id },
                        data: { status: it.status, comment: it.comment || null },
                    });
                }
            }
        }

        // Re-load fresh snapshot for diffing
        const nextEmgs = await prisma.eMGSLink.findUnique({
            where: { applicationId: application.id },
            include: {
                applicationUpdates: true,
                applicationIssues: true,
            },
        });

// Build a diff between prevEmgs and nextEmgs
        const diff = buildEmgsDiff(prevEmgs, nextEmgs);

// If there are changes, email both applicant & agent
        if (diff.hasChanges) {
            const agent =
                application.agentId
                    ? await prisma.agent.findUnique({ where: { id: application.agentId } })
                    : await prisma.agent.findUnique({ where: { code: application.agentReferralCode } });

            const to = [application.email, agent?.email].filter(Boolean) as string[];
            const resend = getResend();
            if (resend && to.length) {
                const from = getFromAddress();
                const subject = `EMGS update for ${application.firstName} ${application.lastName} — ${application.university}`;

                const viewUrl = appUrl(`/`);
                const html = renderEmgsDiffHtml({ application, diff, viewUrl });
                const text = renderEmgsDiffText({ application, diff, viewUrl });

                // fire-and-forget (don’t block response)
                resend.emails
                    .send({ from, to, subject, html, text })
                    .catch((e) => console.error("EMGS diff email failed:", e));
            }
        }

        return {
            ok: true,
            emgsId: emgs.id,
            progressPercentage,
            progressRemark,
            source: "emgs",
        };
    } catch (err: any) {
        console.error("EMGS fetch error:", err);
        return { error: "Failed to fetch EMGS data." };
    }
}

/* ---------------- helpers ---------------- */

function normalizeHtmlText(input: string) {
    // convert <br> to newline, strip tags, decode &nbsp;, trim
    const s = input
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, "") // strip any remaining tags
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n")
        .replace(/\s{2,}/g, " ")
        .trim();
    return s;
}

function parseEmgsDate(dmy: string): Date {
    // Expecting DD/MM/YYYY
    const [dd, mm, yyyy] = dmy.split("/").map(s => parseInt(s, 10));
    // Normalize to UTC midnight so equality checks are stable
    return new Date(Date.UTC(yyyy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0));
}

// Merge Set-Cookie array → a single cookie header string.
// Node fetch doesn’t automatically hold a cookie jar, so we forward it ourselves.
function mergeSetCookie(list: string[]) {
    if (!list?.length) return "";
    // minimal: keep only cookie pairs (before ';')
    const pairs = list.map(c => String(c).split(";")[0]).filter(Boolean);
    return pairs.join("; ");
}

// Extract numeric percentage from possible strings like "42%", "Progress: 42%" -> "42"
function extractPercent(input: string) {
    const m = input.match(/(\d{1,3})\s*%?/);
    if (!m) return "0";
    const n = Math.max(0, Math.min(100, parseInt(m[1], 10)));
    return String(n);
}

// Try a few strategies to resolve ISO2 code for nationality text
function resolveIso2(nationality: string): string | null {
    const n = String(nationality || "").trim();
    if (!n) return null;

    // Direct country name e.g., "Pakistan"
    let hit = lookup.byCountry(n);
    if (hit?.iso2) return hit.iso2;

    // Some users may pass already "PK" or "PAK"
    hit = lookup.byIso(n.toUpperCase());
    if (hit?.iso2) return hit.iso2;

    // Known quick aliases (extend as needed)
    const alias: Record<string, string> = {
        "pakistan": "PK",
        "malaysia": "MY",
        "bangladesh": "BD",
        "india": "IN",
    };
    const k = n.toLowerCase();
    if (alias[k]) return alias[k];

    return null;
}

function isoMidnight(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function keyUpdate(u: { createdAt: Date; status: string }) {
    return `${isoMidnight(u.createdAt).toISOString()}|${u.status}`;
}

function keyIssue(i: { reportedAt: Date; issue: string }) {
    return `${i.issue}|${isoMidnight(i.reportedAt).toISOString()}`;
}

function buildEmgsDiff(
    prev: any,
    next: any
) {
    const changes: {
        progress?: { from?: string; to?: string } | null;
        remark?: { from?: string; to?: string } | null;
        updatesAdded: { date: string; status: string; remark?: string | null }[];
        updatesChanged: { date: string; status: string; remarkFrom?: string | null; remarkTo?: string | null }[];
        issuesAdded: { issue: string; status: string; comment?: string | null; date: string }[];
        issuesChanged: { issue: string; date: string; statusFrom?: string; statusTo?: string; commentFrom?: string | null; commentTo?: string | null }[];
    } = {
        updatesAdded: [],
        updatesChanged: [],
        issuesAdded: [],
        issuesChanged: [],
    };

    if (!next) return { hasChanges: false, ...changes };

    // Progress % and remark changes
    if (!prev || prev.progressPercentage !== next.progressPercentage) {
        changes.progress = { from: prev?.progressPercentage, to: next.progressPercentage };
    }
    if (!prev || (prev.progressRemark || "") !== (next.progressRemark || "")) {
        changes.remark = { from: prev?.progressRemark || null, to: next.progressRemark || null };
    }

    // ApplicationUpdates diff
    const prevUpdates = new Map(
        (prev?.applicationUpdates || []).map((u: { createdAt: Date; status: string; }) => [keyUpdate(u), u])
    );
    const nextUpdates = new Map(next.applicationUpdates.map((u: { createdAt: Date; status: string; }) => [keyUpdate(u), u])) as any;

    // Added updates
    for (const [k, u] of nextUpdates) {
        if (!prevUpdates.has(k)) {
            changes.updatesAdded.push({
                date: isoMidnight(u.createdAt).toISOString().slice(0, 10),
                status: u.status,
                remark: u.remark || null,
            });
        }
    }
    // Changed updates (same key, different remark)
    for (const [k, uNew] of nextUpdates) {
        const uOld = prevUpdates.get(k) as any;
        if (uOld && (uOld.remark || "") !== (uNew.remark || "")) {
            changes.updatesChanged.push({
                date: isoMidnight(uNew.createdAt).toISOString().slice(0, 10),
                status: uNew.status,
                remarkFrom: uOld.remark || null,
                remarkTo: uNew.remark || null,
            });
        }
    }

    // ApplicationIssues diff
    const prevIssues = new Map(
        (prev?.applicationIssues || []).map((i: { reportedAt: Date; issue: string; }) => [keyIssue(i), i])
    );
    const nextIssues = new Map(next.applicationIssues.map((i: { reportedAt: Date; issue: string; }) => [keyIssue(i), i])) as any;

    // Added issues
    for (const [k, i] of nextIssues) {
        if (!prevIssues.has(k)) {
            changes.issuesAdded.push({
                issue: i.issue,
                status: i.status,
                comment: i.comment || null,
                date: isoMidnight(i.reportedAt).toISOString().slice(0, 10),
            });
        }
    }
    // Changed issues (same key, different status/comment)
    for (const [k, iNew] of nextIssues) {
        const iOld = prevIssues.get(k) as any;
        if (iOld && ((iOld.status || "") !== (iNew.status || "") || (iOld.comment || "") !== (iNew.comment || ""))) {
            changes.issuesChanged.push({
                issue: iNew.issue,
                date: isoMidnight(iNew.reportedAt).toISOString().slice(0, 10),
                statusFrom: iOld.status,
                statusTo: iNew.status,
                commentFrom: iOld.comment || null,
                commentTo: iNew.comment || null,
            });
        }
    }

    const hasChanges =
        !!changes.progress ||
        !!changes.remark ||
        changes.updatesAdded.length > 0 ||
        changes.updatesChanged.length > 0 ||
        changes.issuesAdded.length > 0 ||
        changes.issuesChanged.length > 0;

    return { hasChanges, ...changes };
}

// ---------- Email renderers ----------
function esc(s?: string | null) {
    return String(s ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderEmgsDiffHtml({
                                application,
                                diff,
                                viewUrl,
                            }: {
    application: any;
    diff: ReturnType<typeof buildEmgsDiff>;
    viewUrl: string;
}) {
    const sections: string[] = [];

    if (diff.progress) {
        sections.push(`
      <h3 style="margin:16px 0 6px">Progress</h3>
      <p><strong>${esc(diff.progress.to)}</strong>${diff.progress.from ? ` (was ${esc(diff.progress.from)})` : ""}</p>
    `);
    }
    if (diff.remark) {
        sections.push(`
      <h3 style="margin:16px 0 6px">Remark</h3>
      <p>${esc(diff.remark.to) || "—"}</p>
    `);
    }

    if (diff.updatesAdded.length) {
        sections.push(`
      <h3 style="margin:16px 0 6px">New Timeline Updates</h3>
      <ul>
        ${diff.updatesAdded.map(u => `<li><strong>${esc(u.date)}</strong> — ${esc(u.status)}${u.remark ? ` — ${esc(u.remark)}` : ""}</li>`).join("")}
      </ul>
    `);
    }
    if (diff.updatesChanged.length) {
        sections.push(`
      <h3 style="margin:16px 0 6px">Updated Timeline Remarks</h3>
      <ul>
        ${diff.updatesChanged.map(u => `<li><strong>${esc(u.date)}</strong> — ${esc(u.status)}<br><em>${esc(u.remarkFrom) || "—"}</em> → <em>${esc(u.remarkTo) || "—"}</em></li>`).join("")}
      </ul>
    `);
    }

    if (diff.issuesAdded.length) {
        sections.push(`
      <h3 style="margin:16px 0 6px">New Issues</h3>
      <ul>
        ${diff.issuesAdded.map(i => `<li><strong>${esc(i.issue)}</strong> — ${esc(i.status)} — ${esc(i.date)}${i.comment ? `<br>${esc(i.comment)}` : ""}</li>`).join("")}
      </ul>
    `);
    }
    if (diff.issuesChanged.length) {
        sections.push(`
      <h3 style="margin:16px 0 6px">Issue Updates</h3>
      <ul>
        ${diff.issuesChanged.map(i => `<li><strong>${esc(i.issue)}</strong> — ${esc(i.date)}<br>Status: ${esc(i.statusFrom)} → ${esc(i.statusTo)}${(i.commentFrom||i.commentTo) ? `<br>Comment: ${esc(i.commentFrom)||"—"} → ${esc(i.commentTo)||"—"}` : ""}</li>`).join("")}
      </ul>
    `);
    }

    return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827">EMGS Update Summary</h2>
    <p style="margin:0 0 8px">
      Applicant: <strong>${esc(application.firstName)} ${esc(application.lastName)}</strong><br/>
      University: ${esc(application.university)}<br/>
      Program: ${esc(application.program)}
    </p>
    ${sections.join("") || "<p>No changes detected.</p>"}
    <p style="margin-top:16px">
      <a href="${viewUrl}" style="display:inline-block;background:#be123c;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:600">View in Portal</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <p style="margin:0;color:#64748b;font-size:12px">This is an automated notification from TJS StudySteps.</p>
  </div>`;
}

function renderEmgsDiffText({
                                application,
                                diff,
                                viewUrl,
                            }: {
    application: any;
    diff: ReturnType<typeof buildEmgsDiff>;
    viewUrl: string;
}) {
    const lines: string[] = [];
    lines.push(`EMGS Update Summary`);
    lines.push(`Applicant: ${application.firstName} ${application.lastName}`);
    lines.push(`University: ${application.university}`);
    lines.push(`Program: ${application.program}`);
    lines.push(``);

    if (diff.progress) lines.push(`Progress: ${diff.progress.to}${diff.progress.from ? ` (was ${diff.progress.from})` : ""}`);
    if (diff.remark) lines.push(`Remark: ${diff.remark.to || "—"}`);
    if (diff.updatesAdded.length) {
        lines.push(``);
        lines.push(`New Timeline Updates:`);
        diff.updatesAdded.forEach(u => lines.push(`- ${u.date} — ${u.status}${u.remark ? ` — ${u.remark}` : ""}`));
    }
    if (diff.updatesChanged.length) {
        lines.push(``);
        lines.push(`Updated Timeline Remarks:`);
        diff.updatesChanged.forEach(u => lines.push(`- ${u.date} — ${u.status} | ${u.remarkFrom || "—"} → ${u.remarkTo || "—"}`));
    }
    if (diff.issuesAdded.length) {
        lines.push(``);
        lines.push(`New Issues:`);
        diff.issuesAdded.forEach(i => lines.push(`- ${i.issue} — ${i.status} — ${i.date}${i.comment ? ` | ${i.comment}` : ""}`));
    }
    if (diff.issuesChanged.length) {
        lines.push(``);
        lines.push(`Issue Updates:`);
        diff.issuesChanged.forEach(i => {
            lines.push(`- ${i.issue} — ${i.date}`);
            lines.push(`  Status: ${i.statusFrom} → ${i.statusTo}`);
            if (i.commentFrom || i.commentTo) lines.push(`  Comment: ${i.commentFrom || "—"} → ${i.commentTo || "—"}`);
        });
    }

    lines.push(``);
    lines.push(`View in Portal: ${viewUrl}`);
    lines.push(``);
    lines.push(`— TJS StudySteps`);
    return lines.join("\n");
}
