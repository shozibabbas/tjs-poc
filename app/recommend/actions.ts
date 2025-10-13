"use server";
import OpenAI from "openai";
import {prisma, purgeExpiredReports, REPORT_TTL_MS} from "@/lib/prisma";
import {toDataUrlFromBlobUrl} from "@/lib/fetchInline";

export type ActionState = { ok: boolean; message: string; id?: string };

async function buildVisionInputs(blobUrls: string[]) {
    const results = await Promise.all(blobUrls.map((u) => toDataUrlFromBlobUrl(u)));

    // Convert into Responses API content items
    const mediaParts: any[] = [];
    for (const r of results) {
        if (r.type === "image" && r.dataUrl) {
            mediaParts.push({ type: "input_image", image_url: r.dataUrl });
        } else if (r.type === "pdf" && r.url) {
            // If you want to inline PDF pages too, we can do that later; for now keep URL with ?download=1
            mediaParts.push({ type: "input_image", image_url: r.url });
        }
    }
    return mediaParts;
}

async function askOpenAI({
                             prefs,
                             mediaParts,
                         }: {
    prefs: Record<string, any>;
    mediaParts: any[]; // from buildVisionInputs
}) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const content: any[] = [
        {
            type: "input_text",
            text:
                "ROLE: You are the world's best student counselling expert for Malaysian universities.\n" +
                "TASK: Read the ATTACHED MARKSHEETS (images/PDFs). Extract subject-wise scores, grades, board, years, attempts; " +
                "combine with the student's preferences below. Produce a polished, human-readable COUNSELLING REPORT in GitHub-flavored Markdown.\n\n" +
                "STRICT FORMATTING RULES:\n" +
                "• Use clear paragraphs with blank lines between them. No code blocks.\n" +
                "• Use H1–H3 headings, bullet lists, numbered lists, and tables where helpful.\n" +
                "• Keep sections short but meaningful; avoid walls of text.\n" +
                "• Use callouts (blockquotes) sparingly for important notes.\n" +
                "• Include horizontal rules (---) to separate major sections.\n" +
                "• Prefer concise bullets for recommendations; use tables for Top 5 summary.\n\n" +
                "REPORT OUTLINE (must follow, but feel free to improve wording):\n" +
                "# TJS StudySteps — Personalized Programme & University Report\n\n" +
                "a detail on who is it prepared for\n" +
                "## Purpose & How To Use This Report\n" +
                "Explain in 2–4 short paragraphs WHY this report exists: to map the student's actual marks + preferences to a realistic, " +
                "high-fit set of Bachelor programmes in Malaysia and top universities, to guide next steps (not a guarantee of admission).\n\n" +
                "## Snapshot Summary (Key Takeaways)\n" +
                "• 3–6 bullets: core strengths, likely programme direction, estimated budget band, next intake window, any quick flags.\n\n" +
                "## Strengths from Mark Sheets\n" +
                "Summarize subject-wise performance as bullets or a small table (Subject | Observed Mark/Grade | Comment).\n\n" +
                "## Top 5 Best-Fit Options (Programme → Universities)\n" +
                "For each of the 5 options, provide:\n" +
                "### Programme Name\n" +
                "- Why this fits (2–5 bullets)\n" +
                "- Suggested universities (3–5) with brief one-liners\n" +
                "- Entry expectations (typical requirements)\n" +
                "- Estimated annual tuition band (MYR)\n" +
                "- Next intake month(s)\n\n" +
                "Also include a compact table at the end of this section summarizing the five options (Programme | 3–5 Universities | Fit Notes | Tuition Band | Next Intake).\n\n" +
                "## City & Lifestyle Fit\n" +
                "Map the student's preference (KL, Penang, Johor, Any) with 3–5 concise bullets.\n\n" +
                "## Scholarships & English Pathways\n" +
                "Brief pointers (IELTS or accepted alternatives), scholarship tips, merit possibilities.\n\n" +
                "## What’s Missing / Assumptions\n" +
                "Bullet what would improve accuracy (e.g., unclear grades, budget range, subject details).\n\n" +
                "## Action Plan (Next 2–4 Weeks)\n" +
                "Numbered steps: verify scores, shortlist 2–3 programmes, prepare documents, apply, schedule counselling call.\n\n" +
                "---\n" +
                "_Prepared by **TJS StudySteps** using AI-assisted analysis. This is an advisory tool; admission/scholarship outcomes are not guaranteed._\n",
        },
        {
            type: "input_text",
            text:
                "Student preferences (JSON):\n\n" +
                JSON.stringify(prefs, null, 2),
        },
        ...mediaParts,
    ];

    const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: [{ role: "user", content }],
    });

    return resp.output_text ?? "No output_text returned.";
}

export async function analyze(_: ActionState, formData: FormData): Promise<ActionState> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { ok: false, message: "OPENAI_API_KEY is missing on the server." };
        }

        // Blob URLs from client (already uploaded to Vercel Blob)
        const blobUrls = formData.getAll("blobUrls").map(String);
        if (!blobUrls.length) {
            return { ok: false, message: "Please upload marksheets before continuing." };
        }

        const prefs = {
            preferences: {
                stream: formData.getAll("stream"),
                universityType: formData.get("universityType"),
                budgetBand: formData.get("budgetBand"),
                city: formData.get("city"),
                intake: formData.get("intake"),
                mobility: formData.get("mobility"),
                postgradIntent: formData.get("postgradIntent"),
                learningStyle: formData.get("learningStyle"),
                careerOrientation: formData.get("careerOrientation"),
            },
            goals: {
                dreamCareer: formData.get("dreamCareer"),
                topPriorities: formData.get("topPriorities"),
                extras: formData.get("extras"),
            },
            attachments: blobUrls,
        };

        // 🔐 Transform: download + inline images, pass PDFs as URLs with ?download=1
        const mediaParts = await buildVisionInputs(blobUrls);

        const answer = await askOpenAI({ prefs, mediaParts });

        await purgeExpiredReports();
        const id = (
            await prisma.report.create({
                data: { markdown: answer, expiresAt: new Date(Date.now() + REPORT_TTL_MS) },
                select: { id: true },
            })
        ).id;

        return { ok: true, message: answer, id };
    } catch (err: any) {
        console.error(err);
        // Helpful error message if Blob fetch/transform failed
        if (String(err?.message || "").includes("Fetch failed")) {
            return { ok: false, message: "We couldn’t read one of the uploaded files. Please re-upload clear JPG/PNG/PDF files." };
        }
        if (String(err?.name) === "AbortError") {
            return { ok: false, message: "File download timed out. Please try again, or upload a smaller image/PDF." };
        }
        return { ok: false, message: `Error: ${err?.message ?? "Unknown error"}` };
    }
}
