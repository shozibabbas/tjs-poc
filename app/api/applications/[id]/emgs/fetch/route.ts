// app/api/applications/[id]/emgs/fetch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as cheerio from "cheerio";
import lookup from "country-code-lookup";

export const dynamic = "force-dynamic";
// ensure Node runtime (NOT edge) because we parse HTML & manage cookies manually
export const runtime = "nodejs";

const ORIGIN = "https://visa.educationmalaysia.gov.my";
const SEARCH_FORM = `${ORIGIN}/emgs/application/searchForm`;
const SEARCH_POST = `${ORIGIN}/emgs/application/searchPost/`;

export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (application.country.toLowerCase() !== "malaysia") {
        return NextResponse.json({ error: "EMGS applies to Malaysia only." }, { status: 400 });
    }

    // Map nationality -> ISO2 (e.g., Pakistan -> PK). Try common variants.
    const iso2 = resolveIso2(application.nationality);
    if (!iso2) {
        return NextResponse.json({ error: `Could not resolve ISO-2 code for nationality: ${application.nationality}` }, { status: 400 });
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
            return NextResponse.json({ error: "Unable to extract form_key from EMGS search form." }, { status: 502 });
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

            return NextResponse.json({
                ok: true,
                emgsId: emgs.id,
                progressPercentage: emgs.progressPercentage,
                progressRemark: emgs.progressRemark,
                source: "fallback",
            });
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

        return NextResponse.json({
            ok: true,
            emgsId: emgs.id,
            progressPercentage,
            progressRemark,
            source: "emgs",
        });
    } catch (err: any) {
        console.error("EMGS fetch error:", err);
        return NextResponse.json({ error: "Failed to fetch EMGS data." }, { status: 502 });
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
