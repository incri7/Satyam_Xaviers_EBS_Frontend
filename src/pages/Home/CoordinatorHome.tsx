import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookMarked, CheckCircle2, ClipboardCheck, Clock, Heart, UserX } from 'lucide-react';

import { Avatar, Badge, Button, Card, CardHeader, Meter, Person, SelectField, Skeleton } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { useTodaySummary } from '../../features/dashboard/queries';
import { HomeGreeting, InlineEmpty, InlineError, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { Ring } from '../../features/home/Ring';
import { LeaveBalanceMini } from '../../features/home/LeaveBalanceMini';
import { useAbsentToday, useCurrentExam, useMarksProgress, useWelfareFlags } from '../../features/home/queries';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';

const toneOf = (f: number) => (f >= 1 ? 'ok' : f >= 0.5 ? 'warn' : 'bad') as 'ok' | 'warn' | 'bad';

/**
 * Figma B06 Coordinator home: registers, marks entry and welfare at a glance,
 * then the work behind each: marks progress per paper, today's attendance
 * with the registers still open, welfare flags, who is absent, own leave.
 *
 * Adapted: the leave approval queue is left out. Coordinators do not decide
 * or see other people's leave in this system (admin and principal do), so
 * "Leave waiting" is replaced by "Absent today". The "Remind" buttons are
 * left out too: the API has no reminder to teachers.
 */
export default function CoordinatorHome() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const summary = useTodaySummary();
    const exams = useCurrentExam();
    const [picked, setPicked] = useState<number | null>(null);
    const examId = picked ?? exams.data?.current?.id;
    const progress = useMarksProgress(examId);
    const flags = useWelfareFlags();
    const absent = useAbsentToday();

    const s = summary.data;
    const p = progress.data;
    const entered = p?.entries.reduce((a, e) => a + e.marks_entered, 0) ?? 0;
    const expected = p?.entries.reduce((a, e) => a + e.total_enrolled, 0) ?? 0;
    const statusOf = (q: { isPending: boolean; isError: boolean }) => (q.isError ? 'error' : q.isPending ? 'loading' : 'ready') as 'error' | 'loading' | 'ready';

    return (
        <AppPage title={t('home.title')}>
            <HomeGreeting />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
                <KpiCard icon={ClipboardCheck} tone="ok" label={t('home.c.registers')} to="/attendance" status={statusOf(summary)} onRetry={() => void summary.refetch()}
                    value={s ? t('home.c.ofN', { a: formatCount(s.sections_marked, lang), b: formatCount(s.sections_total, lang) }) : ''}
                    sub={<span className="truncate">{s && s.sections_total > s.sections_marked ? t('home.c.stillOpen', { count: s.sections_total - s.sections_marked, n: formatCount(s.sections_total - s.sections_marked, lang) }) : t('home.c.allSaved')}</span>} />
                <KpiCard icon={UserX} tone="bad" label={t('home.c.absentToday')} status={statusOf(summary)} onRetry={() => void summary.refetch()}
                    value={formatCount(s?.absent ?? 0, lang)}
                    sub={<span className="truncate">{s?.marked ? t('home.c.ofMarked', { n: formatCount(s.marked, lang) }) : t('home.c.notMarkedYet')}</span>} />
                <KpiCard icon={BookMarked} tone="info" label={t('home.c.marksEntered')} to="/marks" status={examId ? statusOf(progress) : statusOf(exams)} onRetry={() => void progress.refetch()}
                    value={p ? `${formatCount(Math.round(p.overall_pct), lang)}%` : exams.data?.current ? '' : t('home.c.noneOpen')}
                    sub={<span className="truncate">{p ? t('home.c.enteredSub', { exam: p.exam_name, a: formatCount(entered, lang), b: formatCount(expected, lang) }) : t('home.c.nothingToEnter')}</span>} />
                <KpiCard icon={Heart} tone="bad" label={t('home.c.welfare')} status={statusOf(flags)} onRetry={() => void flags.refetch()}
                    value={flags.data?.length ? formatCount(flags.data.length, lang) : t('home.c.none')}
                    sub={<span className="truncate">{flags.data?.length ? t('home.c.needCheckIn') : t('home.c.noCheckIn')}</span>} />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                    <MarksProgress exams={exams.data?.exams ?? []} examId={examId} onPick={setPicked} progress={progress} entered={entered} expected={expected} loadingExams={exams.isPending} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <AttendanceToday summary={summary} />
                    <Card className="gap-2">
                        <CardHeader title={t('home.c.welfare')} subtitle={t('home.c.welfareSub')} />
                        {flags.isPending ? <RowsSkeleton rows={2} /> : flags.isError ? <InlineError title={t('home.c.welfareError')} onRetry={() => void flags.refetch()} /> : flags.data.length === 0 ? (
                            <p className="flex items-center gap-2.5 rounded-row bg-ok-soft px-3 py-2.5 type-small text-ink-2"><CheckCircle2 size={18} className="shrink-0 text-ok" aria-hidden />{t('home.c.noCheckIn')}</p>
                        ) : (
                            <ul>
                                {flags.data.slice(0, 4).map((f) => (
                                    <ItemRow key={f.student_id} icon={Heart} tone="bad" title={f.student_name}
                                        sub={t('home.c.absentInRow', { count: f.consecutive_absences, n: formatCount(f.consecutive_absences, lang) })}
                                        trailing={<Link to={`/people/students/${f.student_id}`} className="rounded-full px-3 py-1.5 type-small-semibold text-primary-text outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">{t('home.p.checkIn')}</Link>} />
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card className="gap-1">
                        <CardHeader title={t('home.c.absentToday')} action={absent.data && <Badge tone={absent.data.count ? 'bad' : 'neutral'}>{formatCount(absent.data.count, lang)}</Badge>} />
                        {absent.isPending ? <RowsSkeleton rows={3} /> : absent.isError ? <InlineError title={t('home.c.absentError')} onRetry={() => void absent.refetch()} /> : !absent.data.count ? (
                            <p className="type-small text-muted">{absent.data.any_marked ? t('home.c.everyonePresent') : t('home.c.notMarkedYet')}</p>
                        ) : (
                            <>
                                <ul>
                                    {absent.data.students.slice(0, 5).map((st) => (
                                        <li key={st.student_id} className="flex items-center gap-2.5 border-b border-line-subtle py-2 last:border-b-0">
                                            <Avatar name={st.student_name} size={28} />
                                            <Link to={`/people/students/${st.student_id}`} className="min-w-0 flex-1 truncate type-small-semibold text-ink outline-none hover:underline">{st.student_name}</Link>
                                            <span className="shrink-0 type-caption text-muted">{[st.class_name, st.section_name].filter(Boolean).join(' ')}</span>
                                        </li>
                                    ))}
                                </ul>
                                {absent.data.count > 5 && <Link to="/attendance" className="pt-2 text-center type-small-semibold text-primary-text hover:underline">{t('home.c.seeAllAbsent', { n: formatCount(absent.data.count, lang) })}</Link>}
                            </>
                        )}
                    </Card>
                    <LeaveBalanceMini />
                </div>
            </div>
        </AppPage>
    );
}

/** Rows before "Show all": the teachers furthest behind. */
const SHOWN = 6;

interface TeacherProgress { key: string; teacher: string | null; papers: string[]; classes: string[]; entered: number; expected: number }

/**
 * One row per subject teacher, not per paper: a school-wide exam has a
 * hundred papers, and the coordinator follows up with people. Furthest
 * behind first; papers with no subject teacher are grouped together.
 */
function byTeacher(entries: NonNullable<ReturnType<typeof useMarksProgress>['data']>['entries']): TeacherProgress[] {
    const map = new Map<string, TeacherProgress>();
    for (const e of entries) {
        const key = e.teacher_id ? `t${e.teacher_id}` : 'none';
        const row = map.get(key) ?? { key, teacher: e.teacher_name ?? null, papers: [], classes: [], entered: 0, expected: 0 };
        const cls = `${e.class_name} ${e.section_name}`;
        row.papers.push(`${e.subject_name}, ${cls}`);
        if (!row.classes.includes(cls)) row.classes.push(cls);
        row.entered += e.marks_entered;
        row.expected += e.total_enrolled;
        map.set(key, row);
    }
    const frac = (r: TeacherProgress) => (r.expected ? r.entered / r.expected : 0);
    return [...map.values()].sort((a, b) => frac(a) - frac(b) || b.expected - a.expected);
}

function MarksProgress({ exams, examId, onPick, progress, entered, expected, loadingExams }: {
    exams: { id: number; name: string }[];
    examId?: number;
    onPick: (id: number) => void;
    progress: ReturnType<typeof useMarksProgress>;
    entered: number;
    expected: number;
    loadingExams: boolean;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const titleId = useId();
    const [all, setAll] = useState(false);
    const rows = byTeacher(progress.data?.entries ?? []);
    const shown = all ? rows : rows.slice(0, SHOWN);
    return (
        <Card aria-labelledby={titleId} className="gap-3.5">
            <CardHeader titleId={titleId} title={t('home.c.marksProgress')}
                subtitle={progress.data ? progress.data.exam_name : exams.length ? undefined : t('home.c.noExamOpen')}
                action={exams.length > 1 && (
                    <SelectField label={t('home.c.exam')} value={String(examId ?? '')} onChange={(e) => onPick(Number(e.target.value))} containerClassName="w-[240px] max-sm:hidden"
                        options={exams.map((e) => ({ value: String(e.id), label: e.name }))} />
                )} />
            {exams.length > 1 && (
                <SelectField label={t('home.c.exam')} value={String(examId ?? '')} onChange={(e) => onPick(Number(e.target.value))} containerClassName="sm:hidden"
                    options={exams.map((e) => ({ value: String(e.id), label: e.name }))} />
            )}
            {loadingExams || (examId && progress.isPending) ? <RowsSkeleton rows={4} /> : !examId ? (
                <InlineEmpty icon={BookMarked} title={t('home.c.progressEmpty')}
                    action={<Button variant="quiet" size="sm" onClick={() => navigate('/marks')}>{t('home.c.openMarks')}</Button>} />
            ) : progress.isError ? <InlineError title={t('home.c.progressError')} onRetry={() => void progress.refetch()} /> : rows.length === 0 ? (
                <InlineEmpty icon={BookMarked} title={t('home.c.noPapers')} />
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <span className="type-figure-m text-ink">{formatCount(Math.round(progress.data!.overall_pct), lang)}%</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <p className="type-small text-ink-2">{t('home.c.overallTeachers', { a: formatCount(entered, lang), b: formatCount(expected, lang), count: rows.length, n: formatCount(rows.length, lang) })}</p>
                            <Meter value={expected ? entered / expected : 0} tone="info" height={8} label={t('home.c.marksProgress')} />
                        </div>
                    </div>
                    <ul>
                        {shown.map((r) => {
                            const f = r.expected ? r.entered / r.expected : 0;
                            const name = r.teacher ?? t('home.c.noTeacher');
                            const sub = r.papers.length <= 2 ? r.papers.join(', ')
                                : t('home.c.papersIn', { count: r.papers.length, n: formatCount(r.papers.length, lang), classes: r.classes.slice(0, 3).join(', ') + (r.classes.length > 3 ? '…' : '') });
                            return (
                                <li key={r.key} className="flex flex-col gap-2 border-b border-line-subtle py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3.5">
                                    <div className="min-w-0 sm:w-[260px]">
                                        <Person name={name} sub={sub} />
                                    </div>
                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                        <Meter value={f} tone={toneOf(f)} height={6} label={name} />
                                        <span className={`w-10 shrink-0 text-right type-caption-semibold ${f >= 1 ? 'text-ok' : f >= 0.5 ? 'text-warn' : 'text-bad'}`}>{formatCount(Math.round(f * 100), lang)}%</span>
                                    </div>
                                    <span className="shrink-0 type-small text-ink-2 sm:w-20 sm:text-right">{f >= 1 ? <Badge tone="ok">{t('home.c.done')}</Badge> : t('home.c.ofN', { a: formatCount(r.entered, lang), b: formatCount(r.expected, lang) })}</span>
                                </li>
                            );
                        })}
                    </ul>
                    {rows.length > SHOWN && (
                        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                            {all ? t('home.t.showLess') : t('home.c.showAllTeachers', { count: rows.length, n: formatCount(rows.length, lang) })}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}

function AttendanceToday({ summary }: { summary: ReturnType<typeof useTodaySummary> }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const s = summary.data;
    return (
        <Card className="gap-3.5">
            <CardHeader title={t('home.c.attendanceToday')} subtitle={s?.marked ? t('home.c.liveSub') : t('home.c.opensAt')} />
            {summary.isPending ? <Skeleton className="h-28 rounded-row" /> : summary.isError ? <InlineError title={t('home.c.attendanceError')} onRetry={() => void summary.refetch()} /> : s && (
                <>
                    <div className="flex items-center gap-[18px]">
                        <Ring value={s.sections_total ? s.sections_marked / s.sections_total : 0} size={96} stroke={9} tone="ok"
                            label={`${formatCount(s.sections_marked, lang)}/${formatCount(s.sections_total, lang)}`} sub={t('home.c.saved')} />
                        <ul className="flex flex-col gap-2">
                            {[[s.present, 'present', 'bg-ok'], [s.absent, 'absent', 'bg-bad'], [s.on_leave, 'onLeave', 'bg-warn']].map(([v, k, dot]) => (
                                <li key={k as string} className="flex items-center gap-2">
                                    <span aria-hidden className={`size-2 rounded-full ${dot}`} />
                                    <span className="type-body-semibold text-ink">{formatCount(v as number, lang)}</span>
                                    <span className="type-small text-muted">{t(`home.c.${k}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {s.unmarked_sections.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <p className="type-caption-semibold text-muted">{t('home.c.notSavedYet')}</p>
                            <ul>
                                {s.unmarked_sections.slice(0, 4).map((u) => (
                                    <ItemRow key={u.section_id} icon={Clock} tone="warn" title={`${u.class_name} ${u.section_name}`}
                                        sub={u.class_teacher_name ?? t('home.c.noClassTeacher')} />
                                ))}
                            </ul>
                            {s.unmarked_sections.length > 4 && <p className="type-caption text-muted">{t('home.p.andMore', { n: s.unmarked_sections.length - 4 })}</p>}
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
