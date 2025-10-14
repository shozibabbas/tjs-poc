import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {cookies} from "next/headers"; // your helper to decode tjs_session

export async function GET() {
    const token = (await cookies()).get("tjs_session")?.value;
    if (token) {
        const session = await verifySession(token);
        return NextResponse.json({role: session?.role || null});
    }
    return NextResponse.json({role: null});
}
