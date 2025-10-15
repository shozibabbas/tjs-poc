"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ------- helpers ------- */
function genPassword(len = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function genUsername(first: string, last: string) {
    const base = `${(first || "").trim()}.${(last || "").trim()}`.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const suffix = Math.floor(100 + Math.random() * 900); // 3 digits
    return (base || "student") + suffix;
}
const passportOk = (s: string) => /^[A-Za-z0-9]{6,15}$/.test(s.trim());
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const phoneOk = (s: string) => s.trim().length >= 7;

/* - type for resolved agent preview - */
type AgentPreview = { id: string; name: string; code: string; email?: string | null; phone?: string | null } | null;

export default function ApplicationNewForm() {
    const router = useRouter();

    /* identity */
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName]   = useState("");
    const [passport, setPassport]   = useState("");
    const [email, setEmail]         = useState("");
    const [phone, setPhone]         = useState("");

    /* study */
    const [nationality, setNationality] = useState("");
    const [visaCity, setVisaCity]       = useState("");
    const [country, setCountry]         = useState("");
    const [university, setUniversity]   = useState("");
    const [program, setProgram]         = useState("");
    const [intake, setIntake]           = useState("");

    /* agent */
    const [agentReferralCode, setAgentReferralCode] = useState("");
    const [agentResolved, setAgentResolved]         = useState<AgentPreview>(null);
    const [resolving, setResolving]                 = useState(false);

    /* applicant portal creds */
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState(genPassword());

    /* ui */
    const [touched, setTouched]     = useState(false);
    const [pending, setPending]     = useState(false);
    const [errorMsg, setErrorMsg]   = useState<string | null>(null);
    const [createdId, setCreatedId] = useState<string | null>(null);

    /* auto-suggest username */
    useEffect(() => {
        if (!touched) {
            setUsername(genUsername(firstName, lastName));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstName, lastName]);

    /* resolve agent preview (non-blocking, optional) */
    useEffect(() => {
        let ignore = false;
        const code = agentReferralCode.trim();
        if (!code) { setAgentResolved(null); return; }

        (async () => {
            setResolving(true);
            try {
                // If you already have an agent-lookup endpoint, keep this.
                // Otherwise, this is optional and won't block submission.
                const qs = new URLSearchParams({ code });
                const res = await fetch(`/api/agents/by-code?` + qs.toString(), { cache: "no-store" });
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (!ignore) setAgentResolved(data?.agent ?? null);
            } catch {
                if (!ignore) setAgentResolved(null);
            } finally {
                if (!ignore) setResolving(false);
            }
        })();

        return () => { ignore = true; };
    }, [agentReferralCode]);

    /* validation */
    const nameValid     = firstName.trim().length > 0 && lastName.trim().length > 0;
    const passportValid = passportOk(passport);
    const emailValid    = emailOk(email);
    const phoneValid    = phoneOk(phone);
    const reqFilled =
        nationality.trim() && visaCity.trim() && country.trim() &&
        university.trim() && program.trim() && intake.trim() &&
        agentReferralCode.trim() && username.trim() && password.trim();

    const allValid = nameValid && passportValid && emailValid && phoneValid && reqFilled;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        setErrorMsg(null);
        if (!allValid) return;

        setPending(true);
        try {
            const res = await fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    firstName, lastName, passport, email, phone,
                    nationality, visaCity, country, university, program, intake,
                    agentReferralCode,
                    username, password,
                    agentId: agentResolved?.id ?? undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create application");
            setCreatedId(data.id);
        } catch (err: any) {
            setErrorMsg(err?.message || "Something went wrong.");
        } finally {
            setPending(false);
        }
    }

    function resetForm() {
        setFirstName(""); setLastName(""); setPassport("");
        setEmail(""); setPhone("");
        setNationality(""); setVisaCity(""); setCountry("");
        setUniversity(""); setProgram(""); setIntake("");
        setAgentReferralCode(""); setAgentResolved(null);
        setUsername(""); setPassword(genPassword());
        setTouched(false); setErrorMsg(null); setCreatedId(null);
    }

    const canSubmit = allValid && !pending && agentResolved;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8">
                {/* Header */}
                <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="items-start">
                        <h1 className="text-2xl font-bold text-slate-900">New Application</h1>
                        <p className="text-sm text-slate-600">
                            Enter applicant and study details. A notification is emailed to the agent and applicant after submission.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              Step 1 of 1 • Application
            </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                    <form onSubmit={onSubmit} className="md:col-span-2 space-y-8">
                        {/* Applicant */}
                        <Section title="Applicant Information">
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field label="First Name" required error={touched && !firstName.trim()}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="e.g., Muhammad" />
                                </Field>
                                <Field label="Last Name" required error={touched && !lastName.trim()}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="e.g., Ali" />
                                </Field>
                                <Field label="Passport" required error={touched && !passportValid}
                                       hint={touched && !passportValid ? "6–15 chars, letters/numbers only." : "Use the passport you’ll travel with."}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-rose-600 focus:ring-rose-600"
                                           value={passport} onChange={(e)=>setPassport(e.target.value)} placeholder="e.g., AB1234567" />
                                </Field>
                                <Field label="Email" required error={touched && !emailValid}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="applicant@example.com" />
                                </Field>
                                <Field label="Phone" required error={touched && !phoneValid}>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+92 300 1234567" />
                                </Field>
                                <Field label="Nationality" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={nationality} onChange={(e)=>setNationality(e.target.value)} placeholder="e.g., Pakistan" />
                                </Field>
                            </div>
                        </Section>

                        {/* Study */}
                        <Section title="Study Preferences">
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field label="Single-Entry Visa (Processing City)" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={visaCity} onChange={(e)=>setVisaCity(e.target.value)} placeholder="e.g., Islamabad" />
                                </Field>
                                <Field label="Destination Country" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="e.g., Malaysia" />
                                </Field>
                                <Field label="University" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={university} onChange={(e)=>setUniversity(e.target.value)} placeholder="e.g., Taylor’s University" />
                                </Field>
                                <Field label="Program" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={program} onChange={(e)=>setProgram(e.target.value)} placeholder="e.g., BSc (Hons) Computer Science" />
                                </Field>
                                <Field label="Intake" required>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                                           value={intake} onChange={(e)=>setIntake(e.target.value)} placeholder="e.g., September 2026" />
                                </Field>
                            </div>
                        </Section>

                        {/* Agent */}
                        <Section title="Agent Referral">
                            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                                <Field label="Agent Referral Code" required error={touched && !agentReferralCode.trim()}
                                       hint="Enter the code shared by the counsellor (e.g., TJS-ISB-001)">
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-rose-600 focus:ring-rose-600"
                                           value={agentReferralCode} onChange={(e)=>setAgentReferralCode(e.target.value)} placeholder="TJS-ISB-001" />
                                </Field>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-sm font-medium text-slate-800">Resolved Agent {resolving && <span className="text-xs text-slate-500">…checking</span>}</p>
                                    {agentResolved ? (
                                        <ul className="mt-2 text-sm text-slate-700">
                                            <li><span className="text-slate-500">Name:</span> {agentResolved.name}</li>
                                            <li><span className="text-slate-500">Code:</span> <span className="font-mono">{agentResolved.code}</span></li>
                                            {agentResolved.email && <li><span className="text-slate-500">Email:</span> {agentResolved.email}</li>}
                                            {agentResolved.phone && <li><span className="text-slate-500">Phone:</span> {agentResolved.phone}</li>}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-500">
                                            Enter a valid code to preview agent details.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                The application cannot be submitted without a valid agent referral code. After submission, the agent must approve to initiate the formal process.
                            </p>
                        </Section>

                        {/* Credentials */}
                        {/*<Section title="Applicant Portal Credentials">*/}
                        {/*    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">*/}
                        {/*        <Field label="Username" required hint="You can adjust this before creating.">*/}
                        {/*            <div className="flex gap-2">*/}
                        {/*                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"*/}
                        {/*                       value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="muhammad.ali123" />*/}
                        {/*                <button*/}
                        {/*                    type="button"*/}
                        {/*                    onClick={() => setUsername(genUsername(firstName, lastName))}*/}
                        {/*                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"*/}
                        {/*                >*/}
                        {/*                    Suggest*/}
                        {/*                </button>*/}
                        {/*            </div>*/}
                        {/*        </Field>*/}

                        {/*        <Field label="Password" required hint="Share securely with the applicant after agent approval.">*/}
                        {/*            <div className="flex gap-2">*/}
                        {/*                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"*/}
                        {/*                       value={password} onChange={(e)=>setPassword(e.target.value)} />*/}
                        {/*                <button*/}
                        {/*                    type="button"*/}
                        {/*                    onClick={() => setPassword(genPassword())}*/}
                        {/*                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"*/}
                        {/*                >*/}
                        {/*                    Generate*/}
                        {/*                </button>*/}
                        {/*            </div>*/}
                        {/*        </Field>*/}
                        {/*    </div>*/}
                        {/*</Section>*/}

                        {/* Actions */}
                        {errorMsg && <p className="text-sm text-rose-700">{errorMsg}</p>}
                        {!allValid && touched && (
                            <p className="text-sm text-amber-700">
                                Please complete all required fields and ensure email/phone/passport are valid.
                            </p>
                        )}

                        <div className="flex items-start justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="rounded-lg bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                            >
                                {pending ? "Creating…" : "Create Application"}
                            </button>
                        </div>
                    </form>

                    {/* Live Summary */}
                    <aside className="md:col-span-1">
                        <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-semibold text-slate-900">Application Summary</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li><span className="text-slate-500">Applicant:</span> {firstName || "—"} {lastName || ""}</li>
                                <li><span className="text-slate-500">Email:</span> {email || "—"}</li>
                                <li><span className="text-slate-500">Phone:</span> {phone || "—"}</li>
                                <li><span className="text-slate-500">Passport:</span> {passport || "—"}</li>
                                <li><span className="text-slate-500">Nationality:</span> {nationality || "—"}</li>
                                <li><span className="text-slate-500">Visa City:</span> {visaCity || "—"}</li>
                                <li><span className="text-slate-500">Country:</span> {country || "—"}</li>
                                <li><span className="text-slate-500">University:</span> {university || "—"}</li>
                                <li><span className="text-slate-500">Program:</span> {program || "—"}</li>
                                <li><span className="text-slate-500">Intake:</span> {intake || "—"}</li>
                                <li><span className="text-slate-500">Agent Code:</span> <span className="font-mono">{agentReferralCode || "—"}</span></li>
                                {/*<li><span className="text-slate-500">Portal Username:</span> {username || "—"}</li>*/}
                            </ul>
                            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                After submission, the agent will get an email to approve. The applicant receives a receipt email.
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Success Modal */}
            {createdId && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900">Application Created</h3>
                        <p className="mt-2 text-sm text-slate-700">
                            The application has been created successfully. Emails have been sent to the agent and applicant.
                        </p>
                        <ul className="mt-3 space-y-1 text-sm text-slate-700">
                            <li><span className="text-slate-500">ID:</span> <span className="font-mono">{createdId}</span></li>
                            <li><span className="text-slate-500">Applicant:</span> {firstName} {lastName}</li>
                            <li><span className="text-slate-500">University:</span> {university}</li>
                            <li><span className="text-slate-500">Program:</span> {program}</li>
                            <li><span className="text-slate-500">Intake:</span> {intake}</li>
                        </ul>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => router.replace(`${createdId}`)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                View Application
                            </button>
                            <button
                                onClick={() => { setCreatedId(null); resetForm(); }}
                                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* -------------- small UI bits -------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
            {children}
        </section>
    );
}
function Field({
                   label, children, required, hint, error,
               }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; error?: boolean; }) {
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
