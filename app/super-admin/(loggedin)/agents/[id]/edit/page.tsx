"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Agent = {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    username: string;
    // password is not returned for security reasons
};

export default function EditAgentPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [banner, setBanner] = useState<string | null>(null);

    // form state
    const [initial, setInitial] = useState<Agent | null>(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState(""); // optional: send only if set

    // delete modal
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/agents/${id}`, { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load agent.");

                if (!ignore) {
                    const ag: Agent = {
                        id: data.id,
                        code: data.code,
                        name: data.name,
                        email: data.email,
                        phone: data.phone ?? "",
                        username: data.username ?? "",
                    };
                    setInitial(ag);
                    setCode(ag.code);
                    setName(ag.name);
                    setEmail(ag.email);
                    setPhone(ag.phone || "");
                    setUsername(ag.username);
                }
            } catch (e: any) {
                if (!ignore) setError(e?.message || "Something went wrong.");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [id]);

    const touched =
        initial &&
        (code !== initial.code ||
            name !== initial.name ||
            email !== initial.email ||
            (phone || "") !== (initial.phone || "") ||
            username !== initial.username ||
            newPassword.trim().length > 0);

    const valid =
        code.trim().length > 0 &&
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        username.trim().length > 0;

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || !initial) return;
        setSaving(true);
        setError(null);
        setBanner(null);
        try {
            const payload: any = {
                code: code.trim(),
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                username: username.trim(),
            };
            if (newPassword.trim()) {
                payload.password = newPassword; // API should hash on server
            }

            const res = await fetch(`/api/agents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save changes.");

            setBanner("Agent updated successfully.");
            setNewPassword("");
            // refresh initial (optional) or just update local initial
            setInitial({
                id: initial.id,
                code: payload.code,
                name: payload.name,
                email: payload.email,
                phone: payload.phone ?? "",
                username: payload.username,
            });
        } catch (e: any) {
            setError(e?.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className=" rounded-xl max-w-2xl mx-auto border border-slate-200 bg-white p-4 shadow-sm md:p-6 space-y-5">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Edit Agent</h2>
                    <p className="text-sm text-slate-600">Update counsellor details and credentials.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDelete(true)}
                        className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => router.push("/super-admin/agents")}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Back to list
                    </button>
                </div>
            </header>

            {banner && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                    {banner}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading…</div>
            ) : initial ? (
                <form onSubmit={onSave} className="grid max-w-2xl grid-cols-1 gap-4">
                    <Field label="Referral Code" required>
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="TJS-ISB-001"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:ring-slate-500"
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Name" required>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ayesha Khan"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                            />
                        </Field>
                        <Field label="Email" required>
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
                        <Field label="Username" required hint="Used by the agent to log in.">
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ayesha.khan"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                autoComplete="username"
                            />
                        </Field>

                        <Field
                            label="New Password"
                            hint="Leave blank to keep the current password."
                        >
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                autoComplete="new-password"
                            />
                        </Field>
                    </div>

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
                            disabled={!touched || !valid || saving}
                            className="rounded-lg bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Not found.</div>
            )}

            {/* Mock Delete Modal */}
            {showDelete && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900">Delete Agent</h3>
                        <p className="mt-2 text-sm text-slate-700">
                            This is a <strong>mock</strong> delete. The actual delete endpoint isn’t implemented yet.
                            Please confirm to see the message and return.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setShowDelete(false)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowDelete(false);
                                    setBanner("Delete is not implemented yet. Please contact the system administrator.");
                                }}
                                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                            >
                                Confirm (Mock)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- Reusable Field ---------- */
function Field({
                   label,
                   children,
                   required,
                   hint,
               }: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    hint?: string;
}) {
    return (
        <label className="grid items-start gap-1">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-700">*</span>}
      </span>
            <div>{children}</div>
            {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </label>
    );
}
