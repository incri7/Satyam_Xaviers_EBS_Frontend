import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock, Info, Send, X, XCircle, type LucideIcon } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, FilterChips, IconTile, TextAreaField, type BadgeTone, type IconTileTone } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { leavesService, type LeaveRead } from '../../api/services/leaves.service';
import { InlineEmpty, InlineError, RowsSkeleton } from '../../features/home/parts';
import { ChildHeader } from '../../features/parent/ChildHeader';
import { errorText } from '../../features/people/format';
import { useChildParam } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';

import { BsDateField } from '../../components/common/BsDateField';
/**
 * The reason goes first in the request's text, "Family event: cousin's
 * wedding", because the API has only sick and casual leave for students.
 * Stored in English so every reader can parse it; shown translated.
 */
const REASONS = ['sick', 'family', 'festival', 'travel', 'other'] as const;
type Reason = (typeof REASONS)[number];
const PREFIX: Record<Reason, string> = { sick: 'Sick', family: 'Family event', festival: 'Festival', travel: 'Travel', other: 'Other' };
const MAX_PAST_DAYS = 7;

function readReason(text: string | null): { reason: Reason | null; note: string } {
    const s = text ?? '';
    for (const r of REASONS) {
        const p = `${PREFIX[r]}: `;
        if (s.startsWith(p)) return { reason: r, note: s.slice(p.length) };
        if (s === PREFIX[r]) return { reason: r, note: '' };
    }
    return { reason: null, note: s };
}

/** Days between two ISO dates, both counted, leaving out Saturdays. */
function weekdaysBetween(a: string, b: string): number {
    let n = 0;
    for (let d = new Date(`${a}T12:00:00`); isoLocal(d) <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 6) n++;
    return n;
}

const LOOK: Record<string, { tone: BadgeTone & IconTileTone; icon: LucideIcon }> = {
    pending: { tone: 'warn', icon: Clock },
    approved: { tone: 'ok', icon: CheckCircle2 },
    rejected: { tone: 'bad', icon: XCircle },
};

/**
 * Figma D06 Child leave: ask for leave (dates, reason, a note for the class
 * teacher) next to this year's requests and their decisions. Opens with dates
 * filled in from "Mark as expected leave" and "Add a reason" (?start=&end=).
 *
 * Adapted: the day count before sending leaves out Saturdays only (holidays
 * are counted by the server once sent); a declined request has no decision
 * note in the data, so it shows who asked and when.
 */
export default function ChildLeavePage() {
    const { t } = useTranslation();
    const { id } = useChildParam();
    const history = useQuery({ queryKey: ['parent', 'child-leaves', id], queryFn: () => leavesService.getChildLeaves(id), enabled: !!id });

    return (
        <AppPage title={t('childPage.leave')}>
            <ChildHeader title={t('childPage.leave')} />
            <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-[18px]">
                <AskForm key={id} existing={history.data?.leaves ?? []} />
                <History q={history} />
            </div>
        </AppPage>
    );
}

