"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {useSessionRole} from "@/app/hooks/useSessionRole";

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
};

export default function ApplicationsListing() {
    const params = useSearchParams();
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [rows, setRows] = useState<ApplicationRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const agentId = params.get("agentId") || "";
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
                  <span className={r.agentApproval ? "text-emerald-700" : "text-amber-700"}>
                    {r.agentApproval ? "Approved" : "Agent Approval Pending"}
                  </span>
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
                                    <Link
                                        href={`applications/${r.id}/edit`}
                                        className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                                        title="Edit application"
                                    >
                                        Edit
                                    </Link>
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
