"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* ====== HERO ====== */}
            <header className="relative overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(225,29,72,0.10),transparent_70%)]"
                />
                <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:pt-20 lg:gap-16">
                    <div>
                        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                            Find your <span className="text-rose-700">right programme</span> and
                            the <span className="text-rose-700">best Malaysian university</span>.
                        </h1>
                        <p className="mt-4 max-w-[60ch] text-pretty text-base text-slate-600 sm:text-lg">
                            Upload your marksheet, answer a few smart questions, and get a
                            personalised shortlist of <strong>Top 5 programmes & universities</strong>,
                            with entry fit, fees, intake dates, and scholarship notes.
                        </p>

                        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row">
                            <PrimaryCTA href="/recommend">Start your free assessment</PrimaryCTA>
                            <Link
                                href="/recommend"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Or upload marksheet to begin →
                            </Link>
                        </div>

                        <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-600" />
                                No cost, no commitment
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-600" />
                                Human counsellor review
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-600" />
                                IELTS alternatives guidance
                            </li>
                        </ul>
                    </div>

                    <div className="relative">
                        <div className="relative mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                            {/* Mock card showing the 4 steps */}
                            <ol className="divide-y divide-slate-200">
                                {[
                                    {
                                        t: "Upload your marksheet",
                                        d: "We securely read your scores to understand strengths.",
                                    },
                                    {
                                        t: "Answer a few questions",
                                        d: "Interests, goals, budget, and preferred city.",
                                    },
                                    {
                                        t: "Get Top 5 matches",
                                        d: "Programmes + universities with fit, fees, intakes.",
                                    },
                                    {
                                        t: "Book counsellor call",
                                        d: "We help you apply, secure offers & visa.",
                                    },
                                ].map((s, i) => (
                                    <li key={i} className="flex items-start gap-3 py-4">
                    <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-700 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                                        <div>
                                            <p className="font-semibold">{s.t}</p>
                                            <p className="text-sm text-slate-600">{s.d}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                🔒 Your documents are used only to generate recommendations and
                                for counsellor review.
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ====== TRUST STRIP ====== */}
            <section className="border-y bg-slate-50">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-center text-sm text-slate-600 sm:grid-cols-4">
                    <div>Public & Private Malaysian Universities</div>
                    <div>Scholarship & IELTS Guidance</div>
                    <div>End-to-End Application Support</div>
                    <div>Visa & Pre-Departure Help</div>
                </div>
            </section>

            {/* ====== HOW IT WORKS ====== */}
            <section className="mx-auto max-w-7xl px-4 py-16">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
                    <p className="mt-2 text-slate-600">
                        A guided path from discovery to admission — starts with TJS.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <StepCard
                        title="Start now"
                        desc="Answer a short questionnaire and upload your marksheet. We automatically extract subject-wise scores."
                    />
                    <StepCard
                        title="Personalised Top 5"
                        desc="We map your interests + grades to the right programme and universities with fees, intakes, and entry fit."
                    />
                    <StepCard
                        title="Apply with confidence"
                        desc="One-click to book a counsellor. We manage offers, scholarships, documents and visa."
                    />
                </div>

                <div className="mt-10 flex justify-center">
                    <PrimaryCTA href="/recommend">Begin your assessment</PrimaryCTA>
                </div>
            </section>

            {/* ====== BENEFITS ====== */}
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-16">
                    <div className="grid items-start gap-10 md:grid-cols-2">
                        <div>
                            <h3 className="text-2xl font-bold">Why students choose TJS</h3>
                            <ul className="mt-6 space-y-4">
                                {[
                                    "Objective, data-driven matching — not generic lists.",
                                    "Transparent cost bands and scholarship pointers.",
                                    "Advice tailored to your career goals & city preference.",
                                    "Hands-on support through offer, acceptance, and visa.",
                                ].map((t) => (
                                    <li key={t} className="flex items-start gap-3">
                                        <CheckIcon className="mt-1 h-5 w-5 text-emerald-600" />
                                        <span className="text-slate-700">{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8">
                                <PrimaryCTA href="/recommend">Get my Top 5 now</PrimaryCTA>
                            </div>
                        </div>

                        <Testimonial />
                    </div>
                </div>
            </section>

            {/* ====== FAQ PREVIEW ====== */}
            <section className="border-t bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-16">
                    <div className="mx-auto mb-8 max-w-2xl text-center">
                        <h3 className="text-2xl font-bold">Questions students ask</h3>
                    </div>
                    <div className="mx-auto grid max-w-3xl gap-4">
                        <FAQ
                            q="Do I have to pay to start the assessment?"
                            a="No. The assessment is free. You only pay if you choose value-added services later."
                        />
                        <FAQ
                            q="What file types are supported for marksheets?"
                            a="Clear scans or photos in PDF/JPG/PNG are fine. We read subject-wise scores securely."
                        />
                        <FAQ
                            q="Can I apply without IELTS?"
                            a="Many Malaysian universities accept alternatives or internal tests. We’ll suggest suitable options."
                        />
                    </div>
                </div>
            </section>

            {/* ====== MOBILE STICKY CTA ====== */}
            <StickyMobileCTA />
        </div>
    );
}

/* ========= Reusable UI ========= */

function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
            {children} →
        </Link>
    );
}

function StepCard({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-semibold">{title}</h4>
            <p className="mt-2 text-sm text-slate-600">{desc}</p>
        </div>
    );
}

function Testimonial() {
    return (
        <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <blockquote className="text-balance text-lg leading-relaxed text-slate-800">
                “The app nailed my strengths from my marksheet and gave me a
                clear Top 5. I secured an offer within three weeks.”
            </blockquote>
            <figcaption className="mt-4 text-sm text-slate-600">
                — Hamza K., Bachelor of Software Engineering (UTM)
            </figcaption>
        </figure>
    );
}

function FAQ({ q, a }: { q: string; a: string }) {
    return (
        <details className="group rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer list-none">
        <span className="flex items-center justify-between gap-4 text-sm font-semibold">
          {q}
            <svg
                className="h-5 w-5 text-slate-500 transition group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
            />
          </svg>
        </span>
            </summary>
            <p className="mt-3 text-sm text-slate-600">{a}</p>
        </details>
    );
}

function StickyMobileCTA() {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-2">
                <p className="text-sm font-medium">Ready to find your Top 5?</p>
                <PrimaryCTA href="/recommend">Start</PrimaryCTA>
            </div>
        </div>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3A1 1 0 016.707 9.293L8.75 11.336l6.543-6.543a1 1 0 011.414 0z"
                clipRule="evenodd"
            />
        </svg>
    );
}
