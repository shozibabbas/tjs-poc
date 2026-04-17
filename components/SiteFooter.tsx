import Link from "next/link";

export default function SiteFooter() {
    return (
        <footer className="border-t border-t-gray-200 bg-slate-50">
            {/* trust strip */}
            <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="grid gap-4 text-center text-xs text-slate-600 md:grid-cols-3">
                    <p>Trusted counselling for Malaysian universities</p>
                    <p>Personalised programme matching • Scholarship guidance</p>
                    <p>IELTS alternatives & visa support</p>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-10">
                <div className="grid gap-8 md:grid-cols-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">About TJS StudySteps</h3>
                        <p className="mt-3 text-sm text-slate-600">
                            We guide students to the right programme and university in Malaysia —
                            from shortlist to visa. Your thriving journey to success starts here.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Quick Links</h3>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li><Link href="/programmes" className="hover:text-rose-700">Programmes</Link></li>
                            <li><Link href="/universities" className="hover:text-rose-700">Universities</Link></li>
                            <li><Link href="/scholarships" className="hover:text-rose-700">Scholarships</Link></li>
                            <li><Link href="/faq" className="hover:text-rose-700">FAQs</Link></li>
                            <li><Link href="/contact" className="hover:text-rose-700">Contact</Link></li>
                            <li><Link href="/super-admin/login" className="hover:text-rose-700">Super Admin Login</Link></li>
                            <li><Link href="/agent/login" className="hover:text-rose-700">Team Login</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Services</h3>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li>Programme & university counselling</li>
                            <li>Application & offer management</li>
                            <li>Scholarship strategy</li>
                            <li>Visa & pre-departure</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li>Email: <a href="mailto:hello@tjsstudysteps.com" className="hover:text-rose-700">hello@tjsstudysteps.com</a></li>
                            <li>Phone/WhatsApp: <a href="tel:+6000000000" className="hover:text-rose-700">+60 0000 0000</a></li>
                            <li>Hours: Mon–Sat, 10am–6pm</li>
                        </ul>
                        <div className="mt-4">
                            <Link
                                href="/apply"
                                className="inline-flex rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                            >
                                Book Free Counselling
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t pt-6 text-center text-xs text-slate-500">
                    © {new Date().getFullYear()} TJS StudySteps. All rights reserved.
                    <span className="mx-2">•</span>
                    <Link href="/privacy" className="hover:text-rose-700">Privacy</Link>
                    <span className="mx-2">•</span>
                    <Link href="/terms" className="hover:text-rose-700">Terms</Link>
                </div>
            </div>

            {/* mobile sticky CTA */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow md:hidden">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                    <p className="text-sm font-medium">Free counselling slot available</p>
                    <Link
                        href="/apply"
                        className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Apply Now
                    </Link>
                </div>
            </div>
        </footer>
    );
}
