import { NextResponse } from "next/server";
import { fetchAndUpsertEMGS } from "@/lib/emgs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    try {
        const summary = await fetchAndUpsertEMGS(id);
        return NextResponse.json(summary);
    } catch (err: any) {
        console.error("EMGS fetch error:", err);
        return NextResponse.json({ error: "Failed to fetch EMGS data." }, { status: 502 });
    }
}
