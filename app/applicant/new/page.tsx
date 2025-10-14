"use client";

import { useEffect, useMemo, useState } from "react";

/* ===== Types ===== */
type Agent = {
    id: string;
    code: string;
    name: string;
    phone?: string;
    email: string;
};

/* ===== Helpers ===== */
function genUsername(first: string, last: string) {
    const base = `${first}.${last}`.toLowerCase().replace(/[^a-z0-9.]+/g, "");
    const tail = Math.random().toString(36).slice(2, 6);
    return `app_${base}_${tail}`;
}
function genPassword(len = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function useDebounced<T>(value: T, delay = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

/* ===== Page Component ===== */
export default function NewApplicationPage() {
    // Core fields
    const [firstName, setFirstName]     = useState("");
    const [lastName, setLastName]       = useState("");
    const [passport, setPassport]       = useState("");

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Text inputs
    const [nationality, setNationality] = useState("");

    const [visaCity, setVisaCity]       = useState(""); // Single-entry visa processing city
    const [country, setCountry]         = useState(""); // Study country
    const [university, setUniversity]   = useState("");
    const [program, setProgram]         = useState("");
    const [intake, setIntake]           = useState("");

    // Agent referral
    const [agentCode, setAgentCode]         = useState("");
    const debouncedAgentCode = useDebounced(agentCode, 350);
    const [agentResolved, setAgentResolved] = useState<Agent | null>(null);
    const [agentLoading, setAgentLoading]   = useState(false);
    const [agentError, setAgentError]       = useState<string | null>(null);

    // UI state
    const [touched, setTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [createdAppId, setCreatedAppId] = useState<string | null>(null);
    const [issuedUsername, setIssuedUsername] = useState<string | null>(null);
    const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

    /* ===== Resolve agent by code (Prisma via API) ===== */
    useEffect(() => {
        let ignore = false;

        async function run() {
            setAgentError(null);
            setAgentResolved(null);
            if (!debouncedAgentCode.trim()) return;

            setAgentLoading(true);
            try {
                const url = `/api/agents/by-code?code=${encodeURIComponent(debouncedAgentCode.trim())}`;
                const res = await fetch(url, { cache: "no-store" });
                const data = await res.json();
                if (!ignore) {
                    if (data?.found && data.agent) {
                        setAgentResolved(data.agent as Agent);
                    } else {
                        setAgentResolved(null);
                    }
                }
            } catch (e: any) {
                if (!ignore) setAgentError(e?.message || "Failed to resolve agent.");
            } finally {
                if (!ignore) setAgentLoading(false);
            }
        }

        run();
        return () => { ignore = true; };
    }, [debouncedAgentCode]);

    /* ===== Validation ===== */
    const nameValid     = firstName.trim().length > 0 && lastName.trim().length > 0;
    const passportValid = /^[A-Za-z0-9]{6,15}$/.test(passport.trim());
    const agentValid    = !!agentResolved;

    const requiredFilled =
        nationality.trim() &&
        visaCity.trim() &&
        country.trim() &&
        university.trim() &&
        program.trim() &&
        intake.trim();

    const contactValid = email.trim() && phone.trim();

    const allValid = nameValid && passportValid && requiredFilled && agentValid && contactValid;

    /* ===== Submit ===== */
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        setErrorMsg(null);
        if (!allValid) return;

        const username = genUsername(firstName, lastName);
        const password = genPassword(12);

        setSubmitting(true);
        try {
            const res = await fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName, lastName, passport,
                    nationality, visaCity, country,
                    university, program, intake,
                    agentReferralCode: agentCode,
                    agentId: agentResolved?.id ?? null,
                    username, password,
                    email, phone,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create application.");
            setCreatedAppId(data.id || null);
            setIssuedUsername(username);
            setIssuedPassword(password);
            setShowSuccess(true);
        } catch (err: any) {
            setErrorMsg(err?.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    }

    function reset() {
        setFirstName("");
        setLastName("");
        setPassport("");
        setNationality("");
        setVisaCity("");
        setCountry("");
        setUniversity("");
        setProgram("");
        setIntake("");
        setAgentCode("");
        setAgentResolved(null);
        setTouched(false);
        setErrorMsg(null);
        setCreatedAppId(null);
        setIssuedUsername(null);
        setIssuedPassword(null);
        setEmail("");
        setPhone("");
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8">
                {/* Header */}
                <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="items-start">
                        <h1 className="text-2xl font-bold text-slate-900">Create Application</h1>
                        <p className="text-sm text-slate-600">
                            Fill in the details below to start your university application. You’ll receive a username and password by email. The agent must approve to initiate the formal process.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              Step 1 of 2 • Applicant Details
            </span>
                    </div>
                </header>

                {/* Layout */}
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                    <form onSubmit={submit} className="md:col-span-2 space-y-8">
                        {/* Applicant Information */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900">Applicant Information</h2>
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field label="First Name" required error={touched && !firstName.trim()}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Muhammad" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </Field>
                                <Field label="Last Name" required error={touched && !lastName.trim()}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Ali" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </Field>
                                <Field label="Passport Number" required error={touched && !passportValid} hint={touched && !passportValid ? "6–15 characters, letters & numbers only." : "Use the passport you’ll travel with."}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., AB1234567" value={passport} onChange={(e) => setPassport(e.target.value)} />
                                </Field>
                                <Field label="Nationality" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Pakistan" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                                </Field>
                                <Field label="Email" required>
                                    <input
                                        type="email"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        placeholder="e.g., student@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </Field>

                                <Field label="Phone (WhatsApp preferred)" required>
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        placeholder="+92 3xx xxxxxxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </Field>
                            </div>
                        </section>

                        {/* Study Preferences */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900">Study Preferences</h2>
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field label="Single-Entry Visa (Processing City)" required hint="Enter the city where your visa application will be processed.">
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Islamabad" value={visaCity} onChange={(e) => setVisaCity(e.target.value)} />
                                </Field>
                                <Field label="Country (Study Destination)" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Malaysia" value={country} onChange={(e) => setCountry(e.target.value)} />
                                </Field>
                                <Field label="University" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., Taylor’s University" value={university} onChange={(e) => setUniversity(e.target.value)} />
                                </Field>
                                <Field label="Program" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., BSc (Hons) Computer Science" value={program} onChange={(e) => setProgram(e.target.value)} />
                                </Field>
                                <Field label="Intake" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500" placeholder="e.g., September 2026" value={intake} onChange={(e) => setIntake(e.target.value)} />
                                </Field>
                            </div>
                        </section>

                        {/* Agent Referral */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-slate-900">Agent Referral</h2>

                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field
                                    label="Agent Referral Code"
                                    required
                                    error={touched && (!!agentCode && !agentValid)}
                                    hint={
                                        agentLoading ? "Validating…" :
                                            (touched && agentCode && !agentValid ? "Invalid referral code." : "Enter the code shared by your counsellor.")
                                    }
                                >
                                    <input
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:ring-slate-500"
                                        placeholder="e.g., TJS-ISB-001"
                                        value={agentCode}
                                        onChange={(e) => setAgentCode(e.target.value)}
                                    />
                                </Field>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-sm font-medium text-slate-800">Resolved Agent</p>
                                    {agentLoading ? (
                                        <p className="mt-2 text-sm text-slate-500">Looking up agent…</p>
                                    ) : agentResolved ? (
                                        <ul className="mt-2 text-sm text-slate-700">
                                            <li><span className="text-slate-500">Name:</span> {agentResolved.name}</li>
                                            <li><span className="text-slate-500">Code:</span> {agentResolved.code}</li>
                                            <li><span className="text-slate-500">Phone:</span> {agentResolved.phone || "—"}</li>
                                            <li><span className="text-slate-500">Email:</span> {agentResolved.email}</li>
                                        </ul>
                                    ) : agentCode.trim() ? (
                                        <p className="mt-2 text-sm text-rose-700">{agentError || "No agent found for this code."}</p>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-500">Enter a valid code to see agent details.</p>
                                    )}
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                The application cannot be submitted without a valid agent referral code. After submission, the agent must approve to initiate the formal process.
                            </p>
                        </section>

                        {/* Actions */}
                        <div className="flex items-start justify-end gap-3">
                            <button
                                type="button"
                                onClick={reset}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={!allValid || submitting}
                                className="rounded-lg bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                            >
                                {submitting ? "Creating…" : "Create Application"}
                            </button>
                        </div>

                        {errorMsg && <p className="text-sm text-rose-700">{errorMsg}</p>}
                        {!allValid && touched && !errorMsg && (
                            <p className="text-sm text-amber-700">Please complete all required fields and provide a valid agent referral code.</p>
                        )}
                    </form>

                    {/* Summary */}
                    <aside className="md:col-span-1">
                        <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-semibold text-slate-900">Application Summary</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li><span className="text-slate-500">Applicant:</span> {firstName || "—"} {lastName || ""}</li>
                                <li><span className="text-slate-500">Passport:</span> {passport || "—"}</li>
                                <li><span className="text-slate-500">Nationality:</span> {nationality || "—"}</li>
                                <li><span className="text-slate-500">Email:</span> {email || "—"}</li>
                                <li><span className="text-slate-500">Phone:</span> {phone || "—"}</li>
                                <li><span className="text-slate-500">Visa City:</span> {visaCity || "—"}</li>
                                <li><span className="text-slate-500">Country:</span> {country || "—"}</li>
                                <li><span className="text-slate-500">University:</span> {university || "—"}</li>
                                <li><span className="text-slate-500">Program:</span> {program || "—"}</li>
                                <li><span className="text-slate-500">Intake:</span> {intake || "—"}</li>
                                <li><span className="text-slate-500">Agent:</span> {agentResolved ? `${agentResolved.name} (${agentResolved.code})` : "—"}</li>
                            </ul>
                            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                Ensure the details match your documents. Any discrepancies may delay your application.
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900">Application Created</h3>
                        <p className="mt-2 text-sm text-slate-700">
                            Your application has been created. Your agent will receive a request to approve this application.
                        </p>
                        <ul className="mt-3 space-y-1 text-sm text-slate-700">
                            <li><span className="text-slate-500">Application ID:</span> <span className="font-mono">{createdAppId ?? "—"}</span></li>
                            <li><span className="text-slate-500">Applicant:</span> {firstName} {lastName}</li>
                            <li><span className="text-slate-500">Contact:</span> {email} • {phone}</li>
                            <li><span className="text-slate-500">University:</span> {university}</li>
                            <li><span className="text-slate-500">Program:</span> {program}</li>
                            <li><span className="text-slate-500">Intake:</span> {intake}</li>
                            <li><span className="text-slate-500">Agent:</span> {agentResolved?.name} ({agentResolved?.code})</li>
                        </ul>
                        {/*{issuedUsername && issuedPassword && (*/}
                        {/*    <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs">*/}
                        {/*        <div><span className="text-slate-500">Username:</span> <span className="font-mono">{issuedUsername}</span></div>*/}
                        {/*        <div><span className="text-slate-500">Password:</span> <span className="font-mono">{issuedPassword}</span></div>*/}
                        {/*    </div>*/}
                        {/*)}*/}
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setShowSuccess(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Close</button>
                            {/*<button onClick={() => { setShowSuccess(false); reset(); }} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">New Application</button>*/}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- Reusable Field Wrapper ---------- */
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
            <div className={error ? "rounded-lg ring-1 ring-rose-600 ring-offset-0" : ""}>
                {children}
            </div>
            {hint && (
                <span className={`text-xs ${error ? "text-rose-700" : "text-slate-500"}`}>{hint}</span>
            )}
        </label>
    );
}
