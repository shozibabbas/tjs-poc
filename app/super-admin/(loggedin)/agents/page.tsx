"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AgentRow = {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
    applicationsCount: number;
};

export default function AgentsPage() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<AgentRow[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            const url = `/api/agents?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            if (!ignore) {
                setRows(data.items || []);
                setTotal(data.total || 0);
                setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [q, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.min(page, totalPages);
    useEffect(() => { if (clampedPage !== page) setPage(clampedPage); }, [clampedPage]); // auto-clamp

    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agents</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{total}</div>
                    <div className="mt-1 text-sm text-slate-600">Currently visible with your search filters.</div>
                </div>
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Rows per page</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{pageSize}</div>
                    <div className="mt-1 text-sm text-slate-600">Tune density for review or faster scanning.</div>
                </div>
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Page</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{page}/{totalPages}</div>
                    <div className="mt-1 text-sm text-slate-600">Move through the roster without losing context.</div>
                </div>
            </div>

            {/* Header + Search */}
            <div className="admin-panel-strong flex flex-col items-start justify-between gap-3 rounded-[28px] p-5 md:flex-row md:items-center md:p-6">
                <div className={"flex flex-row gap-3 items-center"}>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Agents</h2>
                        <p className="text-sm text-slate-600">Search, view, and manage all agents.</p>
                    </div>
                    {/* 🔘 Add New Agent button */}
                    <Link
                        href="/super-admin/agents/new"
                        className="inline-flex items-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700"
                    >
                        + New Agent
                    </Link>
                </div>
                <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Search by name, code, or id…"
                    className="admin-input w-full rounded-xl px-4 py-3 text-sm md:w-80"
                />
            </div>

            {/* Controls */}
            <div className="admin-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                    {loading ? "Loading…" : <>Showing <strong>{total ? (page - 1) * pageSize + 1 : 0}</strong>–<strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> agents</>}
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Rows:</label>
                    <select
                        className="admin-input rounded-xl px-3 py-2 text-sm"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                        {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />
                </div>
            </div>
            </div>

            {/* Table */}
            <div className="admin-table-wrap overflow-x-auto rounded-[24px]">
                <table className="min-w-[800px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50/90 text-slate-700">
                    <tr>
                        <TH>Code</TH><TH>Name</TH><TH>Email</TH><TH>Phone</TH><TH>Applications</TH><TH className="text-right">Actions</TH>
                    </tr>
                    </thead>
                    <tbody>
                    {!loading && rows.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No agents found.</td></tr>
                    )}
                    {loading && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                    )}
                    {rows.map((a) => (
                        <tr key={a.id} className="border-t border-slate-100 transition-colors hover:bg-rose-50/30">
                            <TD className="font-mono">{a.code}</TD>
                            <TD className="font-medium text-slate-900">{a.name}</TD>
                            <TD>{a.email}</TD>
                            <TD>{a.phone || "—"}</TD>
                            <TD>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {a.applicationsCount ?? 0}
                  </span>
                            </TD>
                            <TD className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Link href={`/super-admin/applications?agentId=${encodeURIComponent(a.code)}`} className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm hover:bg-slate-50">
                                        View Applications
                                    </Link>
                                    <Link href={`/super-admin/agents/${encodeURIComponent(a.id)}/edit`} className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700">
                                        Edit
                                    </Link>
                                </div>
                            </TD>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Bottom pager */}
            <div className="admin-panel flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-slate-600">
                <div>Page <strong>{page}</strong> / {totalPages}</div>
                <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />
            </div>
        </div>
    );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className || ""}`}>{children}</th>;
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 align-top ${className || ""}`}>{children}</td>;
}
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number)=>void }) {
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
