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
    country: string;
    agentApproval: boolean;
    agent?: { id: string; name: string; code: string } | null;
    EMGSLink?: { progressPercentage: string; status: EMGSStatus; applicationUpdates: ApplicationUpdate[] };
};

export default function ApplicationsListing({ params }: { params: Usable<{ agentId: string }> }) {
    const FETCH_ALL_BATCH_SIZE = 100;
    const EMGS_REFRESH_CONCURRENCY = 3;

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [showAll, setShowAll] = useState(false);
    const [rows, setRows] = useState<ApplicationRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [emgsRefreshing, setEmgsRefreshing] = useState(false);
    const [emgsTotal, setEmgsTotal] = useState(0);
    const [emgsProcessed, setEmgsProcessed] = useState(0);
    const [emgsSuccesses, setEmgsSuccesses] = useState(0);
    const [emgsFailures, setEmgsFailures] = useState(0);
    const [exportingCsv, setExportingCsv] = useState(false);

    const { agentId } = use(params);
    const role = useSessionRole();

    const totalColumns = role !== "agent" ? 6 : 5;

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            setLoadError(null);

            const buildQs = (nextPage: number, nextPageSize: number) =>
                new URLSearchParams({
                    q,
                    page: String(nextPage),
                    pageSize: String(nextPageSize),
                    ...(agentId ? { agentId } : {}),
                });

            try {
                if (!showAll) {
                    setEmgsRefreshing(false);
                    setEmgsTotal(0);
                    setEmgsProcessed(0);
                    setEmgsSuccesses(0);
                    setEmgsFailures(0);

                    const qs = buildQs(page, pageSize);
                    const res = await fetch(`/api/applications?` + qs.toString(), { cache: "no-store" });
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data?.error || "Failed to load applications.");
                    }

                    if (!ignore) {
                        const nextRows = data.items || [];
                        const nextTotal = data.total || 0;
                        setRows(nextRows);
                        setTotal(nextTotal);
                        setLoadedCount(nextRows.length);
                        setLoading(false);
                    }
                    return;
                }

                setRows([]);
                setLoadedCount(0);
                setTotal(0);
                setEmgsRefreshing(false);
                setEmgsTotal(0);
                setEmgsProcessed(0);
                setEmgsSuccesses(0);
                setEmgsFailures(0);

                const firstQs = buildQs(1, FETCH_ALL_BATCH_SIZE);
                const firstRes = await fetch(`/api/applications?` + firstQs.toString(), { cache: "no-store" });
                const firstData = await firstRes.json();
                if (!firstRes.ok) {
                    throw new Error(firstData?.error || "Failed to load all applications.");
                }

                if (ignore) return;

                const firstItems = Array.isArray(firstData.items) ? firstData.items : [];
                const totalMatches = Number(firstData.total || 0);
                const totalPagesForAll = Math.max(1, Math.ceil(totalMatches / FETCH_ALL_BATCH_SIZE));
                let allItems: ApplicationRow[] = firstItems;

                setRows(firstItems);
                setTotal(totalMatches);
                setLoadedCount(firstItems.length);

                for (let p = 2; p <= totalPagesForAll; p++) {
                    if (ignore) return;

                    const nextQs = buildQs(p, FETCH_ALL_BATCH_SIZE);
                    const nextRes = await fetch(`/api/applications?` + nextQs.toString(), { cache: "no-store" });
                    const nextData = await nextRes.json();
                    if (!nextRes.ok) {
                        throw new Error(nextData?.error || `Failed while loading page ${p}.`);
                    }

                    if (ignore) return;

                    const nextItems = Array.isArray(nextData.items) ? nextData.items : [];
                    allItems = allItems.concat(nextItems);
                    setRows((prev) => prev.concat(nextItems));
                    setLoadedCount((prev) => prev + nextItems.length);
                }

                const malaysiaIds = allItems
                    .filter((item) => (item.country || "").trim().toLowerCase() === "malaysia")
                    .map((item) => item.id);

                setEmgsTotal(malaysiaIds.length);
                setEmgsProcessed(0);
                setEmgsSuccesses(0);
                setEmgsFailures(0);

                if (malaysiaIds.length > 0) {
                    setEmgsRefreshing(true);

                    for (let i = 0; i < malaysiaIds.length; i += EMGS_REFRESH_CONCURRENCY) {
                        if (ignore) return;

                        const chunk = malaysiaIds.slice(i, i + EMGS_REFRESH_CONCURRENCY);
                        await Promise.all(
                            chunk.map(async (id) => {
                                try {
                                    const refreshRes = await fetch(`/api/applications/${id}/emgs/fetch`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                    });

                                    let payload: any = null;
                                    try {
                                        payload = await refreshRes.json();
                                    } catch {
                                        payload = null;
                                    }

                                    if (!refreshRes.ok || payload?.error) {
                                        throw new Error(payload?.error || `Failed to refresh EMGS for ${id}.`);
                                    }

                                    if (!ignore) {
                                        setEmgsSuccesses((prev) => prev + 1);
                                    }
                                } catch {
                                    if (!ignore) {
                                        setEmgsFailures((prev) => prev + 1);
                                    }
                                } finally {
                                    if (!ignore) {
                                        // Increment after each student so the bar advances smoothly.
                                        setEmgsProcessed((prev) => prev + 1);
                                    }
                                }
                            })
                        );
                    }

                    const refreshAllQs = new URLSearchParams({
                        q,
                        page: "1",
                        pageSize: String(FETCH_ALL_BATCH_SIZE),
                        all: "1",
                        ...(agentId ? { agentId } : {}),
                    });

                    const refreshAllRes = await fetch(`/api/applications?` + refreshAllQs.toString(), { cache: "no-store" });
                    const refreshAllData = await refreshAllRes.json();

                    if (!refreshAllRes.ok) {
                        throw new Error(refreshAllData?.error || "EMGS refresh completed, but failed to reload refreshed rows.");
                    }

                    if (!ignore) {
                        const refreshedRows = Array.isArray(refreshAllData.items) ? refreshAllData.items : [];
                        setRows(refreshedRows);
                        setTotal(Number(refreshAllData.total || 0));
                        setLoadedCount(refreshedRows.length);
                    }

                    if (!ignore) {
                        setEmgsRefreshing(false);
                    }
                }

                if (!ignore) {
                    setLoading(false);
                }
            } catch (err: any) {
                if (!ignore) {
                    setLoadError(err?.message || "Something went wrong while loading applications.");
                    setEmgsRefreshing(false);
                    setLoading(false);
                }
            }
        })();
        return () => { ignore = true; };
    }, [q, page, pageSize, agentId, showAll]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const remainingCount = Math.max(0, total - loadedCount);
    const progressPct = total > 0 ? Math.min(100, Math.round((loadedCount / total) * 100)) : 0;
    const emgsRemaining = Math.max(0, emgsTotal - emgsProcessed);
    const emgsProgressPct = emgsTotal > 0 ? Math.min(100, Math.round((emgsProcessed / emgsTotal) * 100)) : 0;

    async function handleExportCsv() {
        setExportingCsv(true);
        setLoadError(null);

        try {
            const qs = new URLSearchParams({
                q,
                page: "1",
                pageSize: String(FETCH_ALL_BATCH_SIZE),
                all: "1",
                ...(agentId ? { agentId } : {}),
            });

            const res = await fetch(`/api/applications?${qs.toString()}`, { cache: "no-store" });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to export CSV.");
            }

            const items: ApplicationRow[] = Array.isArray(data.items) ? data.items : [];

            const toCsvCell = (value: unknown) => {
                const str = String(value ?? "");
                if (/[",\n]/.test(str)) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const headers = [
                "ID",
                "Created At",
                "Passport",
                "First Name",
                "Last Name",
                "Country",
                "University",
                "Program",
                "Intake",
                "Agent",
                "EMGS Status",
                "EMGS Percentage",
                "EMGS Last Update",
            ];

            const lines = items.map((r) => {
                const emgsStatus = r.EMGSLink
                    ? r.EMGSLink.status
                    : r.agentApproval
                        ? "WAITING_FOR_EMGS"
                        : "AGENT_APPROVAL_PENDING";
                const emgsPercentage = r.EMGSLink ? `${r.EMGSLink.progressPercentage || "0"}%` : "";
                const emgsLastUpdate = r.EMGSLink?.applicationUpdates?.[0]?.createdAt
                    ? formatDate(r.EMGSLink.applicationUpdates[0].createdAt)
                    : "";

                return [
                    r.id,
                    formatDate(r.createdAt),
                    r.passport,
                    r.firstName,
                    r.lastName,
                    r.country,
                    r.university,
                    r.program,
                    r.intake,
                    r.agent?.name || "",
                    emgsStatus,
                    emgsPercentage,
                    emgsLastUpdate,
                ]
                    .map(toCsvCell)
                    .join(",");
            });

            const csvContent = [headers.join(","), ...lines].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");

            link.href = downloadUrl;
            link.download = `students-export-${stamp}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch (err: any) {
            setLoadError(err?.message || "Failed to export CSV.");
        } finally {
            setExportingCsv(false);
        }
    }

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
            <div className="grid gap-3 md:grid-cols-3">
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Visible records</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{total}</div>
                    <div className="mt-1 text-sm text-slate-600">Applications matching the current filters.</div>
                </div>
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Malaysia EMGS queue</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{emgsTotal}</div>
                    <div className="mt-1 text-sm text-slate-600">Students eligible for live EMGS refresh.</div>
                </div>
                <div className="admin-kpi rounded-2xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current mode</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{showAll ? "Live sweep" : "Paged"}</div>
                    <div className="mt-1 text-sm text-slate-600">Switch between focused review and full refresh runs.</div>
                </div>
            </div>

            <div className="admin-panel-strong rounded-[28px] p-5 md:p-6">
                <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <div className={"flex flex-row gap-3 items-center"}>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Applications</h2>
                        <p className="text-sm text-slate-600">Review, refresh, export, and manage student application status from one screen.</p>
                    </div>
                        {/* 🔘 Add New button */}
                        <Link
                            href="applications/new"
                            className="inline-flex items-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700"
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
                    className="admin-input w-full rounded-xl px-4 py-3 text-sm md:w-80"
                />
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-600">
                    {loading ? (showAll
                            ? <>Loaded <strong>{loadedCount}</strong> of <strong>{total}</strong> • <strong>{remainingCount}</strong> remaining</>
                            : "Loading…")
                        : emgsRefreshing
                            ? <>EMGS updated <strong>{emgsProcessed}</strong> of <strong>{emgsTotal}</strong> Malaysian students • <strong>{emgsRemaining}</strong> remaining</>
                        : showAll
                        ? <>Showing <strong>{rows.length}</strong> of <strong>{total}</strong> (all loaded)</>
                        : <>Showing <strong>{total ? (page-1)*pageSize + 1 : 0}</strong>–<strong>{Math.min(page*pageSize, total)}</strong> of <strong>{total}</strong></>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setShowAll((v) => !v);
                            setPage(1);
                        }}
                        disabled={loading || emgsRefreshing}
                        className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {showAll ? "Back to Pages" : "Fetch All Students"}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={loading || emgsRefreshing || exportingCsv}
                        className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {exportingCsv ? "Exporting CSV..." : "Export CSV"}
                    </button>
                    <label className="text-sm text-slate-600">Rows:</label>
                    <select className="admin-input rounded-xl px-3 py-2 text-sm disabled:opacity-60" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}} disabled={showAll}>
                        {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {!showAll && <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />}
                </div>
            </div>
            </div>

            {showAll && (
                <div className="admin-panel-strong rounded-[24px] p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>{loading ? "Step 1/2: Fetching all students" : emgsRefreshing ? "Step 2/2: Refreshing EMGS status (Malaysia only)" : "Fetch and EMGS refresh complete"}</span>
                        <span>
                            {emgsTotal > 0 && !loading ? `${emgsProcessed}/${emgsTotal} EMGS refreshed` : `${loadedCount}/${total} loaded`}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full bg-rose-700 transition-[width] duration-500 ease-out"
                            style={{ width: `${loading ? progressPct : emgsRefreshing ? emgsProgressPct : 100}%` }}
                        />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                        <div className="rounded-md bg-slate-50 px-2 py-1">
                            Students loaded: <strong>{loadedCount}</strong>
                        </div>
                        <div className="rounded-md bg-slate-50 px-2 py-1">
                            EMGS updated: <strong>{emgsProcessed}</strong>
                        </div>
                        <div className="rounded-md bg-slate-50 px-2 py-1">
                            Remaining: <strong>{loading ? remainingCount : emgsRemaining}</strong>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {loading
                            ? `${remainingCount} records remaining to load`
                            : emgsRefreshing
                                ? `${emgsRemaining} Malaysian student records remaining for EMGS refresh`
                                : emgsTotal > 0
                                    ? `EMGS refresh done: ${emgsSuccesses} successful, ${emgsFailures} failed.`
                                    : "No Malaysia destination students found for EMGS refresh."}
                    </div>
                </div>
            )}

            {loadError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {loadError}
                </div>
            )}

            <div className="admin-table-wrap overflow-x-auto rounded-[24px]">
                <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50/90 text-slate-700">
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
                        <tr><td colSpan={totalColumns} className="px-4 py-12 text-center text-slate-500">No applications found.</td></tr>
                    )}
                    {loading && (
                        <tr><td colSpan={totalColumns} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                    )}
                    {rows.map((r) => (
                        <tr key={r.id} className="border-top border-slate-100/90 transition-colors hover:bg-rose-50/30">
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

                                            {r.EMGSLink?.applicationUpdates?.[0]?.createdAt ? (
                                                <span className="text-xs text-slate-500">
                                                    Last update: {formatDate(r.EMGSLink.applicationUpdates[0].createdAt)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">No timeline updates yet</span>
                                            )}

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
                                                            <span className="mt-1 text-xs text-amber-700">
                                                                Claim will be requested automatically in {remaining} day{remaining === 1 ? "" : "s"} (on {formatDate(claimAt)}).
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <span className="mt-1 text-xs text-emerald-700">
                                                            Claim has been requested.
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                ) : r.agentApproval ? (
                                    <span className="font-medium text-slate-500">Waiting for EMGS</span>
                                ) : (
                                    <span className="font-medium text-amber-700">Agent Approval Pending</span>
                                )}
                            </TD>
                            <TD>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={`applications/${r.id}`}
                                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                        title="View application"
                                    >
                                        View
                                    </Link>
                                    {
                                        !r.agentApproval && (<Link
                                            href={`applications/${r.id}/edit`}
                                            className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700"
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

            <div className="admin-panel rounded-2xl flex items-center justify-between px-4 py-3 text-sm text-slate-600">
                {showAll ? (
                    <div>
                        {loading
                            ? `Loading all records: ${loadedCount}/${total}`
                            : emgsRefreshing
                                ? `Refreshing EMGS: ${emgsProcessed}/${emgsTotal}`
                                : "All matching records loaded"}
                    </div>
                ) : (
                    <>
                        <div>Page <strong>{page}</strong> / {totalPages}</div>
                        <Pager page={page} totalPages={totalPages} onPage={(p)=>setPage(p)} />
                    </>
                )}
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