function AskForm({ existing }: { existing: LeaveRead[] }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const { id, child } = useChildParam();
    const [params] = useSearchParams();
    const [start, setStart] = useState(params.get('start') ?? '');
    const [end, setEnd] = useState(params.get('end') ?? params.get('start') ?? '');
    const [reason, setReason] = useState<Reason | ''>('');
    const [note, setNote] = useState('');
    const [tried, setTried] = useState(false);
    const [sent, setSent] = useState(false);

    const today = isoLocal(new Date());
    const earliest = (() => { const d = new Date(); d.setDate(d.getDate() - MAX_PAST_DAYS); return isoLocal(d); })();
    const overlap = start && end ? existing.find((l) => l.status !== 'rejected' && l.start_date <= end && l.end_date >= start) : undefined;
    const dateError = !start || !end ? (tried ? t('childPage.leaveForm.needDates') : null)
        : end < start ? t('childPage.leaveForm.endBeforeStart', { date: df.date(start, 'dayMonth') })
            : start < earliest ? t('childPage.leaveForm.tooOld', { n: MAX_PAST_DAYS })
                : overlap ? t('childPage.leaveForm.overlap', { from: df.date(overlap.start_date, 'dayMonth'), to: df.date(overlap.end_date, 'dayMonth') }) : null;
    const days = start && end && end >= start ? weekdaysBetween(start, end) : 0;
    const name = child?.first_name ?? '';

    const send = useMutation({
        mutationFn: () => leavesService.submitLeave({
            applicant_type: 'student',
            applicant_student_id: id,
            leave_type: reason === 'sick' ? 'sick' : 'casual',
            start_date: start,
            end_date: end,
            reason: note.trim() ? `${PREFIX[reason as Reason]}: ${note.trim()}` : PREFIX[reason as Reason],
        }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['parent', 'child-leaves', id] });
            void qc.invalidateQueries({ queryKey: ['parent', 'child-attendance', id] });
            setSent(true); setStart(''); setEnd(''); setReason(''); setNote(''); setTried(false);
        },
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setTried(true); setSent(false);
        if (dateError || !start || !end || !reason) return;
        send.mutate();
    };

    return (
        <Card>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <CardHeader title={t('childPage.leaveForm.title', { name })} subtitle={child?.class_teacher_name ? t('childPage.leaveForm.goesTo', { name: child.class_teacher_name }) : t('childPage.leaveForm.goesToSchool')} />
                {sent && <Banner tone="ok" title={t('childPage.leaveForm.sentTitle')}>{t('childPage.leaveForm.sentBody')}</Banner>}
                {send.isError && <Banner tone="bad" title={t('childPage.leaveForm.failed')}>{errorText(send.error, t('parent.failedSubmit'))}</Banner>}
                <div className="grid grid-cols-2 gap-3">
                    <BsDateField label={t('childPage.leaveForm.from')} value={start} min={earliest}
                       
                        onChange={(v) => { setStart(v); if (!end || end < v) setEnd(v); }} />
                    <BsDateField label={t('childPage.leaveForm.to')} value={end} min={start || earliest}
                        error={dateError && end ? ' ' : undefined}
                        onChange={(v) => setEnd(v)} />
                </div>
                {dateError ? (
                    <p role="alert" className="flex items-start gap-1.5 type-small text-bad"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />{dateError}</p>
                ) : days > 0 && (
                    <p className="flex items-center gap-1.5 type-small text-primary-text"><Info size={14} className="shrink-0" aria-hidden />
                        {t('childPage.leaveForm.dayCount', { count: days, n: formatCount(days, df.lang) })}{start === today ? ` ${t('childPage.leaveForm.startsToday')}` : ''}
                    </p>
                )}
                <fieldset className="flex flex-col gap-2">
                    <legend className="pb-2 type-small-semibold text-ink">{t('childPage.leaveForm.reason')}</legend>
                    <FilterChips aria-label={t('childPage.leaveForm.reason')} value={reason as Reason} onChange={(v) => setReason(v)}
                        items={REASONS.map((r) => ({ value: r, label: t(`childPage.reason.${r}`) }))} />
                    {tried && !reason && <p role="alert" className="type-small text-bad">{t('childPage.leaveForm.pickReason')}</p>}
                </fieldset>
                <TextAreaField label={t('childPage.leaveForm.note')} optional={t('register.optional')} value={note} maxLength={400} rows={3}
                    placeholder={t('childPage.leaveForm.notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
                <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
                    <Button type="submit" leftIcon={Send} loading={send.isPending} className="max-md:w-full">{t('childPage.leaveForm.send')}</Button>
                    <p className="type-caption text-muted md:flex-1">{t('childPage.leaveForm.youllKnow')}</p>
                </div>
            </form>
        </Card>
    );
}

function History({ q }: { q: ReturnType<typeof useQuery<Awaited<ReturnType<typeof leavesService.getChildLeaves>>>> }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const { id, child } = useChildParam();
    const withdraw = useMutation({
        mutationFn: (leaveId: number) => leavesService.withdrawLeave(leaveId),
        onSuccess: () => { void qc.invalidateQueries({ queryKey: ['parent', 'child-leaves', id] }); },
    });
    const list = q.data?.leaves ?? [];
    const [all, setAll] = useState(false);
    const totalDays = list.filter((l) => l.status !== 'rejected').reduce((s, l) => s + (l.days ?? 0), 0);
    const range = (l: LeaveRead) => l.start_date === l.end_date ? df.date(l.start_date, 'dayMonth')
        : t('childPage.leaveForm.range', { from: df.date(l.start_date, 'dayMonth'), to: df.date(l.end_date, 'dayMonth') });

    return (
        <Card className="gap-1">
            <CardHeader title={t('childPage.requestsYear')}
                subtitle={q.isSuccess ? (list.length ? t('childPage.requestsSub', { count: list.length, n: formatCount(list.length, df.lang), days: formatCount(totalDays, df.lang) }) : t('childPage.noneYet')) : undefined} />
            {withdraw.isError && <Banner tone="bad" title={t('childPage.withdrawFailed')}>{errorText(withdraw.error, t('parent.failedSubmit'))}</Banner>}
            {q.isPending ? <RowsSkeleton rows={4} /> : q.isError ? <InlineError title={t('childPage.leaveError')} onRetry={() => void q.refetch()} /> : list.length === 0 ? (
                <InlineEmpty icon={Clock} title={t('childPage.noRequests')}>{t('childPage.noRequestsBody', { name: child?.first_name ?? '' })}</InlineEmpty>
            ) : (
                <>
                    <ul>
                        {(all ? list : list.slice(0, 8)).map((l) => {
                            const look = LOOK[l.status] ?? LOOK.pending;
                            const { reason, note } = readReason(l.reason);
                            const kind = reason ? t(`childPage.reason.${reason}`) : t(`leaves.type${l.leave_type[0].toUpperCase()}${l.leave_type.slice(1)}`, { defaultValue: l.leave_type });
                            return (
                                <li key={l.id} className="flex items-start gap-3 border-b border-line-subtle py-3 last:border-b-0">
                                    <IconTile icon={look.icon} tone={look.tone} size={36} />
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="min-w-0 flex-1 truncate type-body-semibold text-ink">
                                                {t('childPage.kindDays', { kind, count: l.days ?? 0, n: formatCount(l.days ?? 0, df.lang) })}
                                            </p>
                                            <Badge tone={look.tone}>{t(`childPage.leaveState.${l.status}`)}</Badge>
                                        </div>
                                        <p className="type-small text-ink-2">{[range(l), note].filter(Boolean).join('. ')}</p>
                                        <p className="type-caption text-muted">
                                            {l.status === 'pending' ? t('childPage.sentWhen', { when: df.relative(l.created_at) })
                                                : l.decided_at ? t(l.status === 'approved' ? 'childPage.approvedWhen' : 'childPage.declinedWhen', { when: df.date(l.decided_at, 'dayMonth') }) : ''}
                                        </p>
                                        {l.status === 'pending' && (
                                            <div className="pt-1.5">
                                                <Button variant="quiet" size="sm" leftIcon={X} loading={withdraw.isPending && withdraw.variables === l.id} onClick={() => withdraw.mutate(l.id)}>
                                                    {t('childPage.cancelRequest')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {list.length > 8 && (
                        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                            {all ? t('home.t.showLess') : t('childPage.showAll', { n: list.length })}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}
