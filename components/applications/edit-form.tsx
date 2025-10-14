"use client";

import {Usable, use, useEffect, useMemo, useState} from "react";
import { useRouter } from "next/navigation";

type AgentLite = { id: string; code: string; name: string; email: string; phone?: string | null };
type Application = {
    id: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    passport: string;
    email: string;
    phone: string;
    nationality: string;
    visaCity: string;
    country: string;
    university: string;
    program: string;
    intake: string;
    agentApproval: boolean;
    agentReferralCode: string;
    agent: { id: string; name: string; code: string } | null;
};

function useDebounced<T>(value: T, delay = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function ApplicationEditForm({ params }: { params: Usable<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const appId = id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [banner, setBanner] = useState<string | null>(null);

    // form state
    const [initial, setInitial] = useState<Application | null>(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [passport, setPassport] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [nationality, setNationality] = useState("");
    const [visaCity, setVisaCity] = useState("");
    const [country, setCountry] = useState("");
    const [university, setUniversity] = useState("");
    const [program, setProgram] = useState("");
    const [intake, setIntake] = useState("");

    // agent
    const [agentApproval, setAgentApproval] = useState(false);
    const [agentReferralCode, setAgentReferralCode] = useState("");
    const debouncedCode = useDebounced(agentReferralCode, 350);
    const [resolvedAgent, setResolvedAgent] = useState<AgentLite | null>(null);
    const [agentLookupLoading, setAgentLookupLoading] = useState(false);
    const [agentLookupError, setAgentLookupError] = useState<string | null>(null);

    // load app
    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/applications/${appId}`, { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load application.");

                if (!ignore) {
                    setInitial(data);
                    setFirstName(data.firstName);
                    setLastName(data.lastName);
                    setPassport(data.passport);
                    setEmail(data.email);
                    setPhone(data.phone);
                    setNationality(data.nationality);
                    setVisaCity(data.visaCity);
                    setCountry(data.country);
                    setUniversity(data.university);
                    setProgram(data.program);
                    setIntake(data.intake);
                    setAgentApproval(!!data.agentApproval);
                    setAgentReferralCode(data.agentReferralCode || "");
                    // initial resolved agent (from app)
                    setResolvedAgent(data.agent ? { id: data.agent.id, code: data.agent.code, name: data.agent.name, email: "", phone: "" } : null);
                }
            } catch (e: any) {
                if (!ignore) setError(e?.message || "Something went wrong.");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [appId]);

    // live lookup agent by code
    useEffect(() => {
        let ignore = false;
        (async () => {
            setAgentLookupError(null);
            setResolvedAgent(null);
            if (!debouncedCode.trim()) return;
            setAgentLookupLoading(true);
            try {
                const res = await fetch(`/api/agents/by-code?code=${encodeURIComponent(debouncedCode.trim())}`, { cache: "no-store" });
                const data = await res.json();
                if (!ignore) {
                    if (data?.found && data.agent) setResolvedAgent(data.agent as AgentLite);
                    else setResolvedAgent(null);
                }
            } catch (e: any) {
                if (!ignore) setAgentLookupError(e?.message || "Failed to resolve agent.");
            } finally {
                if (!ignore) setAgentLookupLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [debouncedCode]);

    const touched =
        initial &&
        (
            firstName !== initial.firstName ||
            lastName !== initial.lastName ||
            passport !== initial.passport ||
            email !== initial.email ||
            phone !== initial.phone ||
            nationality !== initial.nationality ||
            visaCity !== initial.visaCity ||
            country !== initial.country ||
            university !== initial.university ||
            program !== initial.program ||
            intake !== initial.intake ||
            agentApproval !== initial.agentApproval ||
            agentReferralCode !== (initial.agentReferralCode || "")
        );

    const valid =
        firstName.trim() &&
        lastName.trim() &&
        passport.trim() &&
        email.trim() &&
        phone.trim() &&
        nationality.trim() &&
        visaCity.trim() &&
        country.trim() &&
        university.trim() &&
        program.trim() &&
        intake.trim();

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || !initial) return;

        setSaving(true);
        setError(null);
        setBanner(null);

        try {
            const res = await fetch(`/api/applications/${appId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName, lastName, passport, email, phone,
                    nationality, visaCity, country, university, program, intake,
                    agentApproval,
                    agentReferralCode,
                    agentId: resolvedAgent?.id ?? undefined, // prefer explicit link if found
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save changes.");

            setBanner("Application updated successfully.");
            // refresh initial snapshot
            setInitial({
                ...initial,
                firstName, lastName, passport, email, phone,
                nationality, visaCity, country, university, program, intake,
                agentApproval,
                agentReferralCode,
                agent: resolvedAgent ? { id: resolvedAgent.id, name: resolvedAgent.name, code: resolvedAgent.code } : null,
            });
        } catch (e: any) {
            setError(e?.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Edit Application</h2>
                    <p className="text-sm text-slate-600">Update applicant details, study preferences, and referral.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.back()}
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
                <form onSubmit={onSave} className="grid grid-cols-1 gap-6">
                    {/* Applicant */}
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-slate-900">Applicant</h3>
                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                            <Field label="First Name" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
                            </Field>
                            <Field label="Last Name" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={lastName} onChange={(e)=>setLastName(e.target.value)} />
                            </Field>
                            <Field label="Passport" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-slate-500 focus:ring-slate-500"
                                       value={passport} onChange={(e)=>setPassport(e.target.value)} />
                            </Field>
                            <Field label="Email" required>
                                <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={email} onChange={(e)=>setEmail(e.target.value)} />
                            </Field>
                            <Field label="Phone" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={phone} onChange={(e)=>setPhone(e.target.value)} />
                            </Field>
                            <Field label="Nationality" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={nationality} onChange={(e)=>setNationality(e.target.value)} />
                            </Field>
                        </div>
                    </section>

                    {/* Study */}
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-slate-900">Study Preferences</h3>
                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                            <Field label="Visa City" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={visaCity} onChange={(e)=>setVisaCity(e.target.value)} />
                            </Field>
                            <Field label="Destination Country" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={country} onChange={(e)=>setCountry(e.target.value)} />
                            </Field>
                            <Field label="University" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={university} onChange={(e)=>setUniversity(e.target.value)} />
                            </Field>
                            <Field label="Program" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={program} onChange={(e)=>setProgram(e.target.value)} />
                            </Field>
                            <Field label="Intake" required>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                       value={intake} onChange={(e)=>setIntake(e.target.value)} />
                            </Field>
                        </div>
                    </section>

                    {/* Agent & Approval */}
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-slate-900">Agent & Approval</h3>
                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                            <Field label="Agent Referral Code" hint={agentLookupLoading ? "Validating…" : (agentReferralCode && !resolvedAgent ? "No agent found." : "Enter the code shared by the counsellor.")}>
                                <input
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:ring-slate-500"
                                    value={agentReferralCode}
                                    onChange={(e)=>setAgentReferralCode(e.target.value.toUpperCase())}
                                    placeholder="TJS-ISB-001"
                                />
                            </Field>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-medium text-slate-800">Resolved Agent</p>
                                {agentLookupLoading ? (
                                    <p className="mt-2 text-sm text-slate-500">Looking up agent…</p>
                                ) : resolvedAgent ? (
                                    <ul className="mt-2 text-sm text-slate-700">
                                        <li><span className="text-slate-500">Name:</span> {resolvedAgent.name}</li>
                                        <li><span className="text-slate-500">Code:</span> {resolvedAgent.code}</li>
                                    </ul>
                                ) : agentReferralCode ? (
                                    <p className="mt-2 text-sm text-rose-700">{agentLookupError || "No agent found for this code."}</p>
                                ) : (
                                    <p className="mt-2 text-sm text-slate-500">Enter a referral code to resolve agent.</p>
                                )}
                            </div>

                            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-rose-700 focus:ring-rose-700"
                                    checked={agentApproval}
                                    onChange={(e)=>setAgentApproval(e.target.checked)}
                                />
                                <span className="text-sm text-slate-800">Agent Approved</span>
                            </label>
                        </div>
                    </section>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => router.push("/super-admin/applications")}
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
        </div>
    );
}

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
