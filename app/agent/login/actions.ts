"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { signSession } from "@/lib/auth";

/**
 * Agent login via username/password.
 * - Looks up Agent by username
 * - bcrypt.compare() with stored hash
 * - Signs session with role 'agent' and agent id/email
 * - Sets 'tjs_session' cookie (same as super admin)
 */
export async function agentLogin(_: any, formData: FormData) {
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
        return { ok: false, error: "Please enter your username and password." };
    }

    const agent = await prisma.agent.findUnique({
        where: { username },
        select: { id: true, username: true, password: true, email: true, name: true },
    });

    if (!agent) {
        return { ok: false, error: "Invalid credentials." };
    }

    const match = await bcrypt.compare(password, agent.password);
    if (!match) {
        return { ok: false, error: "Invalid credentials." };
    }

    const token = await signSession({
        role: "agent",
        sub: agent.username,
    });

    (await cookies()).set("tjs_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
    });

    return { ok: true };
}
