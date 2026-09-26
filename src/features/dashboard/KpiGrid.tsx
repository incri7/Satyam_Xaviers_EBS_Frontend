import { useTranslation } from 'react-i18next';
import { CheckCircle2, IndianRupee, TrendingDown, Users } from 'lucide-react';

import { Badge } from '../../design-system';
import { useCountUp } from '../../hooks/useCountUp';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel } from '../../utils/academicYear';
import { formatCount, formatRs } from '../../utils/money';
import { KpiCard } from './KpiCard';
import { useEnrolmentTrend, useMonthlyReport, useOutstanding, useStudentCount, useTodaySummary } from './queries';

type Status = 'loading' | 'error' | 'ready';
const statusOf = (q: { isPending: boolean; isError: boolean }): Status =>
    q.isError ? 'error' : q.isPending ? 'loading' : 'ready';

/** Sets the tab a page opens on (People and Finances remember it this way). */
const preselectTab = (key: string, tab: string) => () => {
    try { localStorage.setItem(key, tab); } catch { /* the page opens on its default tab */ }
};

/** Figma B01 "grid": the four school figures. */
export function KpiGrid() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();

    const students = useStudentCount();
    const trend = useEnrolmentTrend();
    const today = useTodaySummary();
    const outstanding = useOutstanding();
    const month = useMonthlyReport(0);
    const lastMonth = useMonthlyReport(1);

    const studentCount = useCountUp(students.data);
    const present = useCountUp(today.data?.present);
    const owed = useCountUp(outstanding.data ? Number(outstanding.data.total_outstanding) : undefined);
    const collected = useCountUp(month.data ? Number(month.data.total_collected) : undefined);

    // Students: change in enrolments against last academic year.
    const [prevYear, thisYear] = trend.points.slice(-2);
    const enrolDelta = prevYear?.count && thisYear?.count ? thisYear.count - prevYear.count : null;

    // Present today: "35 absent, 2 sections unmarked".
    const s = today.data;
    const unmarked = s ? Math.max(0, s.sections_total - s.sections_marked) : 0;
    const presentSub = !s
        ? null
        : s.marked === 0
            ? t('adminDashboard.kpi.notMarked')
            : unmarked > 0
                ? t('adminDashboard.kpi.absentUnmarked', { absent: formatCount(s.absent, lang), count: unmarked, n: formatCount(unmarked, lang) })
                : t('adminDashboard.kpi.absentAllMarked', { absent: formatCount(s.absent, lang) });

    // Collected this month against last month.
    const now = Number(month.data?.total_collected ?? 0);
    const before = Number(lastMonth.data?.total_collected ?? 0);
    const revenuePct = before > 0 ? Math.round(((now - before) / before) * 100) : null;

    const dueCount = outstanding.data?.total_count ?? 0;

    return (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
            <KpiCard
                icon={Users}
                tone="brand"
                label={t('adminDashboard.kpi.students')}
                value={formatCount(studentCount ?? 0, lang)}
                to="/people"
                onNavigate={preselectTab('people_active_tab', 'students')}
                status={statusOf(students)}
                onRetry={() => void students.refetch()}
                sub={
                    students.data === 0 ? (
                        t('adminDashboard.kpi.noStudents')
                    ) : enrolDelta !== null ? (
                        <>
                            <Badge tone={enrolDelta > 0 ? 'ok' : enrolDelta < 0 ? 'bad' : 'neutral'}>
                                {signed(enrolDelta, lang)}
                            </Badge>
                            <span className="truncate">
                                {t('adminDashboard.kpi.vsYear', { year: academicYearLabel(prevYear.year, lang) })}
                            </span>
                        </>
                    ) : null
                }
            />
            <KpiCard
                icon={CheckCircle2}
                tone="ok"
                label={t('adminDashboard.kpi.present')}
                value={s ? `${formatCount(present ?? 0, lang)} / ${formatCount(s.expected, lang)}` : ''}
                long
                to="/attendance"
                status={statusOf(today)}
                onRetry={() => void today.refetch()}
                sub={presentSub && <span className="truncate">{presentSub}</span>}
            />
            <KpiCard
                icon={TrendingDown}
                tone="bad"
                label={t('adminDashboard.kpi.outstanding')}
                value={formatRs(owed, lang)}
                long
                to="/finances/outstanding"
                status={statusOf(outstanding)}
                onRetry={() => void outstanding.refetch()}
                sub={
                    <span className="truncate">
                        {dueCount > 0
                            ? t('adminDashboard.kpi.studentsDue', { count: dueCount, n: formatCount(dueCount, lang) })
                            : t('adminDashboard.kpi.noneDue')}
                    </span>
                }
            />
            <KpiCard
                icon={IndianRupee}
                tone="info"
                label={t('adminDashboard.kpi.revenue')}
                value={formatRs(collected, lang)}
                long
                to="/finances"
                onNavigate={preselectTab('finances_active_tab', 'payments')}
                status={statusOf(month)}
                onRetry={() => void month.refetch()}
                sub={
                    revenuePct !== null ? (
                        <>
                            <Badge tone={revenuePct > 0 ? 'ok' : revenuePct < 0 ? 'bad' : 'neutral'}>
                                {signed(revenuePct, lang)}%
                            </Badge>
                            <span className="truncate">{t('adminDashboard.kpi.vsLastMonth')}</span>
                        </>
                    ) : now === 0 ? (
                        <span className="truncate">{t('adminDashboard.kpi.noPayments')}</span>
                    ) : null
                }
            />
        </div>
    );
}

/** +16, −4 (a real minus sign), 0. */
function signed(n: number, lang: 'en' | 'ne'): string {
    const abs = formatCount(Math.abs(n), lang);
    return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs;
}
