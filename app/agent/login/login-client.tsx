"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { agentLogin } from "./actions";
import { useState } from "react";

export default function AgentLoginClient() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [state, formAction, pending] = useActionState(agentLogin, { ok: false } as any);

    if (state?.ok) {
        router.replace("/agent/dashboard");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                <div className="flex flex-col items-center mb-6">
                    <Image src="/tjs-logo.png" alt="TJS Logo" width={220} height={220} className="mb-2" />
                    <h1 className="text-slate-600">Agent Portal</h1>
                </div>

                <form action={formAction} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your.username"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                            autoComplete="username"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                            autoComplete="current-password"
                        />
                    </div>

                    {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}

                    <button
                        type="submit"
                        disabled={pending}
                        className="w-full rounded-lg bg-rose-700 text-white py-2 font-semibold hover:bg-rose-800 transition-colors disabled:opacity-50"
                    >
                        {pending ? "Signing in…" : "Login"}
                    </button>
                </form>

                <p className="mt-6 text-xs text-center text-slate-400">
                    © {new Date().getFullYear()} TJS StudySteps. All rights reserved.
                </p>
            </div>
        </div>
    );
}
