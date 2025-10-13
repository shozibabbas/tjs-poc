"use client";

import { useState, useActionState, useTransition, useEffect } from "react";
import { analyze } from "./actions";
import { LoaderOverlay } from "./LoaderOverlay";
import { ReportView } from "../report/[id]/ReportView";
import { useRouter, useSearchParams } from "next/navigation";
import {upload} from "@vercel/blob/client";

const QUESTIONS = [
    {
        key: "marksheets",
        title: "Upload your marksheets",
        desc:
            "We use your real academic documents to extract subject scores and strengths.",
        type: "file",
        accept: ".pdf,image/png,image/jpeg",
        multiple: true,
    },
    {
        key: "stream",
        title: "What fields are you most interested in?",
        type: "checkbox",
        options: [
            "Science / Engineering",
            "Computing / IT",
            "Business / Management",
            "Design / Media",
            "Health / Medicine",
            "Social Sciences",
        ],
    },
    {
        key: "universityType",
        title: "What type of university do you prefer?",
        type: "radio",
        options: ["Research-focused", "Modern Private", "Affordable Public"],
    },
    {
        key: "budgetBand",
        title: "Your annual study budget (approx.)",
        type: "radio",
        options: [
            "Under RM 25,000",
            "RM 25k–40k",
            "RM 40k–60k",
            "Over RM 60k",
        ],
    },
    {
        key: "city",
        title: "Preferred city to study in Malaysia",
        type: "radio",
        options: ["Kuala Lumpur", "Penang", "Johor Bahru", "Any"],
    },
    {
        key: "mobility",
        title: "Are you open to international transfer or dual degree?",
        type: "radio",
        options: ["Yes", "No", "Maybe"],
    },
    {
        key: "postgradIntent",
        title: "Would you like to study further after your bachelor's?",
        type: "radio",
        options: ["Yes", "Maybe", "No"],
    },
    {
        key: "learningStyle",
        title: "How do you prefer to learn?",
        type: "radio",
        options: [
            "Project-based / hands-on",
            "Theory and research",
            "Visual and creative",
            "Group discussion & teamwork",
        ],
    },
    {
        key: "careerOrientation",
        title: "Which type of career suits you more?",
        type: "radio",
        options: [
            "Technical / analytical",
            "People-oriented / managerial",
            "A balanced mix of both",
        ],
    },
    {
        key: "extras",
        title: "Anything else you'd like us to know?",
        desc:
            "You can mention scholarship needs, preferred intakes, or special circumstances.",
        type: "textarea",
    },
];

