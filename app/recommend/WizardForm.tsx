"use client";

import { useState, useActionState, useTransition, useEffect } from "react";
import { analyze } from "./actions";
import { LoaderOverlay } from "./LoaderOverlay";
import { ReportView } from "../report/[id]/ReportView";
import { useRouter, useSearchParams } from "next/navigation";

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
    const [files, setFiles] = useState<File[]>([]);

    const router = useRouter();

    const current = QUESTIONS[step];
    const progress = ((step + 1) / QUESTIONS.length) * 100;

    useEffect(() => {
        const s = state as any;
        if (state?.ok && s?.id) {
            router.push(`/report/${s.id}`);
        }
    }, [state, router]);

    function handleNext() {
        if (step < QUESTIONS.length - 1) setStep(step + 1);
        else handleSubmit();
    }

    function handleBack() {
        if (step > 0) setStep(step - 1);
    }

    function handleAnswer(key: string, value: any) {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const list = e.target.files ? Array.from(e.target.files) : [];
        setFiles(list);
    }

    function handleSubmit() {
        const fd = new FormData();
        for (const [k, v] of Object.entries(answers)) {
            if (Array.isArray(v)) v.forEach((val) => fd.append(k, val));
            else fd.append(k, v ?? "");
        }
        files.forEach((f) => fd.append("marksheets", f));

        startTransition(() => formAction(fd));
    }

    const estimatedSeconds =
        files.length > 0
            ? Math.min(30 + files.reduce((a, f) => a + f.size / 1000000, 0) * 5, 90)
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
                <button
                    disabled={step === 0}
                    onClick={handleBack}
                    className="rounded-md border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-40"
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="rounded-md bg-rose-700 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                >
                    {step === QUESTIONS.length - 1 ? "Generate Report" : "Next"}
                </button>
            </div>
        </div>
    );
}
