import LoginClient from "./login-client";
import {cookies} from "next/headers";
import {verifySession} from "@/lib/auth";
import {redirect} from "next/navigation";

export default async function AgentLoginPage() {
    // --- Step 1: Check existing session cookie ---
    const token = (await cookies()).get("tjs_session")?.value;
    if (token) {
        const session = await verifySession(token);
        if (session?.role === "agent") {
            // ✅ Already logged in — redirect straight to dashboard
            redirect("/agent/dashboard");
        }
    }

    // --- Step 2: Render login form if not logged in ---
    return <LoginClient />;
}
