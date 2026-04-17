"use client";

import { ChangeEvent, useMemo, useState } from "react";

type ProcessSummary = {
    updatedRows: number;
    matchedRows: number;
    untouchedRows: number;
    sheetName: string;
};

export default function EmgsExcelUpdater() {
    const [file, setFile] = useState<File | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [loadingSheets, setLoadingSheets] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<ProcessSummary | null>(null);

    const canProcess = Boolean(file && selectedSheet && !loadingSheets && !processing);
    const fileLabel = useMemo(() => {
        if (!file) return "Upload an .xlsx file";
        return `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
    }, [file]);

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const nextFile = event.target.files?.[0] ?? null;
        setSummary(null);
        setError(null);
        setSheetNames([]);
        setSelectedSheet("");
        setFile(nextFile);

        if (!nextFile) {
            return;
        }

        if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
            setError("Please upload an .xlsx file.");
            return;
        }

        setLoadingSheets(true);

        try {
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const buffer = await nextFile.arrayBuffer();

            await workbook.xlsx.load(buffer);

            const names = workbook.worksheets.map((worksheet) => worksheet.name).filter(Boolean);
            setSheetNames(names);
            setSelectedSheet(names[0] || "");
        } catch {
            setError("Could not read workbook sheets from the uploaded file.");
            setFile(null);
        } finally {
            setLoadingSheets(false);
        }
    }

    async function handleProcess() {
        if (!file || !selectedSheet) {
            return;
        }

        setProcessing(true);
        setError(null);
        setSummary(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("sheetName", selectedSheet);

            const res = await fetch("/api/applications/excel-emgs", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let message = "Failed to process Excel file.";
                try {
                    const payload = await res.json();
                    message = payload?.error || message;
                } catch {
                    // ignore parse failure
                }
                throw new Error(message);
            }

            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") || "";
            const fileNameMatch = disposition.match(/filename="?([^\"]+)"?/i);
            const downloadName = fileNameMatch?.[1] || "emgs-updated.xlsx";

            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(downloadUrl);

            setSummary({
                updatedRows: Number(res.headers.get("X-TJS-Updated-Rows") || 0),
                matchedRows: Number(res.headers.get("X-TJS-Matched-Rows") || 0),
                untouchedRows: Number(res.headers.get("X-TJS-Untouched-Rows") || 0),
                sheetName: res.headers.get("X-TJS-Sheet-Name") || selectedSheet,
            });
        } catch (err: any) {
            setError(err?.message || "Failed to process Excel file.");
        } finally {
            setProcessing(false);
        }
    }

    return (
        <section className="admin-panel-strong rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="admin-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]">
                            Excel EMGS Updater
                        </div>
                        <h2 className="mt-3 text-xl font-semibold text-slate-950">Upload workbook and patch visa percentages</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            Select an XLSX file, choose the worksheet to update, and the system will match <strong>Passport_No</strong> against applications and write EMGS percentages into <strong>Visa_Status</strong>. Other sheets remain untouched.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                        Required columns: <strong className="text-slate-900">Passport_No</strong> and <strong className="text-slate-900">Visa_Status</strong>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-4">
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] bg-gradient-to-br from-amber-50 via-white to-rose-50 px-6 py-10 text-center transition hover:from-amber-100 hover:to-rose-100">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md shadow-slate-200/70">
                                <span className="text-2xl">xlsx</span>
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-900">{fileLabel}</div>
                                <div className="mt-1 text-xs text-slate-500">Choose a workbook to inspect available sheets.</div>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white/85 p-4 shadow-sm">
                        <label className="grid gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Worksheet</span>
                            <select
                                value={selectedSheet}
                                onChange={(event) => setSelectedSheet(event.target.value)}
                                disabled={loadingSheets || sheetNames.length === 0 || processing}
                                className="admin-input rounded-xl px-4 py-3 text-sm"
                            >
                                {sheetNames.length === 0 && <option value="">No sheets loaded yet</option>}
                                {sheetNames.map((sheetName) => (
                                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                                ))}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="admin-kpi rounded-2xl p-4">
                                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Sheets detected</div>
                                <div className="mt-2 text-2xl font-semibold text-slate-950">{sheetNames.length}</div>
                            </div>
                            <div className="admin-kpi rounded-2xl p-4">
                                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Ready state</div>
                                <div className="mt-2 text-sm font-semibold text-slate-950">
                                    {loadingSheets ? "Reading workbook" : canProcess ? "Ready to update" : "Waiting for input"}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleProcess}
                            disabled={!canProcess}
                            className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? "Processing workbook..." : "Update workbook and download"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                {summary && (
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="admin-kpi rounded-2xl p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Sheet updated</div>
                            <div className="mt-2 text-lg font-semibold text-slate-950">{summary.sheetName}</div>
                        </div>
                        <div className="admin-kpi rounded-2xl p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Rows changed</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.updatedRows}</div>
                        </div>
                        <div className="admin-kpi rounded-2xl p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Passports matched</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.matchedRows}</div>
                        </div>
                        <div className="admin-kpi rounded-2xl p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Rows left untouched</div>
                            <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.untouchedRows}</div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}