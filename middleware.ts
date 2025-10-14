import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

const SUPER_ADMIN_PATH = "/super-admin";
const AGENT_PATH = "/agent";
const APPLICANT_PATH = "/applicant";

const PUBLIC_SUPER_ADMIN = ["/super-admin/login"]; // allow unauth to see login

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // Skip static & Next internals
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/assets") ||
        pathname.startsWith("/api") // allow API routes; control inside handlers
    ) {
        return NextResponse.next();
    }

    // Which area?
    const inSuper = pathname.startsWith(SUPER_ADMIN_PATH);
    const inAgent = pathname.startsWith(AGENT_PATH);
    const inApplicant = pathname.startsWith(APPLICANT_PATH);

    // Public page for super-admin login
    if (inSuper && PUBLIC_SUPER_ADMIN.includes(pathname)) {
        return NextResponse.next();
    }

    // Read session
    const token = req.cookies.get("tjs_session")?.value || "";
    const session = token ? await verifySession(token) : null;
    const role = session?.role;

    // Route protection
    if (inSuper) {
        if (role === "superadmin") return NextResponse.next();
        // Not signed or wrong role → go to login
        const url = req.nextUrl.clone();
        url.pathname = "/super-admin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    if (inAgent && pathname !== "/agent/login") {
        if (role === "agent") return NextResponse.next();
        const url = req.nextUrl.clone();
        url.pathname = "/agent/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    if (inApplicant && pathname !== "/applicant/new") {
        if (role === "applicant") return NextResponse.next();
        const url = req.nextUrl.clone();
        url.pathname = "/applicant/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    // Other routes are public
    return NextResponse.next();
}

// Only run on these prefixes to keep it cheap
export const config = {
    matcher: ["/super-admin/:path*", "/agent/:path*", "/applicant/:path*"],
};
