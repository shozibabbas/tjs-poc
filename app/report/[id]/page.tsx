// app/report/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma, purgeExpiredReports } from "@/lib/prisma";
import { ReportView } from "@/app/report/[id]/ReportView";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function ReportPage({ params }: PageProps) {
    await purgeExpiredReports();

    const report = await prisma.report.findUnique({
        where: { id: params.id },
        select: { id: true, markdown: true, createdAt: true, expiresAt: true },
    });

    if (!report) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white py-8">
            <div className="mx-auto max-w-5xl px-4">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-rose-800">Your TJS StudySteps Report</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Report ID: <span className="font-mono">{report.id}</span>
                    </p>
                </div>
                <ReportView markdown={report.markdown} />
            </div>
        </div>
    );
}
