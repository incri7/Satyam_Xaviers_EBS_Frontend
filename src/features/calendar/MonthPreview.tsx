import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';
import type { HolidayEntry } from '../../api/services/academicCalendar.service';
import { WEEK_ORDER, bsMonth, bsOf, toApiWeekday } from './days';

/**
 * Figma B04 month view: one Nepali month of the year being set up, with
 * school days, weekends and holidays as they will be counted.
 */
export function MonthPreview({ yearFrom, yearTo, weekend, holidays }: { yearFrom: string; yearTo: string; weekend: number[]; holidays: HolidayEntry[] }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const today = isoLocal(new Date());
    const [shown, setShown] = useState(() => bsOf(today >= yearFrom && today <= yearTo ? today : yearFrom));
    const m = bsMonth(shown.year, shown.month);
    const byDate = new Map(holidays.map((h) => [h.date, h.label]));
    const inYear = (d: string) => d >= yearFrom && d <= yearTo;
    const counts = { school: 0, weekend: 0, holiday: 0 };
    m.days.filter(inYear).forEach((d) => {
        if (byDate.has(d)) counts.holiday += 1;
        else if (weekend.includes(toApiWeekday(new Date(`${d}T12:00:00`)))) counts.weekend += 1;
        else counts.school += 1;
    });
    const first = m.days[0];
    const canPrev = m.days[0] > yearFrom;
    const canNext = m.days[m.days.length - 1] < yearTo;
    const weekdayShort = (i: number) => t(`calendarPage.wd.${WEEK_ORDER[i]}`);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="type-body-semibold text-ink">{df.date(first, 'monthYear')}</p>
                    <p className="type-caption text-muted">{t('calendarPage.monthCounts', { s: formatCount(counts.school, lang), w: formatCount(counts.weekend, lang), h: formatCount(counts.holiday, lang) })}</p>
                </div>
                <IconButton icon={ChevronLeft} label={t('calendarPage.prevMonth')} disabled={!canPrev} onClick={() => setShown(m.prev)} />
                <IconButton icon={ChevronRight} label={t('calendarPage.nextMonth')} disabled={!canNext} onClick={() => setShown(m.next)} />
            </div>
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={df.date(first, 'monthYear')}>
                {WEEK_ORDER.map((_, i) => <span key={i} role="columnheader" className="pb-1 text-center type-micro-bold uppercase text-muted">{weekdayShort(i)}</span>)}
                {Array.from({ length: m.lead }, (_, i) => <span key={`b${i}`} />)}
                {m.days.map((d) => {
                    const label = byDate.get(d);
                    const off = weekend.includes(toApiWeekday(new Date(`${d}T12:00:00`)));
                    const outside = !inYear(d);
                    return (
                        <span key={d} role="gridcell" title={label ?? (off ? t('calendarPage.weekend') : undefined)}
                            className={cn(
                                'flex aspect-square min-h-9 flex-col items-center justify-center rounded-[8px] type-caption-semibold tabular-nums',
                                outside ? 'text-muted/50' : label ? 'bg-warn-soft text-warn' : off ? 'bg-sunken text-muted' : 'bg-surface-2 text-ink',
                                d === today && 'ring-2 ring-primary',
                            )}>
                            {df.day(d)}
                        </span>
                    );
                })}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
                <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-2.5 rounded-[3px] bg-surface-2 ring-1 ring-line" />{t('calendarPage.schoolDay')}</li>
                <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-2.5 rounded-[3px] bg-warn-soft" />{t('calendarPage.holiday')}</li>
                <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-2.5 rounded-[3px] bg-sunken" />{t('calendarPage.weekend')}</li>
            </ul>
        </div>
    );
}
