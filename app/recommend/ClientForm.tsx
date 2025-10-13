"use client";

import React, { useActionState, useState, useTransition } from "react";
import { analyze } from "./actions";
import Link from "next/link";

export function ClientForm() {
    const [state, formAction] = useActionState(analyze, { ok: false, message: "" });
    const [isPending, startTransition] = useTransition();
    const [selected, setSelected] = useState<File[]>([]);
    const [expanded, setExpanded] = useState(true);

    function onFilesChange(files: FileList | null) {
        if (!files) return;
        setSelected(Array.from(files));
    }

    function Select({
                        label,
                        name,
                        children,
                        defaultValue,
                    }: React.PropsWithChildren<{ label: string; name: string; defaultValue?: string }>) {
        return (
            <label className="grid gap-1">
                <span className="text-sm font-medium">{label}</span>
                <select name={name} defaultValue={defaultValue} className="rounded-md border px-3 py-2">
                    {children}
                </select>
            </label>
        );
    }

    function Field(props: { label: string; name: string; placeholder?: string }) {
        return (
            <label className="grid gap-1">
                <span className="text-sm font-medium">{props.label}</span>
                <input className="rounded-md border px-3 py-2" name={props.name} placeholder={props.placeholder} />
            </label>
        );
    }

    return (
        <>
            {/* Intro & formats */}
            <section className="mb-6 rounded-xl border p-4">
                <h2 className="text-lg font-semibold">Start by uploading your marksheets</h2>
                <p className="mt-2 text-sm text-slate-600">
                    We extract your subject-wise scores and board details directly from your documents. This gives you the most
                    accurate <strong>Top 5 programmes & Malaysian universities</strong>.
                </p>

                <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-medium">Common formats we accept (upload one or more):</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>FBISE</strong> SSC/HSSC mark sheets (Islamabad Board)</li>
                        <li><strong>Cambridge</strong> O-Level / A-Level Statement of Results</li>
                        <li><strong>IBCC/HEC Equivalence</strong> certificates for O/A Levels or foreign boards</li>
                        <li>Other BISE boards (e.g., Rawalpindi/Lahore/Karachi)</li>
                    </ul>
                    <p className="text-xs text-slate-500">
                        Clear scans/photos in <strong>PDF / JPG / PNG</strong> work well. If possible, upload both Matric/SSC and
                        Inter/HSSC (or O & A Levels).
                    </p>
                </div>
            </section>

            <form
                action={(fd) => startTransition(() => formAction(fd))}
                className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
                {/* Upload input */}
                <fieldset className="col-span-1 md:col-span-2 grid gap-3 rounded-lg border p-4">
                    <legend className="px-2 text-sm font-semibold">Upload marksheets</legend>
                    <input
                        type="file"
                        name="marksheets"
                        accept=".pdf,image/png,image/jpeg"
                        multiple
                        onChange={(e) => onFilesChange(e.target.files)}
                        className="rounded-md border p-2"
                        required
                    />
                    {selected.length > 0 && (
                        <ul className="text-xs text-slate-600">
                            {selected.map((f) => (
                                <li key={f.name}>
                                    • {f.name} <span className="text-slate-400">({Math.round(f.size / 1024)} KB)</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-slate-500">
                        Why we ask: to read your actual subject scores, attempts and board so eligibility & strengths are computed
                        correctly before recommending programmes.
                    </p>
                </fieldset>

                {/* Preferences & goals only */}
                <fieldset className="col-span-1 grid gap-4 rounded-lg border p-4">
                    <legend className="px-2 text-sm font-semibold">Your Preferences</legend>
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">Preferred Streams</span>
                        {["Science/Engineering", "Computing/IT", "Business/Management", "Design/Media", "Health/Medicine", "Social Sciences"].map(
                            (s) => (
                                <label key={s} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="stream" value={s} /> {s}
                                </label>
                            )
                        )}
                    </div>
                    <Select label="University Type" name="universityType" defaultValue="modern">
                        <option value="research">Research-focused</option>
                        <option value="modern">Modern Private</option>
                        <option value="affordable">Affordable Public</option>
                    </Select>
                    <Select label="Budget / Year" name="budgetBand" defaultValue="25000-40000">
                        <option value="under-25000">Under RM 25,000</option>
                        <option value="25000-40000">RM 25k–40k</option>
                        <option value="40000-60000">RM 40k–60k</option>
                        <option value="over-60000">Over RM 60k</option>
                    </Select>
                    <Select label="Preferred City" name="city" defaultValue="any">
                        <option value="kl">Kuala Lumpur / Selangor</option>
                        <option value="penang">Penang</option>
                        <option value="jb">Johor Bahru</option>
                        <option value="any">Any</option>
                    </Select>
                    <Field label="Target intake (e.g., Sep 2026)" name="intake" placeholder="Feb/Sep YYYY" />
                </fieldset>

                <fieldset className="col-span-1 grid gap-4 rounded-lg border p-4">
                    <legend className="px-2 text-sm font-semibold">Career & Learning</legend>
                    <Select label="International Mobility / Transfer" name="mobility" defaultValue="maybe">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="maybe">Maybe</option>
                    </Select>
                    <Select label="Postgrad Ambition" name="postgradIntent" defaultValue="maybe">
                        <option value="yes">Yes</option>
                        <option value="maybe">Maybe</option>
                        <option value="no">No</option>
                    </Select>
                    <Select label="Learning Style" name="learningStyle" defaultValue="project">
                        <option value="project">Project-based</option>
                        <option value="theory">Theory / research</option>
                        <option value="visual">Visual / creative</option>
                        <option value="discussion">Discussion / teamwork</option>
                    </Select>
                    <Select label="Career Orientation" name="careerOrientation" defaultValue="balanced">
                        <option value="technical">Technical / analytical</option>
                        <option value="managerial">People-oriented / managerial</option>
                        <option value="balanced">Balanced</option>
                    </Select>
                    <Field label="Dream Career" name="dreamCareer" placeholder="e.g., Software Engineer / Data Analyst" />
                    <Field label="Top Priorities" name="topPriorities" placeholder="Reputation, Cost, Employability, Location…" />
                </fieldset>

                <fieldset className="col-span-1 md:col-span-2 grid gap-4 rounded-lg border p-4">
                    <legend className="px-2 text-sm font-semibold">Anything else?</legend>
                    <textarea
                        name="extras"
                        className="min-h-[100px] rounded-md border p-2"
                        placeholder="Scholarship need, constraints, medical/visa notes, etc."
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex w-fit items-center justify-center rounded-md bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800"
                    >
                        {isPending ? "Analyzing…" : "Generate my Top 5"}
                    </button>
                </fieldset>
            </form>

            {state.message && (
                <section className="mt-8 rounded-lg border p-4">
                    <header className="mb-2 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Personalised Recommendation</h2>
                        <button className="text-sm underline" onClick={() => setExpanded((e) => !e)}>
                            {expanded ? "Collapse" : "Expand"}
                        </button>
                    </header>
                    {state.ok ? (
                        <pre className={`whitespace-pre-wrap ${expanded ? "" : "line-clamp-6"} overflow-x-auto`}>
              {state.message}
            </pre>
                    ) : (
                        <p className="text-red-600">{state.message}</p>
                    )}
                </section>
            )}

            <p className="mt-6 text-center text-xs text-slate-500">
                By uploading, you agree we’ll process your documents only to generate recommendations and provide counselling.
                <Link href="/privacy" className="ml-1 underline">Privacy</Link>
            </p>
        </>
    );
}
