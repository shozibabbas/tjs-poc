"use client";

import { useEffect, useState } from "react";

/**
 * Reads the user's role from a meta tag, window var, or API.
 * For demo purposes, this fetches from /api/session
 * which should return { role: "superadmin" | "agent" | "applicant" }
 */
export function useSessionRole() {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/session", { cache: "no-store" });
                const data = await res.json();
                setRole(data.role || null);
            } catch {
                setRole(null);
            }
        })();
    }, []);

    return role;
}
