import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookMarked, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList, Clock, Heart, Megaphone, Pencil, Umbrella, Users } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, Meter } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { aiService } from '../../api/services/ai.service';
import { assignmentsService } from '../../api/services/assignments.service';
import { noticesService } from '../../api/services/notices.service';
import type { MyRegister } from '../../api/services/attendance.service';
import type { TimetableSlot } from '../../api/services/timetable.service';
import { HeroChip, HeroPanel, HeroRow, HeroSkeleton, HomeHero } from '../../features/home/HomeHero';
import { LeaveBalanceMini } from '../../features/home/LeaveBalanceMini';
import { HomeGreeting, InlineEmpty, InlineError, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { useCurrentExam, useMarksProgress, useMyDay, useMyRegister, useWelfareFlags } from '../../features/home/queries';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

const minutesOf = (hhmm: string | null) => {
    const m = hhmm && /^(\d{1,2}):(\d{2})/.exec(hhmm);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Minutes since midnight, re-read every minute so "Now" moves on its own. */
function useClockMinutes() {
    const read = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
    const [now, setNow] = useState(read);
    useEffect(() => { const id = window.setInterval(() => setNow(read()), 60_000); return () => window.clearInterval(id); }, []);
    return now;
}

/**
 * Figma C01 Teacher home: the register first, then the day's periods, marks
 * still to enter, handed-in work to check, leave left and the latest notices.
 *
 * Adapted: "Call his mother" on the welfare flag opens the student's profile
 * (the phone numbers live there); the flag has no parent phone of its own.
 * "You usually finish by" is left out: no history of save times is kept.
 */
export default function TeacherHome() {
    const { t } = useTranslation();
    const registers = useMyRegister();
    const day = useMyDay();
    const regs = registers.data ?? [];
    // The register still to take comes first; once all are saved, the first one.
    const reg = regs.find((r) => !r.marked) ?? regs[0];
    const flags = useWelfareFlags(reg?.class_id, !!reg);

    return (
        <AppPage title={t('home.title')}>
            <HomeGreeting />
            {day.isError && (
                <Banner tone="bad" title={t('home.t.dayErrorTitle')}
                    action={<Button variant="quiet" size="sm" onClick={() => void day.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('home.t.dayErrorBody')}
                </Banner>
            )}

            {registers.isPending ? <HeroSkeleton label={t('home.t.heroLabel')} /> : registers.isError ? (
                <Card><InlineError title={t('home.t.registerError')} onRetry={() => void registers.refetch()} /></Card>
            ) : <RegisterHero reg={reg} others={regs.filter((r) => r !== reg)} flagCount={flags.data?.length ?? 0} firstFlag={flags.data?.[0]?.student_name} />}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="lg:hidden"><Welfare flags={flags} /></div>
                    <TodaysClasses day={day} />
                    <MarksEntry />
                    <div className="flex flex-col gap-4 lg:hidden"><ToReview /><LeaveBalanceMini /><LatestNotices /></div>
                </div>
                <div className="hidden min-w-0 flex-col gap-4 lg:flex">
                    <Welfare flags={flags} />
                    <ToReview />
                    <LeaveBalanceMini />
                    <LatestNotices />
                </div>
            </div>
        </AppPage>
    );
}

function RegisterHero({ reg, others, flagCount, firstFlag }: { reg?: MyRegister; others: MyRegister[]; flagCount: number; firstFlag?: string }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const name = reg ? `${reg.class_name ?? ''} ${reg.section_name}`.trim() : '';
    const leaveLine = reg?.on_leave_names.length
        ? t('home.t.onLeaveNames', { count: reg.on_leave_names.length, n: formatCount(reg.on_leave_names.length, df.lang), names: reg.on_leave_names.slice(0, 3).join(', ') + (reg.on_leave_names.length > 3 ? '…' : '') })
        : '';
    return (
        <HomeHero label={t('home.t.heroLabel')}
            side={reg && (
                <HeroPanel title={t('home.t.glanceTitle', { name })} className="lg:w-[280px]">
                    <HeroRow icon={<Users size={15} className="text-white/80" aria-hidden />}><p className="truncate type-caption-semibold">{t('home.t.onRoll', { count: reg.roll_count, n: formatCount(reg.roll_count, df.lang) })}</p></HeroRow>
                    <HeroRow icon={<Umbrella size={15} className="text-white/80" aria-hidden />}><p className="truncate type-caption-semibold">{t('home.t.onLeaveCount', { count: reg.on_leave, n: formatCount(reg.on_leave, df.lang) })}</p></HeroRow>
                    <HeroRow icon={<Heart size={15} className="text-white/80" aria-hidden />}>
                        <p className="truncate type-caption-semibold">{flagCount ? t('home.t.flagCount', { count: flagCount, n: formatCount(flagCount, df.lang), name: firstFlag }) : t('home.t.noFlags')}</p>
                    </HeroRow>
                    {reg.marked && (
                        <HeroRow icon={<Clock size={15} className="text-white/80" aria-hidden />}>
                            <p className="truncate type-caption-semibold">{t('home.t.tally', { p: formatCount(reg.present, df.lang), a: formatCount(reg.absent, df.lang) })}</p>
                        </HeroRow>
                    )}
                </HeroPanel>
            )}>
            {!reg ? (
                <>
                    <HeroChip dot="idle">{t('home.t.nothingChip')}</HeroChip>
                    <h2 className="type-h2 lg:type-display-l">{t('home.t.notSetUpTitle')}</h2>
                    <p className="type-body text-white/86">{t('home.t.notSetUpBody')}</p>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                        <Button variant="white" leftIcon={CalendarClock} onClick={() => navigate('/timetable')}>{t('home.t.openTimetable')}</Button>
                    </div>
                </>
            ) : reg.marked ? (
                <>
                    <HeroChip dot="ok">{t('home.t.savedChip', { time: df.time(reg.marked_at) })}</HeroChip>
                    <h2 className="type-h2 lg:type-display-l">{t('home.t.savedTitle', { name })}</h2>
                    <p className="type-body text-white/86">{t('home.t.savedBody', { count: reg.absent, n: formatCount(reg.absent, df.lang) })}</p>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                        <Button variant="white" leftIcon={CheckCircle2} onClick={() => navigate('/attendance')}>{t('home.t.openRegister')}</Button>
                    </div>
                </>
            ) : (
                <>
                    <HeroChip dot="warn">{t('home.t.notMarkedChip', { time: df.time(new Date()) })}</HeroChip>
                    <h2 className="type-h1 lg:type-display-l">{t('home.t.takeTitle', { name })}</h2>
                    <p className="type-body text-white/86">
                        {t('home.t.takeBody', { count: reg.roll_count, n: formatCount(reg.roll_count, df.lang) })}
                        {leaveLine && ` ${leaveLine}`} {t('home.t.smsLine')}
                    </p>
                    <div className="flex flex-col gap-2 pt-1.5 sm:flex-row sm:flex-wrap">
                        <Button variant="white" leftIcon={ClipboardCheck} onClick={() => navigate('/attendance')}>{t('home.t.takeRegister')}</Button>
                    </div>
                </>
            )}
            {others.length > 0 && (
                <p className="type-caption text-white/80">
                    {t('home.t.alsoYours', { list: others.map((o) => `${o.class_name ?? ''} ${o.section_name}`.trim() + (o.marked ? ` ✓` : '')).join(', ') })}
                </p>
            )}
        </HomeHero>
    );
}

function Welfare({ flags }: { flags: ReturnType<typeof useWelfareFlags> }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const qc = useQueryClient();
    const dismiss = useMutation({
        mutationFn: (studentId: number) => aiService.dismissRiskFlag(studentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'risk-flags'] }),
    });
    if (flags.isPending && flags.fetchStatus === 'idle') return null;
    if (flags.isPending) return <Card><RowsSkeleton rows={1} /></Card>;
    if (flags.isError || flags.data.length === 0) return null;
    return (
        <Card className="gap-3 border-bad-line bg-linear-to-r from-bad-soft to-surface to-60%">
            {flags.data.slice(0, 2).map((f) => (
                <div key={f.student_id} className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <span className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-bad-soft text-bad"><Heart size={18} aria-hidden /></span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="type-body-semibold text-ink">{t('home.t.flagTitle', { name: f.student_name, count: f.consecutive_absences, n: formatCount(f.consecutive_absences, lang) })}</p>
                            <p className="type-small text-ink-2">{t('home.t.flagBody', { pct: formatCount(Math.round(f.attendance_pct), lang) })}</p>
                            <p className="type-caption text-muted">{t('home.t.flagNote')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 lg:pl-[50px]">
                        <Link to={`/people/students/${f.student_id}`}
                            className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-line bg-surface px-3.5 type-small-semibold text-ink outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60 lg:flex-none">
                            {t('home.t.contactFamily')}
                        </Link>
                        <Button variant="ghost" size="sm" loading={dismiss.isPending && dismiss.variables === f.student_id} onClick={() => dismiss.mutate(f.student_id)}>{t('home.t.markChecked')}</Button>
                    </div>
                </div>
            ))}
        </Card>
    );
}

function TodaysClasses({ day }: { day: ReturnType<typeof useMyDay> }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const now = useClockMinutes();
    const [all, setAll] = useState(false);
    const slots = day.data ?? [];
    const idx = slots.findIndex((s) => { const a = minutesOf(s.start_time), b = minutesOf(s.end_time); return a !== null && b !== null && now >= a && now < b; });
    const nextIdx = slots.findIndex((s) => { const a = minutesOf(s.start_time); return a !== null && a > now; });
    const next = slots[nextIdx];
    const sub = slots.length === 0 ? t('home.t.dayEmptySub')
        : next ? t('home.t.daySub', { count: slots.length, n: formatCount(slots.length, df.lang), subject: next.subject_name, cls: `${next.class_name} ${next.section_name}`, time: df.time(next.start_time) })
            : t('home.t.dayDoneSub', { count: slots.length, n: formatCount(slots.length, df.lang) });
    const shown = all ? slots : slots.slice(0, 4);
    const row = (s: TimetableSlot, i: number) => {
        const isNow = i === idx;
        return (
            <li key={s.id} className={cn('flex items-center gap-3 rounded-row px-3 py-2.5', isNow && 'bg-primary-soft ring-1 ring-inset ring-primary-soft-line')}>
                <div className="flex w-16 shrink-0 flex-col lg:w-[76px]">
                    <span className={cn('type-small-semibold', isNow ? 'text-primary-text' : 'text-ink')}>{s.start_time ? df.time(s.start_time) : t('home.t.period', { n: formatCount(s.period_number, df.lang) })}</span>
                    {s.end_time && <span className="type-micro text-muted">{t('home.t.to', { time: df.time(s.end_time) })}</span>}
                </div>
                <span aria-hidden className={cn('h-[34px] w-[3px] shrink-0 rounded-sm', isNow ? 'bg-primary' : 'bg-primary/25')} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate type-body-semibold text-ink">{s.subject_name}</p>
                    <p className="truncate type-caption text-muted">{s.class_name} {s.section_name}</p>
                </div>
                {isNow ? <Badge tone="brand">{t('home.t.now')}</Badge> : i === nextIdx ? <Badge tone="neutral">{t('home.t.next')}</Badge> : null}
            </li>
        );
    };
    return (
        <Card className="gap-2">
            <CardHeader title={t('home.t.dayTitle')} subtitle={day.isSuccess ? sub : undefined}
                action={<Button variant="ghost" size="sm" rightIcon={ArrowRight} className="max-sm:hidden" onClick={() => navigate('/timetable')}>{t('home.t.fullTimetable')}</Button>} />
            {day.isPending ? <RowsSkeleton rows={5} /> : day.isError ? <InlineError title={t('home.t.dayErrorShort')} onRetry={() => void day.refetch()} /> : slots.length === 0 ? (
                <InlineEmpty icon={CalendarClock} title={t('home.t.dayEmptyTitle')}>{t('home.t.dayEmptyBody')}</InlineEmpty>
            ) : (
                <>
                    <ol className="flex flex-col gap-0.5">{shown.map((s) => row(s, slots.indexOf(s)))}</ol>
                    {slots.length > 4 && (
                        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                            {all ? t('home.t.showLess') : t('home.t.showAll', { count: slots.length - 4, n: formatCount(slots.length - 4, df.lang) })}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}

function MarksEntry() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const exams = useCurrentExam();
    const examId = exams.data?.current?.id;
    const progress = useMarksProgress(examId);
    const rows = [...(progress.data?.entries ?? [])].sort((a, b) => a.completion_pct - b.completion_pct);
    const open = rows.find((r) => r.marks_entered < r.total_enrolled);
    const loading = exams.isPending || (!!examId && progress.isPending);
    // Least entered first; the finished papers are rarely worth the space.
    const [all, setAll] = useState(false);
    const shown = all ? rows : rows.slice(0, 5);
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('home.t.marksTitle')} subtitle={progress.data?.exam_name ?? (loading ? undefined : t('home.t.nothingToEnter'))} />
            {loading ? <RowsSkeleton rows={3} /> : exams.isError ? <InlineError title={t('home.c.progressError')} onRetry={() => void exams.refetch()} />
                : progress.isError ? <InlineError title={t('home.c.progressError')} onRetry={() => void progress.refetch()} />
                    : rows.length === 0 ? <InlineEmpty icon={BookMarked} title={t('home.t.noPapers')}>{t('home.t.noPapersBody')}</InlineEmpty> : (
                        <>
                            <ul className="flex flex-col gap-3">
                                {shown.map((r) => {
                                    const done = r.total_enrolled > 0 && r.marks_entered >= r.total_enrolled;
                                    return (
                                        <li key={r.schedule_id} className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="min-w-0 flex-1 truncate type-small-semibold text-ink">{`${r.class_name} ${r.section_name}, ${r.subject_name}`}</span>
                                                {done ? <Badge tone="ok">{t('home.c.done')}</Badge>
                                                    : <span className={cn('shrink-0 type-small-semibold', r.marks_entered ? 'text-ink-2' : 'text-muted')}>{t('home.c.ofN', { a: formatCount(r.marks_entered, lang), b: formatCount(r.total_enrolled, lang) })}</span>}
                                            </div>
                                            <Meter value={r.total_enrolled ? r.marks_entered / r.total_enrolled : 0} tone={done ? 'ok' : 'brand'} height={6} label={`${r.class_name} ${r.subject_name}`} />
                                        </li>
                                    );
                                })}
                            </ul>
                            {rows.length > 5 && (
                                <Button variant="ghost" size="sm" className="w-fit" onClick={() => setAll((v) => !v)}>
                                    {all ? t('home.t.showLess') : t('home.t.showAllPapers', { count: rows.length, n: formatCount(rows.length, lang) })}
                                </Button>
                            )}
                            <Button variant="secondary" leftIcon={Pencil} className="max-sm:w-full sm:w-fit" onClick={() => navigate('/marks')}>
                                {open ? t('home.t.continueMarks', { paper: `${open.class_name} ${open.section_name} ${open.subject_name}` }) : t('home.c.openMarks')}
                            </Button>
                        </>
                    )}
        </Card>
    );
}

function ToReview() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const q = useQuery({ queryKey: ['assignments', 'my-classes'], queryFn: () => assignmentsService.listMyAssignments(), staleTime: 2 * 60 * 1000 });
    const waiting = (q.data?.assignments ?? []).filter((a) => a.submitted_count > a.graded_count).sort((a, b) => a.due_date.localeCompare(b.due_date));
    return (
        <Card className="gap-1.5">
            <CardHeader title={waiting.length ? t('home.t.reviewTitleN', { n: formatCount(waiting.length, df.lang) }) : t('home.t.reviewTitle')}
                subtitle={q.isSuccess ? (waiting.length ? t('home.t.reviewSub') : t('home.t.caughtUp')) : undefined} />
            {q.isPending ? <RowsSkeleton rows={2} /> : q.isError ? <InlineError title={t('home.t.reviewError')} onRetry={() => void q.refetch()} /> : waiting.length === 0 ? (
                <InlineEmpty icon={ClipboardList} title={t('home.t.nothingToReview')}>{t('home.t.nothingToReviewBody')}</InlineEmpty>
            ) : (
                <ul>
                    {waiting.slice(0, 3).map((a) => (
                        <ItemRow key={a.id} icon={ClipboardList} tone="warn" title={<span className="block truncate">{a.title}</span>}
                            sub={<span className="block truncate">{t('home.t.reviewLine', { cls: [a.class_name, a.section_name].filter(Boolean).join(' '), a: formatCount(a.submitted_count - a.graded_count, df.lang), due: df.date(a.due_date, 'dayMonth').split(', ').pop() })}</span>}
                            trailing={<Link to="/assignments" className="shrink-0 rounded-full px-3 py-1.5 type-small-semibold text-primary-text outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">{t('home.t.review')}</Link>} />
                    ))}
                </ul>
            )}
        </Card>
    );
}

function LatestNotices() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const q = useQuery({ queryKey: ['notices', 'home', 2], queryFn: () => noticesService.getNotices({ limit: 2 }), staleTime: 2 * 60 * 1000 });
    return (
        <Card className="gap-1.5">
            <CardHeader title={t('home.t.notices')} action={<Link to="/communication" className="rounded-full px-3 py-1.5 type-small-semibold text-primary-text outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">{t('home.t.allNotices')}</Link>} />
            {q.isPending ? <RowsSkeleton rows={2} /> : q.isError ? <InlineError title={t('home.t.noticesError')} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
                <p className="type-small text-muted">{t('home.t.noNotices')}</p>
            ) : (
                <ul>
                    {q.data.slice(0, 2).map((n) => (
                        <ItemRow key={n.id} icon={Megaphone} title={n.title}
                            sub={[n.posted_by_name && t('home.t.from', { name: n.posted_by_name }), df.relative(n.created_at)].filter(Boolean).join(', ')} />
                    ))}
                </ul>
            )}
        </Card>
    );
}
