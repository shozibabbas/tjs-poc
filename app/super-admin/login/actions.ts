"use server";

import { cookies } from "next/headers";
import { signSession } from "@/lib/auth";

export async function superAdminLogin(_: any, formData: FormData) {
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const USER = process.env.SUPER_ADMIN_USER || "";
    const PASS = process.env.SUPER_ADMIN_PASS || "";

    if (!USER || !PASS) {
        return { ok: false, error: "Super admin credentials not configured." };
    }
    if (email !== USER || password !== PASS) {
        return { ok: false, error: "Invalid credentials." };
    }

    const token = await signSession({ role: "superadmin", sub: email });
    (await cookies()).set("tjs_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 8,
    });

    return { ok: true };
}
