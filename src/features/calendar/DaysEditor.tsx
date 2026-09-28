import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Banner, Button, Card, Dialog, IconButton, SelectField, Skeleton, TextField } from '../../design-system';
import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { errorText } from '../people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { bsMonthBounds, bsYearMonth, isoLocal, toNepaliDigits } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const TYPES = ['working_day', 'holiday', 'exam_day', 'half_day', 'term_break', 'emergency_closure', 'weekend'] as const;
const LOOK: Record<string, string> = {
    working_day: 'bg-surface text-ink ring-1 ring-inset ring-line-subtle',
    holiday: 'bg-warn-soft text-warn',
    term_break: 'bg-warn-soft text-warn',
    emergency_closure: 'bg-bad-soft text-bad',
    exam_day: 'bg-primary-soft text-primary-text',
    half_day: 'bg-info-soft text-info',
    weekend: 'border border-dashed border-line text-muted',
};

interface Day { date: string; day_type: string; label: string | null; is_working_day: boolean }

/**
 * The school calendar a month at a time, after setup: tap a day to make it a
 * holiday, an exam day, a half day or a closure, with a name ("Teej"). Every
 * attendance percentage counts school days from here, and families see the
 * named days under "Coming up".
 */
export function DaysEditor() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const now = bsYearMonth(0);
    const [ym, setYm] = useState(now);
    const [editing, setEditing] = useState<Day | null>(null);
    const bounds = bsMonthBounds(ym.year, ym.month);
    const days = useQuery({
        queryKey: ['calendar-days', bounds?.start],
        queryFn: () => academicCalendarService.listDays(bounds!.start, bounds!.end),
        enabled: !!bounds,
    });
    const step = (by: number) => setYm(({ year, month }) => {
        const m = month + by;
        return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });
    const byDate = new Map((days.data ?? []).map((d) => [d.date, d]));
    const cells: (Day | { date: string; missing: true } | null)[] = [];
    if (bounds) {
        const start = new Date(`${bounds.start}T12:00:00`);
        const end = new Date(`${bounds.end}T12:00:00`);
        for (let i = 0; i < start.getDay(); i++) cells.push(null);
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const iso = isoLocal(d);
            cells.push(byDate.get(iso) ?? { date: iso, missing: true });
        }
    }
    const today = isoLocal(new Date());
    const digits = (n: number) => (df.lang === 'ne' ? toNepaliDigits(String(n)) : String(n));
    const named = (days.data ?? []).filter((d) => d.label);

    return (
        <Card className="gap-3">
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h2 className="type-title text-ink">{t('daysEditor.title')}</h2>
                    <p className="type-small text-muted">{t('daysEditor.sub')}</p>
                </div>
                <IconButton icon={ChevronLeft} label={t('childPage.prevMonth')} size={36} onClick={() => step(-1)} />
                <span className="w-[120px] text-center type-small-semibold text-ink">{bounds ? df.date(bounds.start, 'monthYear') : ''}</span>
                <IconButton icon={ChevronRight} label={t('childPage.nextMonth')} size={36} onClick={() => step(1)} />
            </div>
            {days.isPending ? <Skeleton className="h-[260px]" /> : days.isError ? (
                <Banner tone="bad" title={t('daysEditor.loadFailed')}>{errorText(days.error, t('peoplePage.error.body'))}</Banner>
            ) : (
                <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={bounds ? df.date(bounds.start, 'monthYear') : ''}>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => <span key={d} role="columnheader" className="text-center type-caption-semibold text-muted">{t(`parentHome.day.${d}`)}</span>)}
                    {cells.map((c, i) => {
                        if (!c) return <span key={`b${i}`} aria-hidden />;
                        const n = i - cells.findIndex(Boolean) + 1;
                        if ('missing' in c) {
                            return <span key={c.date} role="gridcell" aria-label={t('daysEditor.outside')} className="grid h-12 place-items-center rounded-[10px] type-small text-muted/50">{digits(n)}</span>;
                        }
                        return (
                            <button key={c.date} type="button" role="gridcell" onClick={() => setEditing(c)}
                                aria-label={`${df.date(c.date, 'dayMonth')}: ${c.label ?? t(`daysEditor.type.${c.day_type}`)}`}
                                className={cn('flex h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] px-0.5 outline-none focus-visible:ring-3 focus-visible:ring-focus/60',
                                    LOOK[c.day_type] ?? LOOK.working_day, c.date === today && 'ring-2 ring-primary')}>
                                <span className="type-small-semibold">{digits(n)}</span>
                                {c.label && <span className="w-full truncate text-center type-micro">{c.label}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
            {named.length > 0 && (
                <ul className="flex flex-col gap-1 border-t border-line-subtle pt-2.5">
                    {named.map((d) => (
                        <li key={d.date} className="flex gap-2 type-small"><span className="w-24 shrink-0 text-muted">{df.date(d.date, 'dayMonth').split(', ').pop()}</span><span className="text-ink">{d.label}</span></li>
                    ))}
                </ul>
            )}
            {editing && <DayDialog day={editing} onClose={() => setEditing(null)} />}
        </Card>
    );
}

function DayDialog({ day, onClose }: { day: Day; onClose: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const [type, setType] = useState(day.day_type);
    const [label, setLabel] = useState(day.label ?? '');
    const save = useMutation({
        mutationFn: () => academicCalendarService.patchDay(day.date, type, label.trim()),
        onSuccess: () => {
            ['calendar-days', 'academic-years', 'academic-calendar'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
            onClose();
        },
    });
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={CalendarDays}
            title={df.date(day.date, 'long')} subtitle={t('daysEditor.dialogSub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} onClick={() => save.mutate()}>{t('daysEditor.save')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('daysEditor.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <SelectField label={t('daysEditor.kind')} value={type} onChange={(e) => setType(e.target.value)}
                options={TYPES.map((x) => ({ value: x, label: t(`daysEditor.type.${x}`) }))} />
            <TextField label={t('daysEditor.label')} optional={t('peopleForms.optional')} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100}
                placeholder={t('daysEditor.labelPlaceholder')} hint={t('daysEditor.labelHint')} />
            <p className="type-caption text-muted">{t('daysEditor.note')}</p>
        </Dialog>
    );
}
