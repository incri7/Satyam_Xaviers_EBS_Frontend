import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, ChevronRight, Landmark, Phone, Receipt, TrendingUp, WifiOff } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, Meter, Person, Skeleton } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { academicCalendarService, type UpcomingEvent } from '../../api/services/academicCalendar.service';
import { Ring } from '../../features/home/Ring';
import { InlineEmpty, InlineError, RowsSkeleton } from '../../features/home/parts';
import { ChildHeader } from '../../features/parent/ChildHeader';
import { groupByExam, paperPercent, useChildFees, useChildMarks, useChildMonth } from '../../features/parent/queries';
import { gradeFor, useChildParam, useGradeBands, useSchoolPhone } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { bsYearMonth } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

/**
 * Figma D02 Child overview: this month's attendance and the fee balance, the
 * results trend by exam, what is coming up on the school calendar, and who
 * to contact.
 *
 * Adapted: results are shown as each exam's percentage (the API has no
 * credit-weighted GPA); "Coming up" is the school calendar only (no exam
 * routine for parents yet); the class teacher has no phone or message
 * button, since staff numbers are not shared with families.
 */
export default function ChildDashboardPage() {
    const { t } = useTranslation();
    const { id, child } = useChildParam();
    const { year, month } = bsYearMonth(0);
    const att = useChildMonth(id, year, month);
    const marks = useChildMarks(id);
    const fees = useChildFees(id);
    const nothingYet = att.isSuccess && marks.isSuccess && fees.isSuccess
        && !att.data.year_school_days && att.data.records.length === 0 && marks.data.marks.length === 0 && fees.data.fees.length === 0;
    const allFailed = att.isError && marks.isError && fees.isError;

    return (
        <AppPage title={t('childPage.overview')}>
            <ChildHeader title={t('childPage.overview')} />
            {allFailed ? (
                <EmptyState icon={WifiOff} tone="bad" title={t('childPage.errorTitle', { name: child?.first_name ?? '' })}
                    action={<Button variant="quiet" onClick={() => { void att.refetch(); void marks.refetch(); void fees.refetch(); }}>{t('classesPage.action.retry')}</Button>}>
                    {t('parentHome.errorBody')}
                </EmptyState>
            ) : (
                <>
                    {nothingYet && <Banner tone="info" title={t('childPage.newTitle', { name: child?.first_name ?? '' })}>{t('childPage.newBody')}</Banner>}
                    <div className="grid gap-3.5 md:grid-cols-2 lg:gap-[18px]">
                        <AttendanceCard q={att} />
                        <FeeCard q={fees} />
                    </div>
                    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-[18px]">
                        <ResultsCard q={marks} />
                        <ComingUp />
                    </div>
                    <Contacts teacher={child?.class_teacher_name ?? null} />
                </>
            )}
        </AppPage>
    );
}

