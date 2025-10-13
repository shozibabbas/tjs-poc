import { ClientForm } from "./ClientForm";

export default function RecommendPage() {
    return (
        <main className="mx-auto max-w-5xl p-6">
            <h1 className="mb-2 text-2xl font-bold">Programme & University Recommender</h1>
            <p className="mb-6 text-sm text-gray-600">
                Fill in the questionnaire and get a personalised list of top 5 programmes and Malaysian universities.
            </p>
            <ClientForm />
            <footer className="mt-8 text-xs text-gray-500">
                Powered by OpenAI API. Ensure <code>OPENAI_API_KEY</code> is set.
            </footer>
        </main>
    );
}
