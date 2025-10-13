import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Optional: only allow logged-in users to upload (add your auth here)

export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            request: req,
            body,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // You can validate clientPayload, enforce user limits, etc.
                return {
                    allowedContentTypes: [
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                    ],
                    addRandomSuffix: true,
                    access: "public", // public URLs we can send to the model
                    tokenPayload: JSON.stringify({
                        // e.g. userId from your auth, or any flags
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Called by Vercel when the upload finishes.
                // You can log, rate-limit, or write to DB here if desired.
                console.log("Blob uploaded:", blob.url, blob.contentType);
            },
        });

        return NextResponse.json(json);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
