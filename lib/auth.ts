// lib/auth.ts
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export type SessionPayload = {
    role: "superadmin" | "agent" | "applicant";
    sub: string; // identifier (email/username/applicantId)
};

export async function signSession(payload: SessionPayload, maxAgeSec = 60 * 60 * 8) {
    return await new SignJWT(payload as any)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${maxAgeSec}s`)
        .sign(secret);
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}
