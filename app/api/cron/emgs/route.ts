// app/api/cron/emgs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAndUpsertEMGS } from "@/lib/emgs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ---- Tunables (be polite to EMGS) ---- */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 300;
const CONCURRENCY = 3;              // how many applications at once
const BATCH_DELAY_MS = 1_500;       // wait between concurrent chunks
const PER_TASK_TIMEOUT_MS = 60_000; // safety timeout for each app (ms)

/** ---- Helpers ---- */
function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort("timeout"), ms);
    try {
        // if fetchAndUpsertEMGS supports AbortSignal, pass it; otherwise just race a timer.
        const result = await Promise.race([
            p,
            new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
        ]);
        return result as T;
    } finally {
        clearTimeout(t);
    }
}

/** ---- GET /api/cron/emgs ----
 * Query params:
 *  - secret: required (must match EMGS_CRON_SECRET)
 *  - page:   1-based page number (default 1)
 *  - limit:  items per page (default 50, max 300)
 *  - country: override country filter (default "Malaysia")
 *  - approved: "1" to only include agent-approved applications
 *  - agentId: filter by agent
 */
export async function GET(req: Request) {
    const startedAt = Date.now();

    // Secret check
    const url = new URL(req.url);
    const qsSecret = url.searchParams.get("secret") || "";
    const headerSecret = req.headers.get("x-cron-key") || "";
    const SECRET = process.env.EMGS_CRON_SECRET || "";
    if (!SECRET) {
        return NextResponse.json(
            { error: "Server misconfigured: EMGS_CRON_SECRET not set." },
            { status: 500 }
        );
    }
    if (qsSecret !== SECRET && headerSecret !== SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Inputs
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
    );
    const skip = (page - 1) * limit;

    const country = (url.searchParams.get("country") || "Malaysia").trim();
    const approved = url.searchParams.get("approved") === "1";
    const agentId = (url.searchParams.get("agentId") || "").trim();

    // Build Prisma filter
    const where: any = {
        country: { equals: country, mode: "insensitive" },
    };
    if (approved) where.agentApproval = true;
    if (agentId) where.agentId = agentId;

    // Fetch batch of applications
    const [total, apps] = await Promise.all([
        prisma.application.count({ where }),
        prisma.application.findMany({
            where,
            select: { id: true, firstName: true, lastName: true, passport: true, nationality: true },
            orderBy: { createdAt: "asc" },
            skip,
            take: limit,
        }),
    ]);

    if (apps.length === 0) {
        return NextResponse.json(
            {
                ok: true,
                page,
                limit,
                total,
                processed: 0,
                successes: 0,
                failures: 0,
                durationMs: Date.now() - startedAt,
                results: [],
            },
            noStore()
        );
    }

    // Process in small concurrent chunks
    const results: Array<{
        id: string;
        ok: boolean;
        error?: string;
        summary?: any;
    }> = [];

    for (let i = 0; i < apps.length; i += CONCURRENCY) {
        const chunk = apps.slice(i, i + CONCURRENCY);

        const settled = await Promise.allSettled(
            chunk.map((a) =>
                withTimeout(fetchAndUpsertEMGS(a.id), PER_TASK_TIMEOUT_MS).then((summary) => ({
                    id: a.id,
                    ok: true,
                    summary,
                }))
            )
        );

        settled.forEach((r, idx) => {
            const id = chunk[idx].id;
            if (r.status === "fulfilled") {
                results.push({ id, ok: true, summary: r.value.summary ?? r.value });
            } else {
                results.push({ id, ok: false, error: String(r.reason || "failed") });
            }
        });

        if (i + CONCURRENCY < apps.length) {
            await sleep(BATCH_DELAY_MS); // pacing between chunks
        }
    }

    const processed = results.length;
    const successes = results.filter((r) => r.ok).length;
    const failures = processed - successes;

    return NextResponse.json(
        {
            ok: true,
            page,
            limit,
            total,
            processed,
            successes,
            failures,
            durationMs: Date.now() - startedAt,
            country,
            approved,
            agentId: agentId || null,
            results, // keep concise in prod; or strip summaries if payloads get large
        },
        noStore()
    );
}

/** Disable caching for responses */
function noStore() {
    return {
        headers: {
            "Cache-Control": "no-store, max-age=0",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
        },
    };
}
