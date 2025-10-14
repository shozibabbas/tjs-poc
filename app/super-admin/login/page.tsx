// app/super-admin/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import LoginClient from "./login-client";

export default async function SuperAdminLoginPage() {
    // --- Step 1: Check existing session cookie ---
    const token = (await cookies()).get("tjs_session")?.value;
    if (token) {
        const session = await verifySession(token);
        if (session?.role === "superadmin") {
            // ✅ Already logged in — redirect straight to dashboard
            redirect("/super-admin/dashboard");
        }
    }

    // --- Step 2: Render login form if not logged in ---
    return <LoginClient />;
}
