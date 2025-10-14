// app/super-admin/agents/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function EditAgentPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const [state, setState] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const res = await fetch(`/api/agents/${id}`, { cache: "no-store" });
            const data = await res.json();
            setState(data);
            setLoading(false);
        })();
    }, [id]);

    if (loading) return <div>Loading…</div>;
    if (!state || state.error) return <div>Not found.</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Edit Agent</h2>
            <div className="grid max-w-xl grid-cols-1 gap-3">
                <label className="text-sm">
                    <span className="text-slate-700">Name</span>
                    <input defaultValue={state.name} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
                {/* Add other fields and a Save button that calls PATCH /api/agents/:id */}
            </div>
        </div>
    );
}
