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
        <div className="min-h-screen bg-slate-50">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-14 items-center gap-3 px-4">
                    {/* Mobile: sidebar toggle */}
                    <button
                        onClick={() => setOpen(true)}
                        className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:hidden"
                        aria-label="Open menu"
                    >
                        ☰
                    </button>

                    <Link href="/super-admin" className="flex items-center gap-2">
                        <Image src="/tjs-logo.png" width={150} height={150} alt="TJS" />
                        <span className="text-sm font-semibold text-slate-500">Super Admin</span>
                    </Link>

                    <div className="ml-auto flex items-center gap-3">
                        <span className="hidden text-sm text-slate-500 md:inline">{pageTitle}</span>
                        <form
                            action="/logout"
                            method="post"
                            className="hidden md:inline"
                        >
                        <button
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Logout
                        </button>
                        </form>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr]">
                {/* Sidebar (desktop) */}
                <aside className="hidden border-r border-slate-200 bg-white md:block">
                    <nav className="sticky top-14 flex h-[calc(100vh-56px)] flex-col gap-1 p-3">
                        {MODULES.map((m) => (
                            <NavItem key={m.href} href={m.href} label={m.label} icon={m.icon} active={pathname.startsWith(m.href)} />
                        ))}
                    </nav>
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
                            className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 p-3">
                                <div className="flex items-center gap-2">
                                    <Image src="/tjs-new.png" width={24} height={24} alt="TJS" />
                                    <span className="text-sm font-semibold text-slate-900">TJS • Super Admin</span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    aria-label="Close menu"
                                >
                                    ✕
                                </button>
                            </div>
                            <nav className="flex flex-col gap-1 p-3">
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
                <main className="mx-auto w-full min-h-[calc(100vh-56px-48px)] bg-slate-50 p-4 md:p-6 flex flex-col gap-6">
                    <div>
                        {children}
                    </div>

                    {/* Footer */}
                    <footer className="mx-auto mt-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-3 text-center text-xs text-slate-500">
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                active
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                    : "text-slate-700 hover:bg-slate-50",
            ].join(" ")}
        >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}
