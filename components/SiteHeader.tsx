"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const nav = [
    { href: "/programmes", label: "Programmes" },
    { href: "/universities", label: "Universities" },
    { href: "/scholarships", label: "Scholarships" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
];

export default function SiteHeader() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full border-b border-b-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:py-4">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/tjs-logo.png"
                            alt="TJS StudySteps"
                            width={140}
                            height={28}
                            priority
                            className="h-7 w-auto"
                        />
                    </Link>
                </div>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-6 md:flex">
                    {nav.map((n) => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className="text-sm font-medium text-slate-700 hover:text-rose-700"
                        >
                            {n.label}
                        </Link>
                    ))}
                    <Link
                        href="/applicant/new"
                        className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-800"
                    >
                        Apply Now
                    </Link>
                </nav>

                {/* Mobile menu button */}
                <button
                    aria-label="Toggle menu"
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded md:hidden"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path
                            d={open ? "M6 18L18 6M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className="border-t bg-white md:hidden">
                    <div className="mx-auto max-w-7xl px-4 py-3">
                        <div className="grid gap-2">
                            {nav.map((n) => (
                                <Link
                                    key={n.href}
                                    href={n.href}
                                    className="rounded px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    onClick={() => setOpen(false)}
                                >
                                    {n.label}
                                </Link>
                            ))}
                            <Link
                                href="/apply"
                                onClick={() => setOpen(false)}
                                className="mt-2 inline-flex items-center justify-center rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
                            >
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
