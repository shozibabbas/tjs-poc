"use client";

import ApplicationsListing from "@/components/applications/listing";
import EmgsExcelUpdater from "@/components/applications/emgs-excel-updater";
import { JSX, Usable, useEffect, useState } from "react";

export default function ApplicationsPage(props: JSX.IntrinsicAttributes & { params: Usable<{ agentId: string; }>; }) {
    const [openExcelModal, setOpenExcelModal] = useState(false);

    useEffect(() => {
        if (!openExcelModal) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenExcelModal(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [openExcelModal]);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setOpenExcelModal(true)}
                    className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-200/70 hover:from-rose-800 hover:to-rose-700"
                >
                    Open Excel EMGS Updater
                </button>
            </div>

            <ApplicationsListing {...props} />

            {openExcelModal && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Excel EMGS Updater"
                    onClick={() => setOpenExcelModal(false)}
                >
                    <div
                        className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setOpenExcelModal(false)}
                            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                            aria-label="Close Excel updater"
                        >
                            x
                        </button>
                        <EmgsExcelUpdater />
                    </div>
                </div>
            )}
        </div>
    )
}
