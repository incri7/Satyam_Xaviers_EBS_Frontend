import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCheck, RotateCcw, RotateCw, Users } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, Checkbox, Dialog, EmptyState, FilterChips, Meter, Person, Skeleton, TextAreaField, type BadgeTone } from '../../design-system';
import { assignmentsService, type Assignment, type Submission, type SubmissionStatus } from '../../api/services/assignments.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import { isoLocal } from '../../utils/nepaliDate';
import { errorText, fullName } from '../people/format';
import { peopleService } from '../../api/services/people.service';
import type { Student } from '../../types/people';

type View = 'all' | 'submitted' | 'late' | 'missing' | 'pending' | 'graded';
const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'NG'];
const TONE: Record<SubmissionStatus, BadgeTone> = { pending: 'neutral', submitted: 'info', graded: 'ok', missing: 'bad' };

/** Handed in after the due day. The API has no "late" status; this is worked out. */
const isLate = (s: Submission, due: string) => !!s.submitted_at && s.submitted_at.slice(0, 10) > due.slice(0, 10);

/**
 * Figma C08 Assignment submissions: who handed in, who is late or missing,
 * and the review of each piece of work. Tick several to mark them reviewed
 * together; open one to give a grade and feedback, or send it back.
 *
 * Adapted: the API holds no photos or notes with the work, and there is no
 * "edit assignment" or "remind missing" yet. Work handed in on paper can be
 * recorded here.
 */
