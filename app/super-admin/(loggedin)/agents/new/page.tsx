"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function genPassword(len = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function NewAgentPage() {
    const router = useRouter();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState(genPassword());

    const [touched, setTouched] = useState(false);
    const [pending, setPending] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    const basicValid =
        code.trim() &&
        name.trim() &&
        email.trim() &&
        username.trim() &&
        password.trim();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        setErrorMsg(null);
        if (!basicValid) return;

        setPending(true);
        try {
            const res = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    code, name, email,
                    phone: phone || null,
                    username, password,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create agent");
            setSuccessId(data.id);
        } catch (err: any) {
            setErrorMsg(err?.message || "Something went wrong.");
        } finally {
            setPending(false);
        }
    }

    function resetForm() {
        setCode("");
        setName("");
        setEmail("");
        setPhone("");
        setUsername("");
        setPassword(genPassword());
        setTouched(false);
        setErrorMsg(null);
        setSuccessId(null);
    }

    return (
        <div className=" rounded-xl max-w-2xl mx-auto border border-slate-200 bg-white p-4 shadow-sm md:p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Create New Agent</h2>
                    <p className="text-sm text-slate-600">Add a counsellor/agent with a unique referral code.</p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
                <Field label="Referral Code" required error={touched && !code.trim()} hint="Unique code the student will enter. Example: TJS-ISB-001">
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="TJS-ISB-001"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:ring-slate-500"
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Name" required error={touched && !name.trim()}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ayesha Khan"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                        />
                    </Field>
                    <Field label="Email" required error={touched && !email.trim()}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ayesha.khan@tjsstudysteps.com"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                        />
                    </Field>
                </div>

                <Field label="Phone">
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Username" required error={touched && !username.trim()} hint="Used by the agent to log in. Must be unique.">
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ayesha.khan"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                            autoComplete="username"
                        />
                    </Field>

                    <Field label="Password" required error={touched && !password.trim()} hint="Share securely. Changeable later.">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setPassword(genPassword())}
                                className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"
                                title="Generate strong password"
                            >
                                Generate
                            </button>
                        </div>
                    </Field>
                </div>

                {errorMsg && <p className="text-sm text-rose-700">{errorMsg}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => router.push("/super-admin/agents")}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={pending || !basicValid}
                        className="rounded-lg bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                    >
                        {pending ? "Creating…" : "Create Agent"}
                    </button>
                </div>
            </form>

            {/* Success modal */}
            {successId && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900">Agent Created</h3>
                        <p className="mt-2 text-sm text-slate-700">The agent has been created successfully.</p>
                        <ul className="mt-3 space-y-1 text-sm text-slate-700">
                            <li><span className="text-slate-500">ID:</span> <span className="font-mono">{successId}</span></li>
                            <li><span className="text-slate-500">Code:</span> <span className="font-mono">{code}</span></li>
                            <li><span className="text-slate-500">Name:</span> {name}</li>
                            <li><span className="text-slate-500">Email:</span> {email}</li>
                        </ul>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => { setSuccessId(null); resetForm(); }}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Add Another
                            </button>
                            <button
                                onClick={() => router.replace("/super-admin/agents")}
                                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                            >
                                Go to Agents
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({
                   label,
                   children,
                   required,
                   hint,
                   error,
               }: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    hint?: string;
    error?: boolean;
}) {
    return (
        <label className="grid items-start gap-1">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-700">*</span>}
      </span>
            <div className={error ? "rounded-lg ring-1 ring-rose-600 ring-offset-0" : ""}>{children}</div>
            {hint && <span className={`text-xs ${error ? "text-rose-700" : "text-slate-500"}`}>{hint}</span>}
        </label>
    );
}
