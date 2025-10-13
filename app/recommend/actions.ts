"use server";

import OpenAI from "openai";

export type ActionState = { ok: boolean; message: string };

function fileToDataUrl(file: File): Promise<{ dataUrl: string; mime: string; name: string }> {
    return new Promise(async (resolve, reject) => {
        try {
            const buf = Buffer.from(await file.arrayBuffer());
            const mime =
                file.type ||
                (file.name.toLowerCase().endsWith(".pdf")
                    ? "application/pdf"
                    : file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)
                        ? `image/${RegExp.$1 === "jpg" ? "jpeg" : RegExp.$1}`
                        : "application/octet-stream");
            const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
            resolve({ dataUrl, mime, name: file.name });
        } catch (e) {
            reject(e);
        }
    });
}

async function askOpenAI({
                             prefs,
                             marksheets,
                         }: {
    prefs: Record<string, any>;
    marksheets: Array<{ dataUrl: string; mime: string; name: string }>;
}) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const content: any[] = [
        {
            type: "input_text",
            text:
                "You are an experienced Malaysian higher-education counsellor. " +
                "Extract subject-wise marks/grades, years, attempt(s), and board from the ATTACHED MARKSHEETS (images or PDFs). " +
                "Combine that with the student's preferences to produce the TOP 5 bachelor programmes and the best-fit Malaysian universities. " +
                "Output MARKDOWN with sections:\n" +
                "1) Summary\n" +
                "2) Strengths from marks (per subject)\n" +
                "3) Top 5 Matches (for each: Programme • 3–5 Universities • Why fit • Entry expectations • Est. annual tuition band • Next intake)\n" +
                "4) Gaps/Missing info\n" +
                "5) Next Steps (IELTS/alternatives, scholarships pointers, documents checklist).\n" +
                "If multiple boards (e.g., SSC/HSSC, O/A Levels), consider all.",
        },
        {
            type: "input_text",
            text:
                "Student preferences (JSON). Use these to tailor city, budget, mobility, learning style, and career orientation:\n\n" +
                JSON.stringify(prefs, null, 2),
        },
    ];

    for (const f of marksheets) {
        content.push({ type: "input_image", image_url: f.dataUrl });
    }

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

        // 1) Collect marksheets
        const fileInputs = formData.getAll("marksheets") as File[];
        if (!fileInputs.length) return { ok: false, message: "Please attach at least one marksheet (PDF/JPG/PNG)." };
        const marksheets = await Promise.all(fileInputs.map(fileToDataUrl));

        // 2) Collect only preferences/goals (no academic fields)
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
        };

        // 3) Ask OpenAI with files + preferences
        const answer = await askOpenAI({ prefs, marksheets });
        return { ok: true, message: answer };
    } catch (err: any) {
        console.error(err);
        return { ok: false, message: `Error: ${err?.message ?? "Unknown error"}` };
    }
}