export function SubmissionsView({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const [view, setView] = useState<View>('all');
    const [selected, setSelected] = useState<number[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [sheet, setSheet] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; title: string; body?: string } | null>(null);

    const { data, isPending: loadingSubs, isError, refetch } = useQuery({
        queryKey: ['submissions', assignment.id],
        queryFn: () => assignmentsService.listSubmissions(assignment.id),
    });
    // A submission row exists only once a student hands in or a teacher records
    // something, so the section's roster fills in everyone else as not handed in.
    const roster = useQuery({
        queryKey: ['students', 'enrollment', String(assignment.class_id), String(assignment.section_id)],
        queryFn: () => peopleService.getStudents({ limit: 100, class_id: assignment.class_id, section_id: assignment.section_id }),
    });
    const subs: Submission[] = useMemo(() => {
        const rows = data?.submissions ?? [];
        const have = new Set(rows.map((r) => r.student_id));
        const untouched = (roster.data?.students ?? []).filter((st: Student) => !have.has(st.id)).map((st: Student) => ({
            id: -st.id, assignment_id: assignment.id, student_id: st.id, status: 'pending' as SubmissionStatus,
            student_name: fullName(st), admission_no: st.admission_no ?? null,
        }));
        return [...rows, ...untouched].sort((x, y) => (x.student_name ?? '').localeCompare(y.student_name ?? ''));
    }, [data, roster.data, assignment.id]);
    const isPending = loadingSubs || roster.isPending;
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['submissions', assignment.id] });
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
    };

    const bulk = useMutation({
        mutationFn: (ids: number[]) => Promise.all(ids.map((id) => {
            const s = subs.find((x) => x.student_id === id)!;
            return assignmentsService.updateSubmission(assignment.id, id, { status: 'graded', grade: s.grade, remarks: s.remarks });
        })),
        onSuccess: (_r, ids) => { refresh(); setSelected([]); setNotice({ tone: 'ok', title: t('assignmentsPage.subs.reviewedN', { count: ids.length, n: formatCount(ids.length, lang) }) }); },
        onError: (err) => { refresh(); setNotice({ tone: 'bad', title: t('assignmentsPage.subs.failed'), body: errorText(err, t('peoplePage.error.body')) }); },
    });

    const match: Record<View, (s: Submission) => boolean> = {
        all: () => true,
        submitted: (s) => s.status === 'submitted' && !isLate(s, assignment.due_date),
        late: (s) => s.status === 'submitted' && isLate(s, assignment.due_date),
        missing: (s) => s.status === 'missing',
        pending: (s) => s.status === 'pending',
        graded: (s) => s.status === 'graded',
    };
    const count = (v: View) => subs.filter(match[v]).length;
    const shown = subs.filter(match[view]);
    const handedIn = subs.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
    const reviewable = shown.filter((s) => s.status === 'submitted').map((s) => s.student_id);
    const open = subs.find((s) => s.student_id === openId) ?? null;
    const toggle = (id: number) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const statusBadge = (s: Submission) => {
        if (s.status === 'submitted' && isLate(s, assignment.due_date)) return <Badge tone="warn" dot>{t('assignmentsPage.subs.late')}</Badge>;
        return <Badge tone={TONE[s.status]} dot>{t(`assignmentsPage.subs.status.${s.status}`)}</Badge>;
    };
    const when = (s: Submission) => (s.submitted_at ? df.dateTime(s.submitted_at) : t('assignmentsPage.subs.notIn'));
    const overdue = assignment.due_date.slice(0, 10) < isoLocal(new Date());

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" leftIcon={ArrowLeft} onClick={onBack}>{t('assignmentsPage.all')}</Button>
            </div>
            {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}

            <Card className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                        <h2 className="type-h3 text-ink">{assignment.title}</h2>
                        <p className="type-small text-muted">
                            {[assignment.class_name, assignment.section_name].filter(Boolean).join(' ')}{assignment.subject_name ? `, ${assignment.subject_name}` : ''}
                            {assignment.teacher_name ? `, ${assignment.teacher_name}` : ''}
                        </p>
                    </div>
                    <Badge tone={overdue ? 'neutral' : 'info'} dot>{t(overdue ? 'assignmentsPage.closedOn' : 'assignmentsPage.dueOn', { date: df.date(assignment.due_date) })}</Badge>
                </div>
                {assignment.description && <p className="whitespace-pre-wrap type-body text-ink-2">{assignment.description}</p>}
                <div className="flex flex-col gap-1.5">
                    <p className="type-small text-ink-2">
                        <span className="type-body-semibold text-ink">{t('assignmentsPage.subs.handedIn', { n: formatCount(handedIn, lang), of: formatCount(subs.length, lang) })}</span>
                        {' · '}{t('assignmentsPage.subs.reviewedCount', { n: formatCount(count('graded'), lang) })}
                    </p>
                    <Meter value={subs.length ? handedIn / subs.length : 0} tone="brand" label={t('assignmentsPage.subs.handedInLabel')} />
                </div>
            </Card>

            {isPending ? (
                <Skeleton className="h-[360px] rounded-card" />
            ) : isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>
            ) : subs.length === 0 ? (
                <Card><EmptyState icon={Users} title={t('assignments.noSubmissions')}>{t('assignmentsPage.subs.noneBody')}</EmptyState></Card>
            ) : (
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                    <Card className="gap-0 overflow-hidden p-0">
                        <div className="flex flex-col gap-3 p-4 lg:p-5">
                            <FilterChips aria-label={t('assignmentsPage.subs.filter')} value={view} onChange={(v) => { setView(v); setSelected([]); }}
                                items={(['all', 'submitted', 'late', 'missing', 'pending', 'graded'] as View[])
                                    .filter((v) => v === 'all' || v === view || count(v) > 0)
                                    .map((v) => ({ value: v, label: t(`assignmentsPage.subs.view.${v}`), count: formatCount(count(v), lang) }))} />
                            {selected.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2 rounded-row bg-primary-soft px-3 py-2">
                                    <span className="type-small-semibold text-primary-text">{t('assignmentsPage.subs.selected', { count: selected.length, n: formatCount(selected.length, lang) })}</span>
                                    <span className="ml-auto flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setSelected([])}>{t('outstandingPage.clearSelection')}</Button>
                                        <Button size="sm" leftIcon={CheckCheck} loading={bulk.isPending} onClick={() => bulk.mutate(selected)}>
                                            {t('assignmentsPage.subs.markReviewedN', { count: selected.length, n: formatCount(selected.length, lang) })}
                                        </Button>
                                    </span>
                                </div>
                            ) : reviewable.length > 1 ? (
                                <Button variant="quiet" size="sm" leftIcon={CheckCheck} className="w-fit" onClick={() => setSelected(reviewable)}>
                                    {t('assignmentsPage.subs.tickWaiting', { n: formatCount(reviewable.length, lang) })}
                                </Button>
                            ) : null}
                        </div>
                        <ul className="flex flex-col divide-y divide-line-subtle border-t border-line-subtle">
                            {shown.map((s) => (
                                <li key={s.id} className={cn('flex items-center gap-3 px-4 py-2.5 lg:px-5', openId === s.student_id && 'bg-primary-soft/50')}>
                                    <Checkbox label={<span className="sr-only">{s.student_name}</span>} checked={selected.includes(s.student_id)} disabled={s.status !== 'submitted'} onChange={() => toggle(s.student_id)} />
                                    <button type="button" onClick={() => { setOpenId(s.student_id); setSheet(!window.matchMedia('(min-width: 1024px)').matches); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-row text-left outline-none focus-visible:ring-3 focus-visible:ring-focus/60">
                                        <span className="min-w-0 flex-1"><Person name={s.student_name || t('assignments.unnamedStudent')} sub={`${s.admission_no ?? ''}${s.admission_no ? ' · ' : ''}${when(s)}`} size={36} /></span>
                                        {s.grade && <span className="type-body-semibold text-primary-text">{s.grade}</span>}
                                        {statusBadge(s)}
                                    </button>
                                </li>
                            ))}
                            {shown.length === 0 && <li className="px-5 py-6 text-center type-small text-muted">{t('peoplePage.empty.filtered')}</li>}
                        </ul>
                    </Card>

                    <div className="max-lg:hidden lg:sticky lg:top-0">
                        {open ? (
                            <Card className="gap-3"><Review key={open.id} assignment={assignment} sub={open} badge={statusBadge(open)} when={when(open)} onDone={(msg) => { refresh(); setNotice({ tone: 'ok', title: msg }); }} /></Card>
                        ) : (
                            <Card><EmptyState icon={CheckCheck} title={t('assignmentsPage.subs.pickTitle')}>{t('assignmentsPage.subs.pickBody')}</EmptyState></Card>
                        )}
                    </div>
                </div>
            )}

            {/* Phones: one student's work opens as a sheet. */}
            {open && sheet && (
                <Dialog open onClose={() => setSheet(false)} title={open.student_name || t('assignments.unnamedStudent')} closeLabel={t('common.close')}>
                    <Review key={open.id} assignment={assignment} sub={open} badge={statusBadge(open)} when={when(open)} hideName
                        onDone={(msg) => { refresh(); setSheet(false); setNotice({ tone: 'ok', title: msg }); }} />
                </Dialog>
            )}
        </div>
    );
}

