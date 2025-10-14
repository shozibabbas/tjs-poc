// lib/email.ts
import { Resend } from "resend";

export function getResend() {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        console.warn("RESEND_API_KEY is not set. Emails will be skipped.");
        return null;
    }
    return new Resend(key);
}

export function getFromAddress() {
    return process.env.RESEND_FROM || "TJS StudySteps <noreply@tjsstudysteps.com>";
}

export function appUrl(path = "/") {
    const base = process.env.APP_BASE_URL || "http://localhost:3000";
    return new URL(path, base).toString();
}
