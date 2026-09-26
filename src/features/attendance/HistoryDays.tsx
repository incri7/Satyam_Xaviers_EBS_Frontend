import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2 } from 'lucide-react';

import { Badge, Card } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { AttendanceStatus, AttendanceTotals, DailyAttendanceSummary } from '../../api/services/attendance.service';
import { STATUS_KEY, STATUS_TONE, pctTone } from './status';

/** Figma C03 period summary: attendance %, school days, and the away counts. */
export function HistoryTotals({ totals, title }: { totals: AttendanceTotals; title: string }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const pct = totals.attendance_pct;
    const cells = [
        { label: t('attendancePage.schoolDays'), value: totals.days_counted, tone: 'text-ink' },
        { label: t('attendancePage.absentN'), value: totals.absent, tone: 'text-bad' },
        { label: t('attendancePage.lateN'), value: totals.late, tone: 'text-warn' },
        { label: t('attendancePage.halfDayN'), value: totals.half_day, tone: 'text-info' },
    ];
    return (
        <Card className="gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-0.5 lg:min-w-[220px]">
                <p className="type-small-medium text-ink-2">{title}</p>
                <p className={cn('type-figure-l', pctTone(pct))}>{pct != null ? `${formatCount(pct, lang)}%` : '—'}</p>
                <p className="type-caption text-muted">{t('attendancePage.goal')}</p>
            </div>
            <dl className="grid flex-1 grid-cols-4 gap-2">
                {cells.map((c) => (
                    <div key={c.label} className="flex flex-col gap-0.5 rounded-row bg-surface-2 px-3 py-2.5">
                        <dd className={cn('type-h3 tabular-nums', c.tone)}>{formatCount(c.value, lang)}</dd>
                        <dt className="type-caption text-muted">{c.label}</dt>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

/**
 * Figma C03 day list. Each day shows its away counts and percentage; opening
 * a class day lists who was not present. For one student each day is a
 * single mark, shown on the row with nothing to open.
 */
export function HistoryDays({ days, oneStudent, openDay, onToggle, records, loadingDay, nameOf }: {
    days: DailyAttendanceSummary[];
    oneStudent: boolean;
    openDay: string;
    onToggle: (date: string) => void;
    records: { id: number; student_id: number; status: string }[];
    loadingDay: boolean;
    nameOf: (id: number) => string;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;

    return (
        <ul className="flex flex-col gap-2.5">
            {days.map((day) => {
                const open = !oneStudent && openDay === day.date;
                const sole: AttendanceStatus | null = oneStudent ? (day.absent ? 'A' : day.late ? 'L' : day.half_day ? 'HD' : 'P') : null;
                // Present students first would bury the ones anybody opens a day to find.
                const away = [...records].sort((a, b) => Number(a.status === 'P') - Number(b.status === 'P'));
                const presentCount = records.filter((r) => r.status === 'P').length;
                return (
                    <li key={day.date} className="overflow-hidden rounded-card border border-line bg-surface shadow-e1">
                        <button type="button" disabled={oneStudent} aria-expanded={oneStudent ? undefined : open} onClick={() => onToggle(open ? '' : day.date)}
                            className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none focus-visible:bg-surface-2 lg:px-5', !oneStudent && 'hover:bg-surface-2')}>
                            {!oneStudent && <ChevronDown size={16} aria-hidden className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />}
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="truncate type-small-semibold text-ink">{df.date(day.date, 'long')}</span>
                                {!oneStudent && (
                                    <span className="flex flex-wrap gap-1.5">
                                        {day.absent > 0 && <Badge tone="bad">{t('attendancePage.nAbsent', { n: formatCount(day.absent, lang) })}</Badge>}
                                        {day.late > 0 && <Badge tone="warn">{t('attendancePage.nLate', { n: formatCount(day.late, lang) })}</Badge>}
                                        {day.half_day > 0 && <Badge tone="info">{t('attendancePage.nHalfDay', { n: formatCount(day.half_day, lang) })}</Badge>}
                                        {day.absent + day.late + day.half_day === 0 && <Badge tone="ok" dot>{t('attendance.fullAttendance')}</Badge>}
                                    </span>
                                )}
                            </span>
                            {sole ? (
                                <Badge tone={STATUS_TONE[sole]} dot>{t(STATUS_KEY[sole])}</Badge>
                            ) : (
                                <span className="flex shrink-0 flex-col items-end">
                                    <span className={cn('type-body-semibold tabular-nums', pctTone(day.attendance_pct))}>
                                        {day.attendance_pct != null ? `${formatCount(day.attendance_pct, lang)}%` : '—'}
                                    </span>
                                    <span className="type-caption tabular-nums text-muted">
                                        {t('attendancePage.presentOf', { n: formatCount(day.present + day.late + day.half_day, lang), of: formatCount(day.total, lang) })}
                                    </span>
                                </span>
                            )}
                        </button>

                        {open && (
                            <div className="border-t border-line-subtle">
                                {loadingDay ? (
                                    <p className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted" aria-label={t('common.loading')} /></p>
                                ) : records.length === 0 ? (
                                    <p className="px-5 py-5 text-center type-small text-muted">{t('attendance.noHistory')}</p>
                                ) : (
                                    <ul className="flex flex-col divide-y divide-line-subtle">
                                        {away.filter((r) => r.status !== 'P').map((r) => {
                                            const s = r.status as AttendanceStatus;
                                            return (
                                                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                                                    <span className="truncate type-small text-ink">{nameOf(r.student_id)}</span>
                                                    <Badge tone={STATUS_TONE[s] ?? 'neutral'} dot>{STATUS_KEY[s] ? t(STATUS_KEY[s]) : r.status}</Badge>
                                                </li>
                                            );
                                        })}
                                        <li className="px-5 py-2.5 type-caption text-muted">{t('attendancePage.nPresent', { count: presentCount, n: formatCount(presentCount, lang) })}</li>
                                    </ul>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