/** One student's work: grade, feedback, and what happens to it next. */
function Review({ assignment, sub, badge, when, hideName, onDone }: {
    assignment: Assignment;
    sub: Submission;
    badge: ReactNode;
    when: string;
    hideName?: boolean;
    onDone: (message: string) => void;
}) {
    const { t } = useTranslation();
    const [grade, setGrade] = useState(sub.grade ?? '');
    const [remarks, setRemarks] = useState(sub.remarks ?? '');
    const [error, setError] = useState<string | null>(null);
    const name = sub.student_name || t('assignments.unnamedStudent');

    const save = useMutation({
        mutationFn: (status: SubmissionStatus) => assignmentsService.updateSubmission(assignment.id, sub.student_id, { status, grade: grade || undefined, remarks: remarks.trim() || undefined }),
        onSuccess: (_r, status) => onDone(t(`assignmentsPage.subs.done.${status}`, { name })),
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const busy = save.isPending;

    return (
        <div className="flex flex-col gap-3.5">
            {!hideName && <CardHeader title={name} subtitle={sub.admission_no ?? undefined} action={badge} />}
            {hideName && <div className="flex items-center gap-2">{badge}</div>}
            <p className="type-small text-ink-2">{sub.submitted_at ? t('assignmentsPage.subs.handedInAt', { when }) : t('assignmentsPage.subs.notIn')}</p>
            {error && <Banner tone="bad" title={t('assignmentsPage.subs.failed')}>{error}</Banner>}

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 type-small-semibold text-ink">{t('assignmentsPage.subs.grade')}</legend>
                <div className="flex flex-wrap gap-1.5">
                    {GRADES.map((g) => (
                        <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(grade === g ? '' : g)}
                            className={cn('h-10 min-w-11 rounded-[10px] px-2.5 type-small-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                grade === g ? 'bg-primary text-on-primary' : 'bg-sunken text-ink-2 hover:text-ink')}>
                            {g}
                        </button>
                    ))}
                </div>
            </fieldset>
            <TextAreaField label={t('assignmentsPage.subs.feedback', { name: name.split(' ')[0] })} rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                hint={t('assignmentsPage.subs.feedbackHint')} />

            <div className="flex flex-wrap gap-2">
                <Button leftIcon={CheckCheck} loading={busy && save.variables === 'graded'} disabled={busy} onClick={() => { setError(null); save.mutate('graded'); }}>{t('assignmentsPage.subs.markReviewed')}</Button>
                {sub.status !== 'pending' && <Button variant="quiet" leftIcon={RotateCcw} disabled={busy} onClick={() => { setError(null); save.mutate('pending'); }}>{t('assignmentsPage.subs.return')}</Button>}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line-subtle pt-3">
                <span className="w-full type-caption text-muted">{t('assignmentsPage.subs.paperHint')}</span>
                {sub.status !== 'submitted' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => save.mutate('submitted')}>{t('assignmentsPage.subs.markIn')}</Button>}
                {sub.status !== 'missing' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => save.mutate('missing')}>{t('assignmentsPage.subs.markMissing')}</Button>}
            </div>
        </div>
    );
}
