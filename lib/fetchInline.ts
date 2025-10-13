// lib/fetchInline.ts
import sharp from "sharp";

export type InlineResult = { type: "image" | "pdf"; dataUrl?: string; url?: string; name?: string };

const MAX_DIM = 2000; // px
const JPEG_QUALITY = 80;
const FETCH_TIMEOUT_MS = 12_000; // 12s

export async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        return res;
    } finally {
        clearTimeout(t);
    }
}

export async function toDataUrlFromBlobUrl(url: string): Promise<InlineResult> {
    // Handle PDFs (keep as url; adding ?download=1 can help some CDNs)
    if (url.toLowerCase().endsWith(".pdf")) {
        const clean = url.includes("?") ? url : `${url}?download=1`;
        return { type: "pdf", url: clean };
    }

    // Images: download + compress + inline as data URL
    const res = await fetchWithTimeout(url);
    const ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());

    // If not an image, keep as URL fallback
    if (!/^image\//i.test(ct)) {
        const clean = url.includes("?") ? url : `${url}?download=1`;
        return { type: "pdf", url: clean };
    }

    // Use sharp to normalize to JPEG
    const img = sharp(buf, { failOn: "none", limitInputPixels: 268402689 }); // ~16k x 16k guard
    const meta = await img.metadata();

    // Resize if needed (maintain aspect)
    const w = meta.width || MAX_DIM;
    const h = meta.height || MAX_DIM;
    const needsResize = w > MAX_DIM || h > MAX_DIM;

    const pipeline = needsResize ? img.resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside" }) : img;

    const out = await pipeline.jpeg({ quality: JPEG_QUALITY, chromaSubsampling: "4:4:4" }).toBuffer();

    const b64 = out.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${b64}`;

    return { type: "image", dataUrl };
}
