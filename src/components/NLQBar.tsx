import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../api/services/ai.service';
import { Sparkles, Loader2, ChevronRight } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
    "Who hasn't paid fees this month?",
    "How many students are absent today?",
    "What is the total fee collected this month?",
];

const NLQBar: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [provider, setProvider] = useState('');

    const queryMutation = useMutation({
        mutationFn: (q: string) => aiService.query(q),
        onSuccess: (data) => {
            setAnswer(data.answer);
            setProvider(`${data.provider}${data.cached ? ' (cached)' : ''}`);
        },
        onError: () => {
            setAnswer('Sorry, I could not answer that right now. Please try again.');
            setProvider('');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        setAnswer('');
        queryMutation.mutate(question.trim());
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-700">Ask a question</span>
                <span className="text-xs text-slate-400 font-medium ml-1">powered by AI</span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="e.g. Who hasn't paid fees this month?"
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-300"
                />
                <button
                    type="submit"
                    disabled={queryMutation.isPending || !question.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all"
                >
                    {queryMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ChevronRight className="w-4 h-4" />}
                    Ask
                </button>
            </form>

            {/* Example chips */}
            {!answer && !queryMutation.isPending && (
                <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUESTIONS.map(q => (
                        <button
                            key={q}
                            onClick={() => { setQuestion(q); }}
                            className="text-xs text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-lg font-medium hover:bg-violet-100 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Answer */}
            {answer && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                        {answer}
                    </p>
                    {provider && (
                        <p className="text-xs text-slate-400 font-medium mt-2">{provider}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NLQBar;
