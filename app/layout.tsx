// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

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
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: "TJS StudySteps",
        url: "https://www.tjsstudysteps.com",
        logo: "https://www.tjsstudysteps.com/tjs-logo.png",
        sameAs: [
            "https://www.facebook.com/tjsstudysteps",
            "https://www.instagram.com/tjsstudysteps",
            "https://www.linkedin.com/company/tjsstudysteps",
        ],
        slogan: "Thriving Journey to Success",
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            email: "hello@tjsstudysteps.com",
            telephone: "+60-0000-0000",
            areaServed: "MY, PK",
        },
    };

    return (
        <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <body className="min-h-screen bg-white text-slate-800 antialiased">
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

        {/* JSON-LD for rich results */}
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        </body>
        </html>
    );
}