export function WizardForm() {
    const [state, formAction] = useActionState(analyze, { ok: false, message: "" });
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});

    // local files and uploaded blobs
    const [files, setFiles] = useState<File[]>([]);
    const [blobUrls, setBlobUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const router = useRouter();

    const current = QUESTIONS[step];
    const progress = ((step + 1) / QUESTIONS.length) * 100;

    useEffect(() => {
        const s = state as any;
        if (state?.ok && s?.id) router.push(`/report/${s.id}`);
    }, [state, router]);


    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const list = e.target.files ? Array.from(e.target.files) : [];
        setFiles(list);
        setBlobUrls([]); // reset
    }

    // Upload all selected files to Vercel Blob
    async function uploadAllToBlob() {
        if (!files.length) return;
        setUploading(true);
        setUploadProgress(0);

        const urls: string[] = [];
        let uploadedBytes = 0;
        const totalBytes = files.reduce((a, f) => a + f.size, 0);

        for (const f of files) {
            const res = await upload(f.name, f, {
                access: "public",
                handleUploadUrl: "/api/blob/upload",
                onUploadProgress: ({ loaded: uploaded, total }) => {
                    // Per-file progress; we’ll derive global progress
                    const delta = uploaded - (uploadedBytes % (f.size + 1));
                    uploadedBytes += delta > 0 ? delta : 0;
                    const pct = Math.min(100, Math.round((uploadedBytes / (totalBytes || 1)) * 100));
                    setUploadProgress(pct);
                },
            });
            urls.push(res.url);
        }

        setBlobUrls(urls);
        setUploading(false);
    }

    async function handleNext() {
        if (step === 0) {
            // Step 0 is “Upload marksheets”
            if (!files.length) return;
            await uploadAllToBlob();
            if (!blobUrls.length) {
                // `uploadAllToBlob` sets blobUrls asynchronously, wait one tick
                await new Promise((r) => setTimeout(r, 0));
            }
        }
        if (step < QUESTIONS.length - 1) setStep(step + 1);
        else handleSubmit();
    }

    function handleBack() {
        if (step > 0) setStep(step - 1);
    }

    function handleAnswer(key: string, value: any) {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit() {
        const fd = new FormData();
        for (const [k, v] of Object.entries(answers)) {
            if (Array.isArray(v)) v.forEach((val) => fd.append(k, val));
            else fd.append(k, v ?? "");
        }
        blobUrls.forEach((url) => fd.append("blobUrls", url)); // NEW ✅

        startTransition(() => formAction(fd));
    }

    const estimatedSeconds =
        files.length > 0
            ? Math.min(30 + files.reduce((a, f) => a + f.size / 1_000_000, 0) * 5, 120)
            : 30;

    // Show loader during analyze
    if (isPending) return <LoaderOverlay seconds={estimatedSeconds} />;

    if (state.ok) {
        // Freshly generated — show it (URL stamping handled by useEffect)
        return <ReportView markdown={state.message} />;
    }

    // --- Form UI (unchanged except for tiny details) ---
    return (
        <div className="bg-white shadow-md rounded-2xl p-6">
            <div className="mb-4 h-2 w-full rounded-full bg-rose-100">
                <div className="h-2 rounded-full bg-rose-600 transition-all" style={{ width: `${progress}%` }} />
            </div>

            <h2 className="text-xl font-semibold text-rose-800 mb-2">{current.title}</h2>
            {current.desc && <p className="text-sm text-slate-600 mb-4">{current.desc}</p>}

            <div className="mb-6 space-y-3">
                {current.type === "file" && (
                    <input
                        type="file"
                        accept={current.accept}
                        multiple={current.multiple}
                        onChange={handleFileChange}
                        className="block w-full rounded-lg border p-2"
                        required
                    />
                )}
                {current.type === "checkbox" &&
                    current.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={answers[current.key]?.includes(opt) || false}
                                onChange={(e) => {
                                    const prev = answers[current.key] || [];
                                    const newArr = e.target.checked ? [...prev, opt] : prev.filter((x: string) => x !== opt);
                                    handleAnswer(current.key, newArr);
                                }}
                            />
                            {opt}
                        </label>
                    ))}
                {current.type === "radio" &&
                    current.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name={current.key}
                                value={opt}
                                checked={answers[current.key] === opt}
                                onChange={(e) => handleAnswer(current.key, e.target.value)}
                            />
                            {opt}
                        </label>
                    ))}
                {current.type === "textarea" && (
                    <textarea
                        className="w-full rounded-md border p-2"
                        rows={4}
                        value={answers[current.key] || ""}
                        onChange={(e) => handleAnswer(current.key, e.target.value)}
                        placeholder="Add any extra info you'd like us to consider."
                    />
                )}
            </div>

            <div className="flex justify-between">
                {uploading && <p className="text-sm text-slate-600">Uploading… {uploadProgress}%</p>}
                <button
                    disabled={step === 0}
                    onClick={handleBack}
                    className="rounded-md border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-40"
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={step === 0 && (uploading || !files.length)}
                    className="rounded-md bg-rose-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {step === QUESTIONS.length - 1 ? "Generate Report" : "Next"}
                </button>
            </div>
        </div>
    );
}
