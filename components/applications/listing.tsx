"use client";

import {Usable, use, useEffect, useState} from "react";
import Link from "next/link";
import {useSessionRole} from "@/app/hooks/useSessionRole";
import {ApplicationUpdate, EMGSStatus} from "@prisma/client";

type ApplicationRow = {
    id: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    passport: string;
    university: string;
    program: string;
    intake: string;
    agentApproval: boolean;
    agent?: { id: string; name: string; code: string } | null;
    EMGSLink?: { progressPercentage: string; status: EMGSStatus; applicationUpdates: ApplicationUpdate[] };
};

export default function ApplicationsListing({ params }: { params: Usable<{ agentId: string }> }) {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [rows, setRows] = useState<ApplicationRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const { agentId } = use(params);
    const role = useSessionRole();

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            const qs = new URLSearchParams({
                q,
                page: String(page),
                pageSize: String(pageSize),
                ...(agentId ? { agentId } : {}),
            });
            const res = await fetch(`/api/applications?` + qs.toString(), { cache: "no-store" });
            const data = await res.json();
            if (!ignore) {
                setRows(data.items || []);
                setTotal(data.total || 0);
                setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [q, page, pageSize, agentId]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    /** ---------- helpers.ts ---------- */
    function formatDate(d: string | Date) {
        const dt = new Date(d);
        return dt.toLocaleString(); // tweak to your locale/UI
    }

    function daysBetween(a: Date, b: Date) {
        const ms = Math.abs(a.getTime() - b.getTime());
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    function addDays(d: Date, n: number) {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
    }

    /** Circular progress (SVG) */
    function CircularProgress({
                                  size = 40,
                                  stroke = 5,
                                  value = 0, // 0..100
                                  trackClass = "text-slate-200",
                                  barClass = "text-emerald-600",
                                  label,
                              }: {
        size?: number;
        stroke?: number;
        value: number;
        trackClass?: string;
        barClass?: string;
        label?: string | number;
    }) {
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const pct = Math.max(0, Math.min(100, value));
        const dash = (pct / 100) * c;

        return (
            <div className="relative inline-block" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        strokeWidth={stroke}
                        className={trackClass}
                        fill="none"
                        stroke="currentColor"
                        opacity={0.5}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        strokeWidth={stroke}
                        className={barClass}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${c - dash}`}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-slate-700">
                    {label ?? `${pct}%`}
                </div>
            </div>
        );
    }

    /** Map EMGSLink.status -> color utility */
    function statusColor(status?: string) {
        switch (status) {
            case "SUCCESS":
                return "text-emerald-700";
            case "PENDING":
                return "text-amber-700";
            case "FAILURE":
                return "text-rose-700";
            default:
                return "text-slate-600";
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <div className={"flex flex-row gap-3 items-center"}>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Applications</h2>
                        <p className="text-sm text-slate-600">Review and manage student applications.</p>
                    </div>
                        {/* 🔘 Add New button */}
                        <Link
                            href="applications/new"
                            className="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
                        >
                            + New Application
                        </Link>
                    </div>
                    {agentId && <p className="text-xs text-slate-500 mt-1">Filtered by Agent ID: <span className="font-mono">{agentId}</span></p>}
                </div>
                <input
                    value={q}
                    onChange={(e)=>{ setQ(e.target.value); setPage(1); }}
                    placeholder="Search by name, passport, program…"
                    className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-slate-500"
                />
            </div>

            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                    {loading ? "Loading…" : <>Showing <strong>{total ? (page-1)*pageSize + 1 : 0}</strong>–<strong>{Math.min(page*pageSize, total)}</strong> of <strong>{total}</strong></>}
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Rows:</label>
                    <select className="rounded-md border border-slate-300 px-2 py-1 text-sm" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}}>
                        {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                    <tr>
                        {/*<TH>ID</TH>*/}
                        <TH>Created</TH>
                        <TH>Passport</TH>
                        <TH>Applicant</TH>
                        {/*<TH>University</TH>*/}
                        {/*<TH>Program</TH>*/}
                        {/*<TH>Intake</TH>*/}
                        {role !== "agent" && <TH>Agent</TH>}
                        <TH>Status</TH>
                        <TH>Actions</TH>
                    </tr>
                    </thead>
                    <tbody>
                    {!loading && rows.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No applications found.</td></tr>
                    )}
                    {loading && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                    )}
                    {rows.map((r) => (
                        <tr key={r.id} className="border-top border-slate-100">
                            {/*<TD className="font-mono">{r.id}</TD>*/}
                            <TD>{new Date(r.createdAt).toLocaleDateString()}</TD>
                            <TD>{r.passport}</TD>
                            <TD className="font-medium text-slate-900">{r.firstName} {r.lastName}</TD>
                            {/*<TD>{r.university}</TD>*/}
                            {/*<TD>{r.program}</TD>*/}
                            {/*<TD>{r.intake}</TD>*/}
                            {role !== "agent" && <TD>{r.agent ? `${r.agent.name}` : "—"}</TD>}
                            <TD>
                                {r.EMGSLink ? (
                                    <div className="flex items-center gap-3">
                                        <CircularProgress
                                            value={Number(r.EMGSLink.progressPercentage || 0)}
                                            barClass={
                                                r.EMGSLink.status === "SUCCESS"
                                                    ? "text-emerald-600"
                                                    : r.EMGSLink.status === "PENDING"
                                                        ? "text-amber-600"
                                                        : "text-rose-600"
                                            }
                                            label={`${r.EMGSLink.progressPercentage}%`}
                                        />

                                        <div className="flex flex-col">
        <span className={`text-xs uppercase tracking-wide font-semibold ${statusColor(r.EMGSLink.status)}`}>
          {r.EMGSLink.status || "PENDING"}
        </span>

                                            {/* last update time from applicationUpdates */}
                                            {(() => {
                                                const last = (r.EMGSLink.applicationUpdates || [])
                                                    .slice()
                                                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                                                return last ? (
                                                    <span className="text-xs text-slate-500">
              Last update: {formatDate(last.createdAt)}
            </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No timeline updates yet</span>
                                                );
                                            })()}

                                            {/* Claim messaging for "Application completed" */}
                                            {(() => {
                                                const updates = r.EMGSLink.applicationUpdates || [];
                                                if (updates.length === 1 && updates[0].status === "Application completed") {
                                                    const completedAt = new Date(updates[0].createdAt);
                                                    const now = new Date();
                                                    const elapsed = daysBetween(now, completedAt);
                                                    const claimAt = addDays(completedAt, 14);

                                                    if (elapsed < 14) {
                                                        const remaining = 14 - elapsed;
                                                        return (
                                                            <span className="text-xs text-amber-700 mt-1">
                  Claim will be requested automatically in {remaining} day{remaining === 1 ? "" : "s"} (on{" "}
                                                                {formatDate(claimAt)}).
                </span>
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="text-xs text-emerald-700 mt-1">
                  Claim has been requested.
                </span>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                ) : r.agentApproval ? (
                                    <span className="text-slate-500 font-medium">Waiting for EMGS</span>
                                ) : (
                                    <span className="text-amber-700 font-medium">Agent Approval Pending</span>
                                )}
                            </TD>
                            <TD>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={`applications/${r.id}`}
                                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                        title="View application"
                                    >
                                        View
                                    </Link>
                                    {
                                        !r.agentApproval && (<Link
                                            href={`applications/${r.id}/edit`}
                                            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                                            title="Edit application"
                                        >
                                            Edit
                                        </Link>)
                                    }
                                </div>
                            </TD>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
                <div>Page <strong>{page}</strong> / {totalPages}</div>
                <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />
            </div>
        </div>
    );
}

function TH({ children }: { children: React.ReactNode }) {
    return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{children}</th>;
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 align-top ${className || ""}`}>{children}</td>;
}
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p:number)=>void }) {
    return (
        <div className="ml-2 flex items-center gap-1">
            <button onClick={()=>onPage(1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" disabled={page===1}>«</button>
            <button onClick={()=>onPage(page-1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" disabled={page===1}>‹</button>
            <span className="px-2">Page <strong>{page}</strong> / {totalPages}</span>
            <button onClick={()=>onPage(page+1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" disabled={page===totalPages}>›</button>
            <button onClick={()=>onPage(totalPages)} className="rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" disabled={page===totalPages}>»</button>
        </div>
    );
}
