import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '../api/services/ai.service';
import { Sparkles, Loader2, ChevronRight, X, Info, ChevronDown } from 'lucide-react';

const EXAMPLE_QUESTIONS = [
    "Who hasn't paid fees this month?",
    "How many students are absent today?",
    "What is the total fee collected this month?",
];

const NLQBar: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [askedQuestion, setAskedQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [provider, setProvider] = useState('');
    const [showHelp, setShowHelp] = useState(false);

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

    const ask = (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        setAskedQuestion(trimmed);
        setAnswer('');
        setQuestion('');            // clear the input so the next question is easy to type
        queryMutation.mutate(trimmed);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        ask(question);
    };

    const reset = () => {
        setQuestion('');
        setAskedQuestion('');
        setAnswer('');
        setProvider('');
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-700">Ask a question</span>
                <span className="text-xs text-slate-400 font-medium ml-1">powered by AI</span>
                <button
                    type="button"
                    onClick={() => setShowHelp(v => !v)}
                    className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                    <Info className="w-3.5 h-3.5" />
                    How it works
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Info / warning bar */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                <div className="flex items-start gap-2 p-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        This assistant answers from <b>attendance and fee data only</b>. Student names are
                        anonymised before your question is sent to the AI — never type personal details
                        (phone numbers, addresses, ID numbers). Always verify important figures on the actual page.
                    </p>
                </div>
                {showHelp && (
                    <div className="px-3 pb-3 pt-0 text-xs text-amber-800 space-y-2 border-t border-amber-200/60 mt-1">
                        <div className="pt-2">
                            <p className="font-bold text-emerald-700 mb-0.5">✓ What it CAN do</p>
                            <ul className="list-disc list-inside space-y-0.5 text-amber-800/90">
                                <li>Summarise today's attendance (how many present / absent)</li>
                                <li>Report this month's fee collection</li>
                                <li>Tell you which students have outstanding balances</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-red-600 mb-0.5">✕ What it CANNOT do</p>
                            <ul className="list-disc list-inside space-y-0.5 text-amber-800/90">
                                <li>Change anything — it is <b>read-only</b>, it never edits data</li>
                                <li>Answer about marks, exams, staff leave, or timetables (not yet)</li>
                                <li>Take actions (send SMS, approve leave, record payments)</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-red-600 mb-0.5">⚠ Please do NOT</p>
                            <ul className="list-disc list-inside space-y-0.5 text-amber-800/90">
                                <li>Type anyone's phone number, address, or ID into the box</li>
                                <li>Act on an answer without checking the real record — AI can be wrong</li>
                                <li>Treat it as legal, medical, or disciplinary advice</li>
                            </ul>
                        </div>
                    </div>
                )}
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

            {/* Example chips — only before the first question */}
            {!askedQuestion && !queryMutation.isPending && (
                <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUESTIONS.map(q => (
                        <button
                            key={q}
                            onClick={() => ask(q)}
                            className="text-xs text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-lg font-medium hover:bg-violet-100 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Conversation: the question asked, then its answer */}
            {askedQuestion && (
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-700">
                            <span className="text-violet-500">Q:</span> {askedQuestion}
                        </p>
                        <button
                            onClick={reset}
                            title="Clear"
                            className="p-1 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {queryMutation.isPending ? (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                        </div>
                    ) : answer ? (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                {answer}
                            </p>
                            {provider && (
                                <p className="text-xs text-slate-400 font-medium mt-2">{provider}</p>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default NLQBar;
