import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp, UserX, WifiOff } from 'lucide-react';

import { Badge, Button, Card, CardHeader, EmptyState, IconButton, Skeleton } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import type { AbsenceEntry, AttendanceHistoryResponse } from '../../api/services/parent.service';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { InlineEmpty, RowsSkeleton } from '../../features/home/parts';
import { ChildHeader } from '../../features/parent/ChildHeader';
import { useChildMonth } from '../../features/parent/queries';
import { useChildParam } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { bsYearMonth, isoLocal, toNepaliDigits } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Figma D03 Child attendance: this month, this year and absences as figures,
 * the Nepali-month calendar (Sunday first, paged by month), and every absence
 * this year with what happened to its leave request.
 *
 * Adapted: "Add a reason" opens the leave form for that day (the school
 * records reasons as leave requests; there is no separate note to the
 * teacher). The school-wide comparison figure is left out.
 */
export default function ChildAttendancePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id, child } = useChildParam();
    const now = bsYearMonth(0);
    const [ym, setYm] = useState(now);
    const q = useChildMonth(id, ym.year, ym.month);
    const step = (by: number) => setYm(({ year, month }) => {
        const m = month + by;
        return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });
    const atLatest = ym.year === now.year && ym.month === now.month;
    const reportAhead = () => navigate(`/parent/child/${id}/leave`);

    return (
        <AppPage title={t('childPage.attendance')}>
            <ChildHeader title={t('childPage.attendance')}
                action={<Button leftIcon={CalendarPlus} className="max-md:hidden" onClick={reportAhead}>{t('childPage.reportAhead')}</Button>} />
            {q.isError && !q.data ? (
                <EmptyState icon={WifiOff} tone="bad" title={t('childPage.attErrorTitle', { name: child?.first_name ?? '' })}
                    action={<Button variant="quiet" onClick={() => void q.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('parentHome.errorBody')}
                </EmptyState>
            ) : (
                <>
                    <Figures data={q.data} loading={q.isPending} atLatest={atLatest} />
                    <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start lg:gap-[18px]">
                        <MonthCalendar data={q.data} loading={q.isPending || q.isPlaceholderData} onStep={step} atLatest={atLatest} />
                        <Absences list={q.data?.absences} loading={q.isPending} childName={child?.first_name ?? ''}
                            onReason={(date) => navigate(`/parent/child/${id}/leave?start=${date}&end=${date}`)} />
                    </div>
                    <Button leftIcon={CalendarPlus} fullWidth className="md:hidden" onClick={reportAhead}>{t('childPage.reportAhead')}</Button>
                </>
            )}
        </AppPage>
    );
}

function Figures({ data, loading, atLatest }: { data?: AttendanceHistoryResponse; loading: boolean; atLatest: boolean }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const m = data?.month;
    const days = m?.school_days_so_far ?? 0;
    const monthPct = days ? Math.round(((m?.present ?? 0) / days) * 1000) / 10 : null;
    const absences = data?.absences ?? [];
    const onLeave = absences.filter((a) => a.leave_status === 'approved').length;
    const status = loading ? 'loading' : 'ready';
    return (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:gap-3.5">
            <KpiCard icon={CalendarDays} tone="ok" status={status} label={atLatest ? t('childPage.thisMonth') : t('childPage.thatMonth')}
                value={monthPct === null ? t('childPage.noDaysYet') : `${formatCount(monthPct, lang)}%`}
                sub={<span className="truncate">{days ? t('childPage.ofSchoolDays', { a: formatCount(m?.present ?? 0, lang), b: formatCount(days, lang) }) : t('childPage.startsFirstDay')}</span>} />
            <KpiCard icon={TrendingUp} tone="brand" status={status} label={t('childPage.thisYear')}
                value={data?.year_percent == null ? t('childPage.noDaysYet') : `${formatCount(data.year_percent, lang)}%`}
                sub={<span className="truncate">{data?.year_school_days ? t('childPage.ofSchoolDays', { a: formatCount(data.year_present, lang), b: formatCount(data.year_school_days, lang) }) : '—'}</span>} />
            <KpiCard icon={UserX} tone="bad" status={status} label={t('childPage.absentYear')}
                value={t('childPage.days', { count: absences.length, n: formatCount(absences.length, lang) })}
                sub={<span className="truncate">{absences.length ? t('childPage.onApprovedLeave', { count: onLeave, n: formatCount(onLeave, lang) }) : t('childPage.nothingRecorded')}</span>} />
        </div>
    );
}

type Cell = { date: string; day: number; kind: 'P' | 'A' | 'L' | 'HD' | 'closed' | 'sat' | 'future' | 'none' } | null;