function AttendanceCard({ q }: { q: ReturnType<typeof useChildMonth> }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const { id } = useChildParam();
    const m = q.data?.month;
    const days = m?.school_days_so_far ?? 0;
    const pct = days ? Math.round(((m?.present ?? 0) / days) * 1000) / 10 : 0;
    const last = q.data?.absences[0];
    return (
        <Card className="gap-3.5">
            <CardHeader title={t('childPage.attMonth')} subtitle={t('childPage.attMonthSub', { month: df.date(new Date(), 'monthYear') })}
                action={<Button variant="ghost" size="sm" rightIcon={ChevronRight} className="text-primary-text max-sm:hidden" onClick={() => navigate(`/parent/child/${id}/attendance`)}>{t('childPage.calendar')}</Button>} />
            {q.isPending ? <Skeleton className="h-28" /> : q.isError ? <InlineError title={t('childPage.attError')} onRetry={() => void q.refetch()} /> : (
                <div className="flex items-center gap-4 lg:gap-[22px]">
                    <Ring value={days ? (m?.present ?? 0) / days : 0} size={104} stroke={10} tone={pct >= 75 || !days ? 'ok' : 'warn'}
                        label={`${formatCount(pct, df.lang)}%`} sub={t('home.p.present')} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        {!days ? <p className="type-small text-muted">{t('childPage.attEmpty')}</p> : (
                            <>
                                <Stat dot="bg-ok" label={t('childPage.present')} value={t('childPage.days', { count: m?.present ?? 0, n: formatCount(m?.present ?? 0, df.lang) })} />
                                <Stat dot="bg-bad" label={t('childPage.absent')} value={t('childPage.days', { count: m?.absent ?? 0, n: formatCount(m?.absent ?? 0, df.lang) })} />
                                <Stat dot="bg-primary" label={t('childPage.thisYear')} value={q.data.year_percent === null ? '—' : `${formatCount(q.data.year_percent, df.lang)}%`} />
                                {last && (
                                    <p className="type-caption text-muted">
                                        {t('childPage.lastAbsent', { date: df.date(last.date, 'dayMonth') })}{' '}
                                        {last.reason ? t('childPage.youSaid', { reason: last.reason }) : !last.leave_status ? t('childPage.noReason') : ''}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dot)} />
            <span className="min-w-0 flex-1 type-small text-ink-2">{label}</span>
            <span className="type-body-semibold text-ink">{value}</span>
        </div>
    );
}

function FeeCard({ q }: { q: ReturnType<typeof useChildFees> }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const { id } = useChildParam();
    const due = Number(q.data?.total_due ?? 0);
    const billed = (q.data?.fees ?? []).reduce((s, f) => s + Number(f.amount), 0);
    const paid = Math.min(Number(q.data?.total_paid ?? 0), billed);
    const heads = (q.data?.fees ?? []).filter((f) => Number(f.balance) > 0).map((f) => f.fee_name);
    return (
        <Card className="gap-3">
            <CardHeader title={t('childPage.feeBalance')} subtitle={q.isSuccess ? (due > 0 ? t('childPage.toPay') : t('childPage.nothingDue')) : undefined}
                action={q.isSuccess && <Badge tone={due > 0 ? 'warn' : 'ok'}>{due > 0 ? t('childPage.due') : t('parentHome.allPaid')}</Badge>} />
            {q.isPending ? <Skeleton className="h-28" /> : q.isError ? <InlineError title={t('childPage.feeError')} onRetry={() => void q.refetch()} /> : (
                <>
                    <p className="flex flex-wrap items-baseline gap-2.5">
                        <span className="type-figure-l text-ink">{formatRs(due, lang)}</span>
                        {heads.length > 0 && <span className="type-small text-muted">{heads.slice(0, 2).join(t('childPage.and'))}</span>}
                    </p>
                    {billed > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between gap-2">
                                <span className="type-small text-ink-2">{t('childPage.paidSoFar')}</span>
                                <span className="type-small-semibold text-ink">{t('childPage.ofAmount', { a: formatRs(paid, lang), b: formatRs(billed, lang) })}</span>
                            </div>
                            <Meter value={paid / billed} tone="ok" height={8} label={t('childPage.paidSoFar')} />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="quiet" size="sm" leftIcon={Receipt} onClick={() => navigate(`/parent/child/${id}/fees`)}>{t('childPage.seeFees')}</Button>
                        <span className="type-caption text-muted">{t('childPage.payAtOffice')}</span>
                    </div>
                </>
            )}
        </Card>
    );
}

function ResultsCard({ q }: { q: ReturnType<typeof useChildMarks> }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const { id } = useChildParam();
    const bands = useGradeBands().data;
    const exams = groupByExam(q.data?.marks ?? []).filter((e) => e.percent !== null);
    const latest = exams[exams.length - 1];
    const prev = exams[exams.length - 2];
    const papers = (latest?.papers ?? []).map((p) => ({ name: p.subject_name, pct: paperPercent(p) })).filter((p): p is { name: string; pct: number } => p.pct !== null);
    const best = papers.length > 1 ? papers.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
    const low = papers.length > 1 ? papers.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
    const sub = !latest ? t('childPage.resultsEmptySub')
        : prev ? t(latest.percent! >= prev.percent! ? 'childPage.resultsUp' : 'childPage.resultsDown', { exam: latest.name, pct: formatCount(latest.percent!, lang), prev: formatCount(prev.percent!, lang) })
            : t('childPage.resultsOne', { exam: latest.name, pct: formatCount(latest.percent!, lang) });
    return (
        <Card className="gap-3">
            <CardHeader title={t('childPage.results')} subtitle={q.isSuccess ? sub : undefined}
                action={latest && <Button variant="ghost" size="sm" rightIcon={ChevronRight} className="text-primary-text max-sm:hidden" onClick={() => navigate(`/parent/child/${id}/marks`)}>{t('childPage.allMarks')}</Button>} />
            {q.isPending ? <Skeleton className="h-[200px]" /> : q.isError ? <InlineError title={t('childPage.marksError')} onRetry={() => void q.refetch()} /> : exams.length < 2 ? (
                <InlineEmpty icon={TrendingUp} title={t('childPage.trendNeedsTwo')} />
            ) : (
                <div className="h-[200px]" role="img" aria-label={t('childPage.trendAria', { list: exams.map((e) => `${e.name} ${e.percent}%`).join(', ') })}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={exams} margin={{ top: 18, right: 16, left: -18, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} interval={0} />
                            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip formatter={(v) => [`${formatCount(Number(v), lang)}%`, t('childPage.average')]} />
                            <Line type="monotone" dataKey="percent" stroke="var(--color-primary)" strokeWidth={2.75} dot={{ r: 4 }} activeDot={{ r: 5 }} isAnimationActive />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            {best && low && best.name !== low.name && (
                <div className="flex flex-wrap gap-2">
                    <Badge tone="ok">{t('childPage.strongest', { subject: best.name, grade: gradeFor(best.pct, bands).grade })}</Badge>
                    <Badge tone={low.pct < 50 ? 'warn' : 'neutral'}>{t('childPage.lowest', { subject: low.name, grade: gradeFor(low.pct, bands).grade })}</Badge>
                </div>
            )}
        </Card>
    );
}

const EVENT_TONE: Record<string, string> = {
    holiday: 'bg-warn-soft text-warn', term_break: 'bg-warn-soft text-warn', emergency_closure: 'bg-bad-soft text-bad',
    exam_day: 'bg-primary-soft text-primary-text', half_day: 'bg-info-soft text-info',
};

function ComingUp() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const q = useQuery({ queryKey: ['academic-calendar', 'upcoming'], queryFn: () => academicCalendarService.getUpcoming(90, 5), staleTime: 30 * 60 * 1000 });
    const title = (e: UpcomingEvent) => e.label ? (e.kind === 'term_start' ? t('childPage.kind.termStartNamed', { name: e.label }) : e.kind === 'term_end' ? t('childPage.kind.termEndNamed', { name: e.label }) : e.label)
        : t(`childPage.kind.${e.kind}`, { defaultValue: e.kind });
    return (
        <Card className="gap-1">
            <CardHeader title={t('childPage.comingUp')} subtitle={t('childPage.fromCalendar')} />
            {q.isPending ? <RowsSkeleton rows={3} /> : q.isError ? <InlineError title={t('childPage.calendarError')} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
                <InlineEmpty icon={CalendarDays} title={t('childPage.nothingComing')}>{t('childPage.nothingComingBody')}</InlineEmpty>
            ) : (
                <ul>
                    {q.data.map((e) => (
                        <li key={`${e.kind}-${e.start}`} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-b-0">
                            <span className={cn('flex size-12 shrink-0 flex-col items-center justify-center rounded-[12px]', EVENT_TONE[e.kind] ?? 'bg-sunken text-ink-2')}>
                                <span className="type-body-semibold">{df.day(e.start)}</span>
                                <span className="type-micro">{df.monthShort(e.start)}</span>
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <p className="type-body-semibold text-ink">{title(e)}</p>
                                <p className="type-small text-muted">
                                    {e.end !== e.start ? t('childPage.until', { date: df.date(e.end, 'dayMonth') }) : t(`childPage.kindSub.${e.kind}`, { defaultValue: '' })}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function Contacts({ teacher }: { teacher: string | null }) {
    const { t } = useTranslation();
    const phone = useSchoolPhone();
    return (
        <Card className="gap-3">
            <CardHeader title={t('childPage.contacts')} subtitle={t('childPage.hours')} />
            <div className="grid gap-3 md:grid-cols-2">
                {teacher && (
                    <div className="flex items-center gap-2.5 rounded-row bg-surface-2 px-3.5 py-3">
                        <div className="min-w-0 flex-1"><Person name={teacher} sub={t('childPage.classTeacher')} /></div>
                    </div>
                )}
                <div className="flex items-center gap-2.5 rounded-row bg-surface-2 px-3.5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-primary-soft text-primary-text"><Landmark size={18} aria-hidden /></span>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <p className="type-body-semibold text-ink">{t('childPage.office')}</p>
                        <p className="type-caption text-muted">{phone ?? t('childPage.officeSub')}</p>
                    </div>
                    {phone && (
                        <a href={`tel:${phone}`} aria-label={t('parentHome.callSchool')}
                            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-inset ring-line outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">
                            <Phone size={17} aria-hidden />
                        </a>
                    )}
                </div>
            </div>
        </Card>
    );
}
