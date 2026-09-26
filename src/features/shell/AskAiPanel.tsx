import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowUp, Loader2, RotateCw, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '../../design-system';
import { aiService } from '../../api/services/ai.service';
import { useAuthStore } from '../../store/useAuthStore';
import { errorText } from '../people/format';
import { cn } from '../../utils/cn';
import { HeaderPopover } from './HeaderPopover';

/** Roles the /ai/query endpoint answers. */
const AI_ROLES = ['admin', 'principal', 'accountant', 'coordinator'];
const SUGGESTIONS = ['absentToday', 'unmarked', 'collected', 'unpaid', 'onLeave'] as const;

interface Turn {
    q: string;
    a?: string;
    error?: string;
    cached?: boolean;
}

/**
 * Figma H14 Ask AI: a question about attendance, fees or leave, answered
 * from the school's own data. The server swaps student names for codes
 * before the question reaches the AI and back after (CLAUDE.md rule 5), so
 * nothing here sends names anywhere. Answers are advice to read, not actions
 * taken: the panel links nothing that changes data.
 *
 * Adapted: the API returns a written answer, so the Figma figure tiles and
 * "Remind their parents" actions are left out.
 */
export function AskAiButton({ className }: { className?: string }) {
    const { t } = useTranslation();
    const role = useAuthStore((s) => s.user?.role ?? '');
    const [open, setOpen] = useState(false);

    // Ctrl K / ⌘ K opens it from anywhere.
    useEffect(() => {
        if (!AI_ROLES.includes(role)) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [role]);

    if (!AI_ROLES.includes(role)) return null;
    return (
        <div className="relative shrink-0">
            <button type="button" data-popover-toggle onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label={t('askAi.open')}
                className={cn('flex h-10 items-center gap-2 rounded-full bg-surface px-3 text-muted ring-1 ring-inset ring-line outline-none transition-colors hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60 lg:w-[260px]', className)}>
                <Sparkles size={17} className="text-primary-text" aria-hidden />
                <span className="flex-1 truncate text-left type-small max-lg:sr-only">{t('askAi.placeholder')}</span>
                <kbd className="rounded-[6px] bg-sunken px-1.5 py-0.5 font-ui type-micro-bold text-muted max-lg:hidden">Ctrl K</kbd>
            </button>
            <HeaderPopover open={open} onClose={() => setOpen(false)} label={t('askAi.title')} className="lg:w-[480px]">
                <Panel />
            </HeaderPopover>
        </div>
    );
}

function Panel() {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const ask = useMutation({
        mutationFn: (q: string) => aiService.query(q),
        onSuccess: (res, q) => setTurns((ts) => ts.map((x) => (x.q === q && !x.a && !x.error ? { ...x, a: res.answer, cached: res.cached } : x))),
        onError: (err, q) => setTurns((ts) => ts.map((x) => (x.q === q && !x.a && !x.error ? { ...x, error: errorText(err, t('askAi.errorBody')) } : x))),
    });
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns]);

    const send = (q: string) => {
        const text = q.trim();
        if (!text || ask.isPending) return;
        setTurns((ts) => [...ts, { q: text }]);
        setInput('');
        ask.mutate(text);
    };
    const retry = (q: string) => {
        setTurns((ts) => ts.map((x) => (x.q === q && x.error ? { q } : x)));
        ask.mutate(q);
    };
    const submit = (e: FormEvent) => { e.preventDefault(); send(input); };
    const asked = new Set(turns.map((x) => x.q));
    const next = SUGGESTIONS.map((k) => t(`askAi.suggest.${k}`)).filter((s) => !asked.has(s)).slice(0, turns.length ? 2 : 5);

    return (
        <>
            <form onSubmit={submit} className="flex items-center gap-2 border-b border-line-subtle px-4 py-3">
                <Sparkles size={18} className="shrink-0 text-primary-text" aria-hidden />
                <input data-autofocus value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
                    placeholder={t('askAi.inputPlaceholder')} aria-label={t('askAi.title')}
                    className="min-w-0 flex-1 bg-transparent type-body text-ink outline-none placeholder:text-muted" />
                <button type="submit" disabled={!input.trim() || ask.isPending} aria-label={t('askAi.send')}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary outline-none transition-opacity disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-focus/60">
                    {ask.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ArrowUp size={16} aria-hidden />}
                </button>
            </form>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" aria-live="polite">
                {turns.length === 0 && <p className="type-small-semibold text-ink">{t('askAi.emptyTitle')}</p>}
                {turns.map((x, i) => (
                    <div key={`${x.q}-${i}`} className="flex flex-col gap-2">
                        <p className="self-end rounded-[14px] rounded-br-[4px] bg-primary px-3.5 py-2 type-small text-on-primary">{x.q}</p>
                        {x.error ? (
                            <div className="flex flex-col gap-2 rounded-row border border-bad/30 bg-bad-soft/50 p-3">
                                <p className="flex items-center gap-2 type-small-semibold text-bad"><AlertCircle size={16} aria-hidden />{t('askAi.errorTitle')}</p>
                                <p className="type-caption text-ink-2">{x.error}</p>
                                <Button variant="quiet" size="sm" leftIcon={RotateCw} className="w-fit" onClick={() => retry(x.q)}>{t('askAi.retry')}</Button>
                            </div>
                        ) : x.a ? (
                            <div className="flex flex-col gap-1.5 rounded-row bg-surface-2 p-3.5">
                                <p className="whitespace-pre-wrap type-body text-ink">{x.a}</p>
                                <p className="type-caption text-muted">{x.cached ? t('askAi.fromCache') : t('askAi.fromData')}</p>
                            </div>
                        ) : (
                            <p className="flex items-center gap-2 type-small text-muted"><Loader2 size={15} className="animate-spin" aria-hidden />{t('askAi.thinking')}</p>
                        )}
                    </div>
                ))}
                {next.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <p className="type-caption text-muted">{turns.length ? t('askAi.askNext') : t('askAi.try')}</p>
                        <div className="flex flex-wrap gap-2">
                            {next.map((s) => (
                                <button key={s} type="button" disabled={ask.isPending} onClick={() => send(s)}
                                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-left type-small text-ink-2 outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-3 focus-visible:ring-focus/60 disabled:opacity-50">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <p className="flex items-start gap-2 border-t border-line-subtle px-4 py-2.5 type-caption text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />{t('askAi.privacy')}
            </p>
        </>
    );
}
