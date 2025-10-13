// lib/reportStore.ts
import crypto from "node:crypto";

type ReportRecord = {
    id: string;
    markdown: string;
    createdAt: number;   // ms
    expiresAt: number;   // ms
};

const TTL_MS = 1000 * 60 * 60 * 48; // 48 hours
const store = new Map<string, ReportRecord>();

function purgeExpired() {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
        if (v.expiresAt <= now) store.delete(k);
    }
}

export function saveReport(markdown: string): string {
    purgeExpired();
    const id = crypto.randomBytes(8).toString("hex"); // short id
    const now = Date.now();
    store.set(id, { id, markdown, createdAt: now, expiresAt: now + TTL_MS });
    return id;
}

export function getReport(id: string): ReportRecord | null {
    purgeExpired();
    const rec = store.get(id);
    if (!rec) return null;
    if (rec.expiresAt <= Date.now()) {
        store.delete(id);
        return null;
    }
    return rec;
}
