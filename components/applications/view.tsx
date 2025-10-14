"use client";

import {Usable, use, useEffect, useMemo, useState} from "react";
import { useRouter } from "next/navigation";

type Agent = { id: string; name: string; code: string; email?: string | null; phone?: string | null };
type ApplicationUpdate = { id: string; status: string; remark?: string | null; createdAt: string };
type ApplicationIssue = { id: string; issue: string; status: string; comment?: string | null; reportedAt: string };
type EMGSLink = {
    id: string;
    progressPercentage: string; // e.g., "42"
    progressRemark: string;
    createdAt: string;
    updatedAt: string;
    applicationUpdates: ApplicationUpdate[];
    applicationIssues: ApplicationIssue[];
};

type Application = {
    id: string;
    createdAt: string;
    updatedAt: string;

    // Applicant identity
    firstName: string;
    lastName: string;
    passport: string;
    email: string;
    phone: string;

    // Study & preferences
    nationality: string;
    visaCity: string;
    country: string;
    university: string;
    program: string;
    intake: string;

    // Agent
    agentReferralCode: string;
    agentApproval: boolean;
    agent: Agent | null;

    // EMGS
    emgs: EMGSLink | null;
};

function useApplication(appId: string) {
    const [data, setData] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    async function refresh() {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/applications/${appId}/view`, { cache: "no-store" });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.error || "Failed to load application");
            setData(j as Application);
        } catch (e: any) {
            setErr(e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, [appId]);

    return { data, loading, err, refresh };
}

export default function ApplicationView({ params }: { params: Usable<{ id: string }> }) {
    const router = useRouter();

    const { id } = use(params);
    const appId = id;

    const { data: app, loading, err, refresh } = useApplication(appId);
    const [emgsFetching, setEmgsFetching] = useState(false);
    const [tab, setTab] = useState<"overview"|"details"|"updates"|"issues">("overview");
    const hasEMGS = !!app?.emgs;

    useEffect(() => {
        // If tab is updates/issues but EMGS is not available, bounce to overview
        if (app && !app.emgs && (tab === "updates" || tab === "issues")) {
            setTab("overview");
        }
    }, [app, tab]);

    async function fetchEMGS() {
        try {
            if (emgsFetching) return;
            setEmgsFetching(true);
            // Trigger EMGS fetch
            const res = await fetch(`/api/applications/${appId}/emgs/fetch`, { method: "POST" });
            const j = await res.json();
            setEmgsFetching(false);
            if (!res.ok) throw new Error(j?.error || "Failed to fetch EMGS data");
            // Re-fetch details
            await refresh();
        } catch (e: any) {
            alert(e?.message || "Failed to start EMGS fetch");
        }
    }

    if(emgsFetching) return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Fetching EMGS data…</div>
    )

    return (
        <div className="space-y-5">
            {/* Header */}
            <header className="flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Application</h2>
                    <p className="text-sm text-slate-600">View the status, details, and EMGS information.</p>
                </div>
                <div className={"gap-2 flex"}>
                    <button
                        onClick={() => router.push(`${id}/edit`)}
                        className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Back to list
                    </button>
                </div>
            </header>

            {/* Loading / Error */}
            {(loading) && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading…</div>}
            {err && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {err}
                </div>
            )}

            {app && (
                <div className="space-y-4">
                    {/* If EMGS available: beautiful progress header */}
                    {app.emgs ? <ProgressHeader emgs={app.emgs} onFetchEMGS={fetchEMGS} /> : null}

                    {/* Tabs */}
                    <nav className="flex flex-wrap gap-2">
                        <TabButton active={tab==="overview"} onClick={()=>setTab("overview")}>Overview</TabButton>
                        <TabButton active={tab==="details"} onClick={()=>setTab("details")}>Application Details</TabButton>
                        {hasEMGS && <TabButton active={tab==="updates"} onClick={()=>setTab("updates")}>Updates</TabButton>}
                        {hasEMGS && <TabButton active={tab==="issues"} onClick={()=>setTab("issues")}>Issues</TabButton>}
                    </nav>

                    {/* Tab Panels */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        {tab === "overview" && <OverviewTab app={app} onFetchEMGS={fetchEMGS} hasEMGS={hasEMGS} />}
                        {tab === "details" && <DetailsTab app={app} />}
                        {tab === "updates" && app.emgs && <UpdatesTab updates={app.emgs.applicationUpdates} />}
                        {tab === "issues" && app.emgs && <IssuesTab issues={app.emgs.applicationIssues} />}
                    </div>
                </div>
            )}
        </div>
    );
}

/* --------------------------- Tabs --------------------------- */

function OverviewTab({ app, hasEMGS, onFetchEMGS }: { app: Application; hasEMGS: boolean; onFetchEMGS: () => Promise<void> }) {
    const left = (
        <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Summary</h3>
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                <Stat label="Applicant" value={`${app.firstName} ${app.lastName}`} />
                <Stat label="Passport" value={app.passport} mono />
                <Stat label="University" value={app.university} />
                <Stat label="Program" value={app.program} />
                <Stat label="Intake" value={app.intake} />
                <Stat label="Destination" value={app.country} />
                <Stat label="Visa City" value={app.visaCity} />
                <Stat label="Agent Approval" value={app.agentApproval ? "Approved" : "Pending"} badge={app.agentApproval ? "green" : "amber"} />
                <Stat label="Agent Code" value={app.agentReferralCode} mono />
                <Stat label="Agent" value={app.agent ? `${app.agent.name} (${app.agent.code})` : "—"} />
            </div>
        </div>
    );

    const right = (
        <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Contact</h3>
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                <Stat label="Email" value={app.email} />
                <Stat label="Phone" value={app.phone} />
                <Stat label="Nationality" value={app.nationality} />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            {left}
            {right}

            {!hasEMGS && app.country.toLowerCase() === "malaysia" && (
                <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="font-semibold text-amber-900">EMGS Data Not Found</h4>
                    <p className="mt-1 text-sm text-amber-900/80">
                        This application is for Malaysia, but no EMGS record is linked yet. You can fetch the latest EMGS progress
                        for this application.
                    </p>
                    <button
                        onClick={onFetchEMGS}
                        className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                    >
                        Fetch EMGS Data
                    </button>
                </div>
            )}
        </div>
    );
}

function DetailsTab({ app }: { app: Application }) {
    return (
        <div className="space-y-6">
            <h3 className="text-base font-semibold text-slate-900">All Application Fields</h3>
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                {/* Identity */}
                <Card title="Applicant Identity">
                    <KV k="First Name" v={app.firstName} />
                    <KV k="Last Name" v={app.lastName} />
                    <KV k="Passport" v={app.passport} mono />
                    <KV k="Email" v={app.email} />
                    <KV k="Phone" v={app.phone} />
                </Card>

                {/* Study */}
                <Card title="Study & Preferences">
                    <KV k="Nationality" v={app.nationality} />
                    <KV k="Visa City" v={app.visaCity} />
                    <KV k="Country" v={app.country} />
                    <KV k="University" v={app.university} />
                    <KV k="Program" v={app.program} />
                    <KV k="Intake" v={app.intake} />
                </Card>

                {/* Agent */}
                <Card title="Agent Referral & Approval">
                    <KV k="Agent Referral Code" v={app.agentReferralCode} mono />
                    <KV k="Agent Approval" v={app.agentApproval ? "Approved" : "Pending"} />
                    <KV k="Agent" v={app.agent ? `${app.agent.name} (${app.agent.code})` : "—"} />
                </Card>

                {/* System */}
                <Card title="System">
                    <KV k="Application ID" v={app.id} mono />
                    <KV k="Created At" v={new Date(app.createdAt).toLocaleString()} />
                    <KV k="Updated At" v={new Date(app.updatedAt).toLocaleString()} />
                </Card>
            </div>
        </div>
    );
}

function UpdatesTab({ updates }: { updates: ApplicationUpdate[] }) {
    if (!updates?.length) {
        return <EmptyState msg="No updates recorded yet." />;
    }
    return (
        <div className="space-y-4">
            {updates.map(u => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{u.status}</span>
                        <span className="text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                    {u.remark && <p className="mt-2 text-sm text-slate-700">{u.remark}</p>}
                </div>
            ))}
        </div>
    );
}

function IssuesTab({ issues }: { issues: ApplicationIssue[] }) {
    if (!issues?.length) {
        return <EmptyState msg="No issues reported." />;
    }
    return (
        <div className="space-y-4">
            <table
                className="w-full table-auto border-collapse"
            >
                <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-700">
                    <th className="px-4 py-2">Reported At</th>
                    <th className="px-4 py-2">Issue</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Comment</th>
                </tr>
                </thead>
                <tbody>
                {issues.map(i => (
                    <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 align-top text-sm text-slate-500">{new Date(i.reportedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 align-top text-sm text-slate-900">{i.issue}</td>
                        <td className="px-4 py-2 align-top">
                            <span
                                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ${
                                    i.status.toLowerCase() === "resolved"
                                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                        : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                                }`}
                            >
                                {i.status}
                            </span>
                        </td>
                        <td className="px-4 py-2 align-top text-sm text-slate-700">{i.comment || "—"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

/* --------------------- Pretty progress header --------------------- */

function ProgressHeader({ emgs, onFetchEMGS }: { emgs: EMGSLink; onFetchEMGS: () => void }) {
    const pct = Math.max(0, Math.min(100, parseInt(emgs.progressPercentage || "0", 10) || 0));

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50 to-white p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-center">
                <div className="md:col-span-2">
                    <h3 className="text-base font-semibold text-slate-900">EMGS Progress</h3>
                    <p className="mt-1 text-sm text-slate-700">{emgs.progressRemark || "—"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                        Last updated: {new Date(emgs.updatedAt).toLocaleString()}
                    </p>
                    <button
                        onClick={onFetchEMGS}
                        className="mt-3 rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-800"
                    >
                        Fetch EMGS Data
                    </button>
                </div>
                <div className="flex items-center justify-center">
                    <div className="relative h-28 w-28">
                        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                            <circle
                                cx="50"
                                cy="50"
                                r="42"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset={`${(1 - pct / 100) * 2 * Math.PI * 42}`}
                                className="text-rose-700 transition-[stroke-dashoffset] duration-700 ease-out"
                                fill="none"
                            />
                        </svg>
                        <div className="absolute inset-0 grid place-items-center">
                            <span className="text-xl font-semibold text-slate-900">{pct}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --------------------- Small UI helpers --------------------- */

function TabButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-lg px-3 py-1.5 text-sm ${
                active ? "bg-rose-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
        >
            {children}
        </button>
    );
}

function Stat({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: "green" | "amber" }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{label}</div>
            {badge ? (
                <span
                    className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ${
                        badge === "green"
                            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                    }`}
                >
          {value}
        </span>
            ) : (
                <div className={`mt-1 text-sm ${mono ? "font-mono" : "font-medium"} text-slate-900`}>{value || "—"}</div>
            )}
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
            <div className="grid grid-cols-1 gap-2">{children}</div>
        </div>
    );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[160px_1fr] items-start gap-2">
            <div className="text-xs text-slate-500">{k}</div>
            <div className={`text-sm ${mono ? "font-mono" : "font-medium"} text-slate-900`}>{v || "—"}</div>
        </div>
    );
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            {msg}
        </div>
    );
}
