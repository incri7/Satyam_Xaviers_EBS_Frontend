import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart2, Check, CheckCircle2, CloudOff, ClipboardList, Megaphone, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, type BadgeTone } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { noticesService } from '../../api/services/notices.service';
import { studentService, type AssignmentSummary, type StudentHomeData, type TodaySlot } from '../../api/services/student.service';
import { HeroChip, HeroSkeleton, HomeHero } from '../../features/home/HomeHero';
import { HomeGreeting, InlineEmpty, InlineError, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { Ring } from '../../features/home/Ring';
import { WeekStrip } from '../../features/parent/parts';
import { errorText } from '../../features/people/format';
import { markText } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const minutesOf = (hhmm: string | null) => {
    const m = hhmm && /^(\d{1,2}):(\d{2})/.exec(hhmm);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function useNowMinutes() {
    const read = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
    const [now, setNow] = useState(read);
    useEffect(() => { const id = window.setInterval(() => setNow(read()), 60_000); return () => window.clearInterval(id); }, []);
    return now;
}

/**
 * Figma D07 Student home, from one call: today's status and periods, work due
 * (missing first), the latest exam with its trend, this year's attendance on
 * school days, and the latest notices.
 *
 * Adapted: students have no timetable or marks page to link to, so "Full
 * timetable" and "All marks" are left out and Submit sits on every row; rooms
 * are not in the timetable data, so a period shows its teacher.
 */
export default function StudentHome() {
    const { t } = useTranslation();
    const q = useQuery({ queryKey: ['student', 'home'], queryFn: studentService.getHome, staleTime: 60 * 1000 });

    return (
        <AppPage title={t('home.title')}>
            <HomeGreeting />
            {q.isError ? (
                <>
                    <Banner tone="bad" title={t('studentHome.errorTitle')}
                        action={<Button variant="quiet" size="sm" onClick={() => void q.refetch()}>{t('classesPage.action.retry')}</Button>}>
                        {t('studentHome.errorBody')}
                    </Banner>
                    <EmptyState icon={CloudOff} tone="bad" title={t('studentHome.nothingTitle')}>{t('studentHome.nothingBody')}</EmptyState>
                </>
            ) : q.isPending ? (
                <>
                    <HeroSkeleton label={t('studentHome.today')} />
                    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-[18px]">
                        <Card><RowsSkeleton rows={4} /></Card><Card><RowsSkeleton rows={3} /></Card>
                    </div>
                </>
            ) : (
                <>
                    <TodayHero data={q.data} />
                    <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-[18px]">
                        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-[18px]">
                            <DueThisWeek items={q.data.pending_assignments} cls={[q.data.class_name, q.data.section_name].filter(Boolean).join(' ')} />
                            <RecentMarks data={q.data} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-[18px]">
                            <AttendanceYear data={q.data} />
                            <Notices />
                        </div>
                    </div>
                </>
            )}
        </AppPage>
    );
}

function TodayHero({ data }: { data: StudentHomeData }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const now = useNowMinutes();
    const stripRef = useRef<HTMLOListElement>(null);
    const slots = data.today_timetable;
    const idx = slots.findIndex((s) => { const a = minutesOf(s.start_time), b = minutesOf(s.end_time); return a !== null && b !== null && now >= a && now < b; });
    const nextIdx = slots.findIndex((s) => { const a = minutesOf(s.start_time); return a !== null && a > now; });
    const current = slots[idx];
    const next = slots[nextIdx];
    const status = data.today_status;

    // Keep "Now" in view on a phone, where the strip scrolls sideways.
    useEffect(() => {
        stripRef.current?.querySelector('[data-now]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, [idx]);

    const chip = status === 'P' ? t('studentHome.present', { time: df.time(data.marked_at) })
        : status === 'A' ? t('studentHome.absent') : status === 'L' ? t('studentHome.onLeave') : status === 'HD' ? t('studentHome.halfDay') : t('studentHome.notMarked');
    const title = current ? t('studentHome.now', { subject: current.subject_name, time: df.time(current.end_time) })
        : next ? t(idx === -1 && nextIdx === 0 ? 'studentHome.first' : 'studentHome.nextUp', { subject: next.subject_name, time: df.time(next.start_time) })
            : slots.length ? t('studentHome.doneToday') : t('studentHome.noPeriods');
    const line = current ? [current.teacher_name, next && t('studentHome.thenNext', { subject: next.subject_name })].filter(Boolean).join('. ')
        : t('studentHome.welcome', { cls: [data.class_name, data.section_name].filter(Boolean).join(' ') });

    return (
        <HomeHero label={t('studentHome.today')} className="lg:flex-col lg:items-stretch">
            <HeroChip dot={status === 'P' || status === 'HD' ? 'ok' : status === 'not_marked' ? 'warn' : 'idle'}>{chip}</HeroChip>
            <h2 className="type-h2 lg:type-h1">{title}</h2>
            <p className="type-body text-white/84">{line}</p>
            {slots.length > 0 && (
                <ol ref={stripRef} aria-label={t('studentHome.periods')} className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pt-1.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
                    {slots.map((s: TodaySlot, i) => {
                        const isNow = i === idx;
                        const past = !isNow && (minutesOf(s.end_time) ?? 0) <= now && (idx === -1 ? nextIdx === -1 || i < nextIdx : i < idx);
                        return (
                            <li key={`${s.period_number}-${i}`} data-now={isNow || undefined} aria-current={isNow ? 'time' : undefined}
                                className={cn('flex w-[124px] shrink-0 flex-col gap-0.5 rounded-[14px] px-3 py-2.5 lg:w-auto lg:flex-1',
                                    isNow ? 'bg-white text-ink' : past ? 'bg-white/6 ring-1 ring-inset ring-white/16' : 'bg-white/12 ring-1 ring-inset ring-white/16')}>
                                <span className="flex items-center gap-1.5">
                                    <span className={cn('flex-1 type-micro-bold', isNow ? 'text-primary-text' : 'text-white/70')}>{s.start_time ? df.time(s.start_time) : t('home.t.period', { n: s.period_number })}</span>
                                    {past && <Check size={12} className="text-[#9BE8C6]" aria-label={t('studentHome.finished')} />}
                                    {isNow && <span className="rounded-full bg-primary px-1.5 type-micro-bold text-white">{t('home.t.now')}</span>}
                                </span>
                                <span className={cn('truncate type-small-semibold', isNow ? 'text-ink' : past ? 'text-white/60' : 'text-white')}>{s.subject_name}</span>
                                <span className={cn('truncate type-micro', isNow ? 'text-muted' : 'text-white/60')}>{s.teacher_name ?? '—'}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </HomeHero>
    );
}

function DueThisWeek({ items, cls }: { items: AssignmentSummary[]; cls: string }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const submit = useMutation({
        mutationFn: (id: number) => studentService.submitAssignment(id),
        onSuccess: () => { void qc.invalidateQueries({ queryKey: ['student', 'home'] }); },
    });
    const today = isoLocal(new Date());
    const [all, setAll] = useState(false);
    const toDo = items.filter((a) => a.submission_status === 'pending' || a.submission_status === 'missing').length;
    const daysLeft = (due: string) => Math.round((new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
    const badge = (a: AssignmentSummary): [string, BadgeTone] => {
        if (a.submission_status === 'missing') return [t('studentHome.missing'), 'bad'];
        if (a.submission_status === 'graded') return [a.grade ? t('studentHome.gradedAs', { grade: a.grade }) : t('studentHome.graded'), 'brand'];
        if (a.submission_status === 'submitted') return [t('studentHome.submitted'), 'ok'];
        const n = daysLeft(a.due_date);
        return [n <= 0 ? t('studentHome.dueToday') : t('studentHome.inDays', { count: n, n: formatCount(n, df.lang) }), n <= 2 ? 'warn' : 'neutral'];
    };
    return (
        <Card className="gap-1">
            <CardHeader title={t('studentHome.dueWeek')} subtitle={items.length ? t('studentHome.dueWeekSub') : undefined}
                action={<Badge tone={toDo ? 'warn' : 'neutral'}>{toDo ? t('studentHome.toDo', { n: formatCount(toDo, df.lang) }) : formatCount(0, df.lang)}</Badge>} />
            {submit.isError && <Banner tone="bad" title={t('studentHome.submitFailed')}>{errorText(submit.error, t('parent.failedSubmit'))}</Banner>}
            {items.length === 0 ? (
                <InlineEmpty icon={CheckCircle2} title={t('studentHome.nothingDue')}>{t('studentHome.nothingDueBody', { cls })}</InlineEmpty>
            ) : (
                <>
                    <ul>
                        {(all ? items : items.slice(0, 8)).map((a) => {
                            const [label, tone] = badge(a);
                            const canSubmit = a.submission_status === 'pending' || a.submission_status === 'missing';
                            const late = a.submission_status === 'missing';
                            return (
                                <ItemRow key={a.id} icon={ClipboardList} tone={late ? 'bad' : 'brand'}
                                    title={<span className="block truncate">{a.title}</span>}
                                    sub={<span className={cn('block truncate', late && 'text-bad')}>{`${a.subject_name}. ${t(late ? 'studentHome.wasDue' : 'studentHome.due', { date: df.date(a.due_date, 'dayMonth') })}`}</span>}
                                    trailing={
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge tone={tone} className="max-sm:hidden">{label}</Badge>
                                            {canSubmit ? (
                                                <Button variant={late ? 'primary' : 'secondary'} size="sm" loading={submit.isPending && submit.variables === a.id}
                                                    disabled={submit.isPending} onClick={() => submit.mutate(a.id)}>
                                                    {late ? t('studentHome.submitLate') : t('studentHome.submit')}
                                                </Button>
                                            ) : <Badge tone={tone} className="sm:hidden">{label}</Badge>}
                                        </div>
                                    } />
                            );
                        })}
                    </ul>
                    {items.length > 8 && (
                        <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                            {all ? t('home.t.showLess') : t('childPage.showAll', { n: items.length })}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}

function RecentMarks({ data }: { data: StudentHomeData }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const trend = data.exam_trend.filter((e) => e.percent !== null);
    const latest = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const diff = latest && prev ? Math.round((latest.percent! - prev.percent!) * 10) / 10 : null;
    const ICON = { up: [TrendingUp, 'text-ok'], down: [TrendingDown, 'text-bad'], stable: [Minus, 'text-muted'], first: [Minus, 'text-muted'] } as const;
    return (
        <Card className="gap-3.5">
            <CardHeader title={t('studentHome.recentMarks')} subtitle={data.latest_exam_name ?? undefined} />
            {!latest ? (
                <InlineEmpty icon={BarChart2} title={t('studentHome.noMarks')}>{t('studentHome.noMarksBody')}</InlineEmpty>
            ) : (
                <>
                    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-5">
                        <div className="flex flex-col gap-1 md:w-[170px]">
                            <span className="type-caption text-muted">{t('studentHome.average')}</span>
                            <span className="type-figure-l text-ink">{formatCount(latest.percent!, lang)}%</span>
                            {diff !== null && Math.abs(diff) >= 0.1 && (
                                <span className={cn('flex items-center gap-1.5 type-caption-semibold', diff > 0 ? 'text-ok' : 'text-bad')}>
                                    {diff > 0 ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
                                    {t(diff > 0 ? 'studentHome.upSince' : 'studentHome.downSince', { n: formatCount(Math.abs(diff), lang), exam: prev!.exam_name })}
                                </span>
                            )}
                        </div>
                        {trend.length > 1 && (
                            <div className="h-[116px] min-w-0 flex-1" role="img" aria-label={t('childPage.trendAria', { list: trend.map((e) => `${e.exam_name} ${e.percent}%`).join(', ') })}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                                        <XAxis dataKey="exam_name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} interval={0} />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                                        <Tooltip formatter={(v) => [`${formatCount(Number(v), lang)}%`, t('studentHome.average')]} />
                                        <Line type="monotone" dataKey="percent" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3.5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                    <ul className="grid md:grid-cols-2 md:gap-x-[18px]">
                        {data.recent_marks.map((m) => {
                            const [Icon, colour] = ICON[m.trend];
                            return (
                                <li key={m.subject_name} className="flex items-center gap-2.5 border-t border-line-subtle py-2">
                                    <span className="min-w-0 flex-1 truncate type-small-semibold text-ink">{m.subject_name}</span>
                                    <span className="type-body-semibold text-ink">{markText(m.obtained)}<span className="type-small text-muted"> / {markText(m.max_marks)}</span></span>
                                    <Icon size={16} className={cn('shrink-0', colour)} aria-label={t(`studentHome.trend.${m.trend}`)} />
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </Card>
    );
}

function AttendanceYear({ data }: { data: StudentHomeData }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const pct = data.attendance_pct;
    const started = data.attendance_total > 0;
    const tone = pct >= 75 ? 'ok' : pct >= 60 ? 'warn' : 'bad';
    return (
        <Card className="gap-3.5">
            <CardHeader title={t('studentHome.attYear')} subtitle={t('studentHome.attYearSub')} />
            <div className="flex items-center gap-4 lg:flex-col">
                <Ring value={started ? pct / 100 : 0} size={116} stroke={11} tone={started ? tone : 'ok'} label={`${formatCount(pct, lang)}%`} sub={t('home.p.present')} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:items-center">
                    <p className="type-body-semibold text-ink lg:text-center">
                        {started ? t('childPage.ofSchoolDays', { a: formatCount(data.attendance_present, lang), b: formatCount(data.attendance_total, lang) }) : t('studentHome.startsFirstDay')}
                    </p>
                    {started && (
                        <div className="flex gap-3">
                            <span className="flex items-center gap-1.5 type-small text-ink-2"><span aria-hidden className="size-2 rounded-full bg-bad" />{t('studentHome.absentN', { n: formatCount(data.attendance_absent, lang) })}</span>
                            <span className="flex items-center gap-1.5 type-small text-ink-2"><span aria-hidden className="size-2 rounded-full bg-warn" />{t('studentHome.leaveN', { n: formatCount(data.attendance_leave, lang) })}</span>
                        </div>
                    )}
                </div>
            </div>
            {started && <WeekStrip days={data.week.filter((d) => d.school_day)} onColour={false} className="pt-0" />}
            <p className={cn('type-small', started && pct < 75 ? 'text-bad' : 'text-muted')}>
                {!started ? t('studentHome.holidaysNote') : pct < 75 ? t('studentHome.below75') : t('studentHome.above75')}
            </p>
        </Card>
    );
}

function Notices() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const q = useQuery({ queryKey: ['notices', 'home', 3], queryFn: () => noticesService.getNotices({ limit: 3 }), staleTime: 2 * 60 * 1000 });
    return (
        <Card className="gap-1">
            <CardHeader title={t('home.t.notices')} />
            {q.isPending ? <RowsSkeleton rows={3} /> : q.isError ? <InlineError title={t('home.t.noticesError')} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
                <p className="type-small text-muted">{t('studentHome.noNotices')}</p>
            ) : (
                <ul>{q.data.slice(0, 3).map((n) => <ItemRow key={n.id} icon={Megaphone} title={n.title} sub={df.relative(n.created_at)} />)}</ul>
            )}
        </Card>
    );
}
