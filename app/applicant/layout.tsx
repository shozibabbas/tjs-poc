// app/layout.tsx
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
    title: "TJS StudySteps – Thriving Journey to Success",
    description:
        "TJS StudySteps is your trusted education consultancy for Malaysian universities: programmes, scholarships, admissions & visa guidance.",
    icons: { icon: "/favicon.ico" },
    metadataBase: new URL("https://www.tjsstudysteps.com"),
    openGraph: {
        title: "TJS StudySteps – Thriving Journey to Success",
        description:
            "Personalised counselling for top Malaysian universities. Programme selection, scholarships, admissions and visas.",
        url: "https://www.tjsstudysteps.com",
        siteName: "TJS StudySteps",
        images: ["/og-image.png"],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "TJS StudySteps",
        description:
            "Programme & university counselling for Malaysia. Get matched, apply, succeed.",
        images: ["/og-image.png"],
    },
};

export const viewport: Viewport = {
    themeColor: "#e11d48", // close to Tailwind rose-600 / your red
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
        {/* Top accent bar (optional) */}
        <div className="bg-rose-700 text-white text-xs md:text-sm">
            <div className="mx-auto max-w-7xl px-4 py-2 text-center">
                Free 1:1 counselling • Next intake: September — <a href="/apply" className="underline">Book a slot</a>
            </div>
        </div>

        <SiteHeader />

        <main id="content" className="relative">
            {children}
        </main>

        <SiteFooter />
        </>
    );
}
