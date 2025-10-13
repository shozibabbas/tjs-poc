"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { jsPDF } from "jspdf";

export function ReportView({ markdown }: { markdown: string }) {
    const components = useMemo(
        () => ({
            h1: (props: any) => (
                <h1
                    {...props}
                    className="mb-4 mt-2 text-3xl font-extrabold leading-tight text-rose-800"
                />
            ),
            h2: (props: any) => (
                <h2
                    {...props}
                    className="mb-3 mt-8 border-b border-rose-100 pb-1 text-2xl font-bold text-rose-700"
                />
            ),
            h3: (props: any) => (
                <h3
                    {...props}
                    className="mb-2 mt-6 text-xl font-semibold text-slate-900"
                />
            ),
            p: (props: any) => (
                <p {...props} className="mb-4 leading-relaxed text-slate-700" />
            ),
            ul: (props: any) => <ul {...props} className="mb-4 ml-5 list-disc space-y-2 text-slate-700" />,
            ol: (props: any) => <ol {...props} className="mb-4 ml-5 list-decimal space-y-2 text-slate-700" />,
            li: (props: any) => <li {...props} className="leading-relaxed" />,
            blockquote: (props: any) => (
                <blockquote
                    {...props}
                    className="my-5 border-l-4 border-rose-300 bg-rose-50/60 px-4 py-3 italic text-slate-700"
                />
            ),
            table: (props: any) => (
                <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200">
                    <table {...props} className="w-full border-collapse text-sm" />
                </div>
            ),
            thead: (props: any) => (
                <thead {...props} className="bg-slate-50 text-slate-700" />
            ),
            th: (props: any) => (
                <th
                    {...props}
                    className="border-b border-slate-200 px-3 py-2 text-left font-semibold"
                />
            ),
            td: (props: any) => (
                <td {...props} className="border-t border-slate-200 px-3 py-2 align-top" />
            ),
            hr: (props: any) => <hr {...props} className="my-8 border-rose-200/60" />,
            a: (props: any) => (
                <a
                    {...props}
                    className="font-medium text-rose-700 underline underline-offset-2 hover:text-rose-800"
                    target="_blank"
                />
            ),
            strong: (props: any) => <strong {...props} className="text-slate-900" />,
            em: (props: any) => <em {...props} className="text-slate-700" />,
        }),
        []
    );

    function exportPDF() {
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const el = document.getElementById("report-shell");
        if (!el) return;
        doc.html(el, {
            callback: (d) => d.save("TJS-StudySteps-Report.pdf"),
            x: 24,
            y: 24,
            width: 547, // 595pt page width - ~2*24pt margins
            windowWidth: 1024,
        });
    }

    return (
        <div className="relative">
            {/* Brand header */}
            <div className="mx-auto mb-4 max-w-4xl rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white px-6 py-4">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-rose-600">TJS StudySteps</div>
                        <h1 className="text-xl font-bold text-rose-800">
                            Personalized Programme & University Report
                        </h1>
                    </div>
                    <div className="text-xs text-slate-500">
                        Prepared today • Advisory guide (no guarantees)
                    </div>
                </div>
            </div>

            {/* Report body */}
            <div
                id="report-shell"
                className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl print:shadow-none"
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                        rehypeSlug,
                        [rehypeAutolinkHeadings, { behavior: "wrap" }],
                    ]}
                    components={components}
                >
                    {markdown}
                </ReactMarkdown>

                {/* Disclaimer */}
                <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <strong>Disclaimer:</strong> This report is prepared by <strong>TJS StudySteps</strong> using AI-assisted analysis.
                    It is an advisory tool to help guide your academic decisions. Admission, scholarships, or timelines are not guaranteed.
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                        Print
                    </button>
                    <button
                        onClick={exportPDF}
                        className="rounded-md bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                    >
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Subtle footer brand bar */}
            <div className="mx-auto mt-6 max-w-4xl text-center text-xs text-slate-500 print:hidden">
                © {new Date().getFullYear()} TJS StudySteps • Thriving Journey to Success
            </div>
        </div>
    );
}
