import { cookies } from "next/headers";
import {NextRequest, NextResponse} from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
    (await cookies()).set("tjs_session", "", { httpOnly: true, path: "/", maxAge: 0 });
    // Given an incoming request...
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
}
