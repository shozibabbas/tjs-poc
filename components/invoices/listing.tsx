"use client";

import { useMemo, useState } from "react";

/* ===================== Types & Mock Data (UI only) ===================== */

type InvoiceStatus = "claimed" | "approved" | "rejected" | "paid";

type InvoiceRow = {
    id: string;                 // application id
    passport: string;
    applicant: string;          // "First Last"
    completionDate?: string;    // ISO string (application completion)
    status: InvoiceStatus;
};

// Mock some rows
const MOCK_ROWS: InvoiceRow[] = [
    { id: "cmgr2pzj2001jvjuezqvsuyum", passport: "AJ8527223", applicant: "Ayesha Khan", completionDate: "2025-10-06T00:00:00.000Z", status: "claimed" },
    { id: "cmgq1aa12001jvjudemo00001", passport: "AA1234567", applicant: "Bilal Ahmed", completionDate: "2025-09-28T00:00:00.000Z", status: "approved" },
    { id: "cmgq1aa12001jvjudemo00002", passport: "CN8765432", applicant: "Fatima Saeed", completionDate: "2025-10-01T00:00:00.000Z", status: "rejected" },
    { id: "cmgq1aa12001jvjudemo00003", passport: "PK9081726", applicant: "Usman Ali", completionDate: "2025-09-20T00:00:00.000Z", status: "paid" },
    { id: "cmgq1aa12001jvjudemo00004", passport: "TR1122334", applicant: "Noor Zafar", completionDate: "2025-10-10T00:00:00.000Z", status: "claimed" },
    { id: "cmgq1aa12001jvjudemo00005", passport: "BD9988776", applicant: "Arman Rahman", completionDate: "2025-08-14T00:00:00.000Z", status: "paid" },
    { id: "cmgq1aa12001jvjudemo00006", passport: "IN5566778", applicant: "Priya Sharma", completionDate: "2025-10-12T00:00:00.000Z", status: "approved" },
    { id: "cmgq1aa12001jvjudemo00007", passport: "MY4455667", applicant: "Adam Lee", completionDate: "2025-07-05T00:00:00.000Z", status: "rejected" },
    { id: "cmgq1aa12001jvjudemo00008", passport: "PK4455667", applicant: "Hamza Yousaf", completionDate: "2025-09-30T00:00:00.000Z", status: "paid" },
    { id: "cmgq1aa12001jvjudemo00009", passport: "AE1357913", applicant: "Mariam Al Amiri", completionDate: "2025-10-02T00:00:00.000Z", status: "claimed" },
];

/* ===================== Helpers ===================== */

function formatDate(d?: string) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString();
}

function statusBadgeClass(s: InvoiceStatus) {
    switch (s) {
        case "claimed":
            return "text-amber-700 bg-amber-50 ring-1 ring-amber-200";
        case "approved":
            return "text-sky-700 bg-sky-50 ring-1 ring-sky-200";
        case "rejected":
            return "text-rose-700 bg-rose-50 ring-1 ring-rose-200";
        case "paid":
            return "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200";
    }
}

function Badge({ status }: { status: InvoiceStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(status)}`}>
      {status}
    </span>
    );
}

/* ===================== Page ===================== */

export default function InvoicesListing() {
    // Filters
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"" | InvoiceStatus>("");
    const [from, setFrom] = useState<string>(""); // yyyy-mm-dd
    const [to, setTo] = useState<string>("");     // yyyy-mm-dd

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Derived: filtered rows
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        const passText = (s: string) => s.toLowerCase().includes(q);

        const withinDate = (iso?: string) => {
            if (!iso) return false;
            const t = new Date(iso);
            if (from) {
                const f = new Date(from);
                if (t < new Date(f.getFullYear(), f.getMonth(), f.getDate())) return false;
            }
            if (to) {
                const tt = new Date(to);
                if (t > new Date(tt.getFullYear(), tt.getMonth(), tt.getDate(), 23, 59, 59, 999)) return false;
            }
            return true;
        };

        return MOCK_ROWS.filter((row) => {
            const matchesQuery =
                !q ||
                passText(row.id) ||
                passText(row.passport) ||
                passText(row.applicant);

            const matchesStatus = !status || row.status === status;

            const matchesDate =
                (!from && !to) ? true : withinDate(row.completionDate);

            return matchesQuery && matchesStatus && matchesDate;
        });
    }, [query, status, from, to]);

    // Pagination calc
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Reset page when filters change
    function onFilterChange<T extends Function>(fn: T, ...args: any[]) {
        // @ts-ignore
        fn(...args);
        setPage(1);
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
                    <p className="text-sm text-slate-600">Review claim lifecycle for completed applications.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12">
                    {/* Search */}
                    <label className="md:col-span-4 grid items-start gap-1">
                        <span className="text-xs font-medium text-slate-700">Search</span>
                        <input
                            value={query}
                            onChange={(e) => onFilterChange(setQuery, e.target.value)}
                            placeholder="Search application id, passport, applicant…"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-600 focus:ring-rose-600"
                        />
                    </label>

                    {/* Status */}
                    <label className="md:col-span-2 grid items-start gap-1">
                        <span className="text-xs font-medium text-slate-700">Status</span>
                        <select
                            value={status}
                            onChange={(e) => onFilterChange(setStatus, e.target.value as any)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-rose-600 focus:ring-rose-600"
                        >
                            <option value="">All</option>
                            <option value="claimed">Claimed</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="paid">Paid</option>
                        </select>
                    </label>

                    {/* Date from */}
                    <label className="md:col-span-3 grid items-start gap-1">
                        <span className="text-xs font-medium text-slate-700">Completion From</span>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => onFilterChange(setFrom, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-rose-600 focus:ring-rose-600"
                        />
                    </label>

                    {/* Date to */}
                    <label className="md:col-span-3 grid items-start gap-1">
                        <span className="text-xs font-medium text-slate-700">Completion To</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => onFilterChange(setTo, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-rose-600 focus:ring-rose-600"
                        />
                    </label>
                </div>

                {/* Row + page size + export (UI only) */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">
                        Showing <strong>{total ? (page - 1) * pageSize + 1 : 0}</strong>–<strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Rows</label>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
                        >
                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <Pager page={page} totalPages={totalPages} onPage={setPage} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                    <tr>
                        <TH>Application ID</TH>
                        <TH>Passport</TH>
                        <TH>Applicant</TH>
                        <TH>Application Completion</TH>
                        <TH>Status</TH>
                        <TH className="w-[1%]">
                            &nbsp;
                        </TH>
                    </tr>
                    </thead>
                    <tbody>
                    {current.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                No invoices found. Adjust filters or search terms.
                            </td>
                        </tr>
                    )}

                    {current.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                            <TD className="font-mono">{r.id}</TD>
                            <TD>{r.passport}</TD>
                            <TD className="font-medium text-slate-900">{r.applicant}</TD>
                            <TD>{formatDate(r.completionDate)}</TD>
                            <TD><Badge status={r.status} /></TD>
                            <TD>
                                <div className="flex justify-end gap-2">
                                    <button className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50">View</button>
                                    <button className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50">Download</button>
                                </div>
                            </TD>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Pagination */}
            <div className="flex items-center justify-between text-sm text-slate-600">
                <div>Page <strong>{page}</strong> / {totalPages}</div>
                <Pager page={page} totalPages={totalPages} onPage={setPage} />
            </div>
        </div>
    );
}

/* ===================== Tiny UI bits ===================== */

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className || ""}`}>{children}</th>;
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
