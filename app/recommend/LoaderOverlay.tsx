"use client";

import { useEffect, useState } from "react";

export function LoaderOverlay({ seconds }: { seconds: number }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const pct = Math.min((elapsed / seconds) * 100, 100);
    const messages = [
        "Reading your marksheets securely...",
        "Analyzing subjects and strengths...",
        "Matching best programmes...",
        "Comparing universities...",
        "Preparing your personalized report...",
    ];
    const msg = messages[Math.min(Math.floor((pct / 100) * messages.length), messages.length - 1)];

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm text-center">
            <div className="w-64 h-64 border-[6px] border-rose-200 border-t-rose-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold text-rose-800 mb-2">{msg}</h2>
            <p className="text-sm text-slate-600 mb-4">
                This may take around {Math.ceil(seconds / 10) * 10} seconds depending on your documents.
            </p>
            <div className="w-2/3 h-2 bg-rose-100 rounded-full overflow-hidden">
                <div className="h-2 bg-rose-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
