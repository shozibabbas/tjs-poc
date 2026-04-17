"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";

const MODULES = [
    { href: "/super-admin/applications", label: "Applications", icon: "📄" },
    { href: "/super-admin/agents",       label: "Agents",       icon: "🧑‍💼" },
    { href: "/super-admin/invoices", label: "Invoices", icon: "🧾" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const pageTitle = useMemo(() => {
        const found = MODULES.find(m => pathname.startsWith(m.href));
        return found?.label ?? "Dashboard";
    }, [pathname]);

    return (
        <div className="admin-shell">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex h-18 items-center gap-3 px-4 py-3 md:px-6">
                    {/* Mobile: sidebar toggle */}
                    <button
                        onClick={() => setOpen(true)}
                        className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
                        aria-label="Open menu"
                    >
                        ☰
                    </button>

                    <Link href="/super-admin" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-400 shadow-lg shadow-rose-200/70">
                            <Image src="/tjs-logo.png" width={28} height={28} alt="TJS" />
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">TJS Control</div>
                            <div className="text-sm font-semibold text-slate-900">Super Admin Console</div>
                        </div>
                    </Link>

                    <div className="ml-auto flex items-center gap-3">
                        <div className="hidden rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm md:inline-flex">
                            {pageTitle}
                        </div>
                        <form
                            action="/logout"
                            method="post"
                            className="hidden md:inline"
                        >
                        <button
                            className="rounded-xl border border-slate-300/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            Logout
                        </button>
                        </form>
                    </div>
                </div>
            </header>

            <div className="relative z-10 mx-auto grid grid-cols-1 md:grid-cols-[290px_1fr]">
                {/* Sidebar (desktop) */}
                <aside className="hidden px-4 py-6 md:block">
                    <div className="admin-panel sticky top-24 overflow-hidden rounded-[28px] p-4">
                        <div className="rounded-[22px] bg-gradient-to-br from-slate-950 via-slate-900 to-rose-900 px-4 py-5 text-white shadow-xl">
                            <div className="text-[11px] uppercase tracking-[0.28em] text-rose-100/80">Workspace</div>
                            <div className="mt-2 text-xl font-semibold">Admin Operations Hub</div>
                            <p className="mt-2 text-sm leading-6 text-slate-200/80">
                                Monitor applications, agents, and invoices from one focused control surface.
                            </p>
                        </div>
                        <nav className="mt-4 flex flex-col gap-2">
                        {MODULES.map((m) => (
                            <NavItem key={m.href} href={m.href} label={m.label} icon={m.icon} active={pathname.startsWith(m.href)} />
                        ))}
                        </nav>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4 text-sm text-slate-600">
                            <div className="font-semibold text-slate-900">Admin focus</div>
                            <p className="mt-1 leading-6">
                                Prioritize student records, EMGS refresh, and invoice workflows with fewer clicks.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Sidebar (mobile drawer) */}
                {open && (
                    <div
                        className="fixed inset-0 z-50 md:hidden"
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setOpen(false)}
                    >
                        <div className="absolute inset-0 bg-black/40" />
                        <div
                            className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                                <div className="flex items-center gap-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-400 shadow-lg shadow-rose-200/70">
                                            <Image src="/tjs-logo.png" width={24} height={24} alt="TJS" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-900">TJS Super Admin</span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    aria-label="Close menu"
                                >
                                    ✕
                                </button>
                            </div>
                                <nav className="flex flex-col gap-2 p-4">
                                {MODULES.map((m) => (
                                    <NavItem
                                        key={m.href}
                                        href={m.href}
                                        label={m.label}
                                        icon={m.icon}
                                        active={pathname.startsWith(m.href)}
                                        onClick={() => setOpen(false)}
                                    />
                                ))}
                            </nav>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <main className="mx-auto flex min-h-[calc(100vh-72px-48px)] w-full flex-col gap-6 p-4 md:p-6">
                    <section className="admin-panel-strong relative overflow-hidden rounded-[28px] px-5 py-5 md:px-7 md:py-6">
                        <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-amber-100/50 via-rose-100/20 to-transparent" />
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="admin-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]">
                                    Super Admin
                                </div>
                                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{pageTitle}</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                                    Run the student operations pipeline with fast access to applications, agents, EMGS updates, and invoices.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
                                <div className="admin-kpi rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Mode</div>
                                    <div className="mt-2 font-semibold text-slate-900">Live workspace</div>
                                </div>
                                <div className="admin-kpi rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Focus</div>
                                    <div className="mt-2 font-semibold text-slate-900">Operational clarity</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="relative">
                        {children}
                    </div>

                    {/* Footer */}
                    <footer className="admin-panel mx-auto mt-auto max-w-7xl rounded-2xl px-4 py-3 text-center text-xs text-slate-500">
                        © {new Date().getFullYear()} TJS StudySteps • Super Admin Console
                    </footer>
                </main>
            </div>
        </div>
    );
}

function NavItem({
                     href,
                     label,
                     icon,
                     active,
                     onClick,
                 }: {
    href: string;
    label: string;
    icon?: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={[
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200",
                active
                    ? "bg-gradient-to-r from-rose-50 to-amber-50 text-rose-700 ring-1 ring-rose-100 shadow-sm"
                    : "text-slate-700 hover:bg-slate-50/90 hover:shadow-sm",
            ].join(" ")}
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base shadow-sm ring-1 ring-slate-200/70">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}