function MonthCalendar({ data, loading, onStep, atLatest }: { data?: AttendanceHistoryResponse; loading: boolean; onStep: (by: number) => void; atLatest: boolean }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const m = data?.month;
    const today = isoLocal(new Date());
    const cells: Cell[] = [];
    if (m) {
        const statusOf = new Map(data!.records.map((r) => [r.date, r.status]));
        const closed = new Set(m.closed_days);
        const start = new Date(`${m.start}T12:00:00`);
        const end = new Date(`${m.end}T12:00:00`);
        for (let i = 0; i < start.getDay(); i++) cells.push(null);
        for (let d = new Date(start), n = 1; d <= end; d.setDate(d.getDate() + 1), n++) {
            const iso = isoLocal(d);
            const s = statusOf.get(iso);
            const kind: NonNullable<Cell>['kind'] = s === 'P' || s === 'A' || s === 'L' || s === 'HD' ? s
                : closed.has(iso) ? (d.getDay() === 6 ? 'sat' : 'closed') : iso > today ? 'future' : 'none';
            cells.push({ date: iso, day: n, kind });
        }
        while (cells.length % 7) cells.push(null);
    }
    const holidays = m ? m.closed_days.filter((d) => new Date(`${d}T12:00:00`).getDay() !== 6).length : 0;
    const digits = (n: number) => (df.lang === 'ne' ? toNepaliDigits(String(n).padStart(2, '0')) : String(n).padStart(2, '0'));
    const LOOK: Record<NonNullable<Cell>['kind'], string> = {
        P: 'bg-ok-soft text-ok type-small-semibold',
        HD: 'bg-info-soft text-info type-small-semibold',
        L: 'bg-primary-soft text-primary-text type-small-semibold',
        A: 'bg-bad text-white type-small-semibold',
        closed: 'bg-warn-soft text-warn type-small-semibold',
        sat: 'border border-dashed border-line text-muted type-small',
        future: 'text-muted type-small',
        none: 'text-muted type-small',
    };

    return (
        <Card className="gap-3 lg:gap-3.5">
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h2 className="type-title text-ink">{m ? df.date(m.start, 'monthYear') : '…'}</h2>
                    {m && (
                        <p className="type-small text-muted">
                            {t('childPage.schoolDaysSoFar', { count: m.school_days_so_far, n: formatCount(m.school_days_so_far, df.lang) })}
                            {holidays > 0 && ` ${t('childPage.holidaysInMonth', { count: holidays, n: formatCount(holidays, df.lang) })}`}
                        </p>
                    )}
                </div>
                <IconButton icon={ChevronLeft} label={t('childPage.prevMonth')} size={40} onClick={() => onStep(-1)} />
                <IconButton icon={ChevronRight} label={t('childPage.nextMonth')} size={40} disabled={atLatest} onClick={() => onStep(1)} />
            </div>
            {loading && !m ? <Skeleton className="h-[300px]" /> : (
                <div className={cn('grid grid-cols-7 gap-[5px] transition-opacity lg:gap-2', loading && 'opacity-60')} role="grid" aria-label={m ? df.date(m.start, 'monthYear') : ''}>
                    {DAYS.map((d) => <span key={d} role="columnheader" className="text-center type-caption-semibold text-muted">{t(`parentHome.day.${d}`)}</span>)}
                    {cells.map((c, i) => c ? (
                        <span key={c.date} role="gridcell"
                            aria-label={`${df.date(c.date, 'dayMonth')}: ${t(`childPage.cell.${c.kind}`)}`}
                            className={cn('flex h-10 flex-col items-center justify-center rounded-[10px] lg:h-[54px] lg:rounded-[12px]', LOOK[c.kind], c.date === today && 'ring-2 ring-primary')}>
                            {digits(c.day)}
                            {c.kind === 'A' && <span className="type-micro text-white/85 max-lg:hidden">{t('childPage.cell.A')}</span>}
                            {c.date === today && c.kind !== 'A' && <span className="type-micro text-primary-text max-lg:hidden">{t('childPage.today')}</span>}
                        </span>
                    ) : <span key={`b${i}`} aria-hidden />)}
                </div>
            )}
            <ul className="flex flex-wrap gap-x-4 gap-y-2 lg:gap-x-[18px]" aria-label={t('childPage.legend')}>
                {([['bg-ok-soft', 'P'], ['bg-bad', 'A'], ['bg-primary-soft', 'L'], ['bg-warn-soft', 'closed'], ['border border-dashed border-line', 'sat']] as const).map(([sw, k]) => (
                    <li key={k} className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className={cn('size-3.5 rounded-[4px]', sw)} />{t(`childPage.cell.${k}`)}</li>
                ))}
                <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-3.5 rounded-[4px] ring-2 ring-inset ring-primary" />{t('childPage.today')}</li>
            </ul>
        </Card>
    );
}

function Absences({ list, loading, childName, onReason }: { list?: AbsenceEntry[]; loading: boolean; childName: string; onReason: (date: string) => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [all, setAll] = useState(false);
    return (
        <Card className="gap-1">
            <CardHeader title={t('childPage.absencesYear')} subtitle={list ? (list.length ? t('childPage.absencesSub', { count: list.length, n: formatCount(list.length, df.lang) }) : t('childPage.noneSoFar')) : undefined} />
            {loading ? <RowsSkeleton rows={4} /> : !list?.length ? (
                <InlineEmpty icon={CheckCircle2} title={t('childPage.noAbsences')}>{t('childPage.noAbsencesBody', { name: childName })}</InlineEmpty>
            ) : (
                <>
                    <ul>
                        {(all ? list : list.slice(0, 8)).map((a) => {
                            const tone = a.leave_status === 'approved' ? 'ok' : a.leave_status === 'rejected' ? 'bad' : a.leave_status === 'pending' ? 'warn' : 'neutral';
                            return (
                                <li key={a.date} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-b-0">
                                    <span className={cn('flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px]', a.leave_status === 'approved' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')}>
                                        <span className="type-small-semibold">{df.day(a.date)}</span>
                                        <span className="type-micro">{df.monthShort(a.date)}</span>
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <p className="type-body-semibold text-ink">{t('childPage.absentOn', { day: t(`parentHome.day.${new Date(`${a.date}T12:00:00`).getDay()}`) })}</p>
                                        <p className="type-small text-muted">{a.reason ?? t('childPage.noReasonYet')}</p>
                                    </div>
                                    {a.leave_status ? (
                                        <Badge tone={tone}>{t(`childPage.leaveState.${a.leave_status}`, { defaultValue: a.leave_status })}</Badge>
                                    ) : (
                                        <Button variant="quiet" size="sm" onClick={() => onReason(a.date)}>{t('childPage.addReason')}</Button>
                                    )}
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
