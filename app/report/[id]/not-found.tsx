// app/report/[id]/not-found.tsx
export default function ReportNotFound() {
    return (
        <div className="min-h-[60vh] grid place-items-center px-4 text-center">
            <div>
                <h1 className="text-2xl font-bold text-rose-800">Report not found or expired</h1>
                <p className="mt-2 text-slate-600">
                    The link may have expired. Please generate a new report from the assessment.
                </p>
            </div>
        </div>
    );
}
