import { WizardForm } from "./WizardForm";

export default function RecommendPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
            <div className="mx-auto max-w-3xl p-6 md:p-10">
                <h1 className="text-3xl font-bold text-center mb-2 text-rose-800">
                    Find Your Perfect Study Path
                </h1>
                <p className="text-center text-slate-600 mb-8">
                    Upload your marksheets and answer a few simple questions — TJS StudySteps will
                    prepare a personalized study pathway and university report for you.
                </p>
                <WizardForm />
            </div>
        </div>
    );
}
