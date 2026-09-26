import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CalendarClock, Layers, Plus, Printer, RotateCw } from 'lucide-react';

import { Banner, Button, Card, EmptyState, FilterChips, Skeleton } from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { SelectMenu } from '../../components/common/SelectMenu';
import { academicsService } from '../../api/services/academics.service';
import { timetableService, type TimetableSlot } from '../../api/services/timetable.service';
import { SlotDialog } from '../../features/timetable/SlotDialog';
import { useNotice } from '../../features/people/useNotice';
import { useUrlState, useUrlStateBatch } from '../../hooks/useUrlState';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

/**
 * The school week, Sunday first as Nepali calendars run. `value` is the
 * stored day (Python's weekday(): Monday 0 … Sunday 6). Saturday is shown
 * only when something is scheduled on it.
 */
const WEEK = [6, 0, 1, 2, 3, 4];
const SATURDAY = 5;
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAY_KEY: Record<number, string> = { 0: 'mon', 1: 'tue', 2: 'wed', 3: 'thu', 4: 'fri', 5: 'sat', 6: 'sun' };

/**
 * Figma C09 Timetable: which subject and teacher own each period of a
 * section's week. Leave requests use it to suggest substitutes.
 *
 * Adapted: there is no "copy from another section". Clashes cannot be saved
 * (the server refuses a teacher already teaching in that period), so the
 * page flags periods with no teacher instead.
 */
const TimetablePage: React.FC = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [noticeUI, notify] = useNotice();
    const [classId] = useUrlState('class', '');
    const [chosenSection] = useUrlState('section', '');
    const setUrl = useUrlStateBatch();
    const [mobileDay, setMobileDay] = useState(String(WEEK[0]));
    const [editing, setEditing] = useState<{ day: number; period: number; slot: TimetableSlot | null } | null>(null);

    const { data: classesData } = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }) });
    const { data: sectionsData } = useQuery({
        queryKey: ['sections', Number(classId)],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: !!classId,
    });
    const sections = sectionsData?.sections ?? [];
    // A class with one section needs no second choice.
    const sectionId = chosenSection || (sections.length === 1 ? String(sections[0].id) : '');
    const { data: slots, isPending, isError, refetch } = useQuery({
        queryKey: ['timetable', sectionId],
        queryFn: () => timetableService.getSlots({ section_id: Number(sectionId) }),
        enabled: !!sectionId,
    });

    const all = slots ?? [];
    const days = all.some((s) => s.day_of_week === SATURDAY) ? [...WEEK, SATURDAY] : WEEK;
    const slotAt = (day: number, period: number) => all.find((s) => s.day_of_week === day && s.period_number === period) ?? null;
    const timeOf = (period: number) => all.find((s) => s.period_number === period && s.start_time)?.start_time?.slice(0, 5);
    const noTeacher = all.filter((s) => !s.teacher_id);
    const className = classesData?.classes.find((c) => String(c.id) === classId)?.name ?? '';
    const sectionName = sections.find((s) => String(s.id) === sectionId)?.name ?? '';
    const sectionLabel = [className, sectionName].filter(Boolean).join(' ');
    const dayName = (d: number) => t(`timetablePage.day.${DAY_KEY[d]}`);

    const cell = (day: number, period: number) => {
        const slot = slotAt(day, period);
        return (
            <button type="button" onClick={() => setEditing({ day, period, slot })}
                aria-label={slot ? `${dayName(day)}, ${t('timetablePage.period', { n: formatCount(period, lang) })}: ${slot.subject_name}` : t('timetablePage.addAt', { day: dayName(day), n: formatCount(period, lang) })}
                className={cn(
                    'flex min-h-[58px] w-full flex-col justify-center rounded-row px-3 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                    slot ? (slot.teacher_id ? 'bg-primary-soft hover:bg-primary-soft/70' : 'bg-warn-soft ring-1 ring-inset ring-warn/40')
                        : 'items-center border border-dashed border-line text-muted hover:border-primary-soft-line hover:bg-surface-2',
                )}>
                {slot ? (
                    <>
                        <span className="truncate type-small-semibold text-ink">{slot.subject_name}</span>
                        <span className={cn('truncate type-caption', slot.teacher_id ? 'text-ink-2' : 'text-warn')}>{slot.teacher_name || t('timetablePage.noTeacher')}</span>
                    </>
                ) : <Plus size={16} aria-hidden />}
            </button>
        );
    };

    const actions = sectionId ? <Button variant="quiet" leftIcon={Printer} onClick={() => window.print()}>{t('timetablePage.print')}</Button> : undefined;

    return (
        <AppPage title={t('timetablePage.title')}>
            <PageBar actions={actions}>
                <p className="type-small text-muted">{t('timetablePage.intro')}</p>
            </PageBar>
            {noticeUI}

            <Toolbar>
                <div className="flex flex-wrap gap-2 [&>*]:shrink-0">
                    <SelectMenu value={classId} label={t('attendance.class')} icon={<Layers />} onChange={(v) => setUrl({ class: v || null, section: null })}
                        options={[{ value: '', label: t('attendance.selectClass') }, ...(classesData?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} />
                    {classId && sections.length > 1 && (
                        <SelectMenu value={sectionId} label={t('attendance.section')} onChange={(v) => setUrl({ section: v || null })}
                            options={[{ value: '', label: t('timetablePage.pickSection') }, ...sections.map((s) => ({ value: String(s.id), label: s.name }))]} />
                    )}
                </div>
            </Toolbar>

            {!sectionId ? (
                <Card><EmptyState icon={CalendarClock} title={t('timetablePage.pickTitle')}>{t('timetablePage.pickBody')}</EmptyState></Card>
            ) : isPending ? (
                <Skeleton className="h-[520px] rounded-card" />
            ) : isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>
            ) : (
                <>
                    {noTeacher.length > 0 && (
                        <Banner tone="warn" icon={AlertTriangle} title={t('timetablePage.missingTeacher', { count: noTeacher.length, n: formatCount(noTeacher.length, lang) })}>
                            {noTeacher.slice(0, 3).map((s) => `${dayName(s.day_of_week)} ${t('timetablePage.periodShort', { n: formatCount(s.period_number, lang) })}, ${s.subject_name}`).join('; ')}
                        </Banner>
                    )}
                    {all.length === 0 && <Banner tone="info" title={t('timetablePage.emptyTitle', { name: sectionLabel })}>{t('timetablePage.emptyBody')}</Banner>}

                    {/* Laptops: the week as a grid. */}
                    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-e1 max-md:hidden">
                        <table className="w-full min-w-[760px] border-separate border-spacing-1.5 p-2">
                            <caption className="sr-only">{t('timetablePage.caption', { name: sectionLabel })}</caption>
                            <thead>
                                <tr>
                                    <th scope="col" className="w-24 px-2 py-2 text-left type-caption-semibold text-muted">{t('timetablePage.periodCol')}</th>
                                    {days.map((d) => <th key={d} scope="col" className="px-2 py-2 text-left type-caption-semibold text-muted">{dayName(d)}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {PERIODS.map((p) => (
                                    <tr key={p}>
                                        <th scope="row" className="px-2 text-left align-middle">
                                            <span className="flex flex-col">
                                                <span className="type-small-semibold text-ink">{t('timetablePage.period', { n: formatCount(p, lang) })}</span>
                                                {timeOf(p) && <span className="type-caption tabular-nums text-muted">{timeOf(p)}</span>}
                                            </span>
                                        </th>
                                        {days.map((d) => <td key={d} className="align-top">{cell(d, p)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Phones: one day at a time. */}
                    <div className="flex flex-col gap-3 md:hidden">
                        <FilterChips aria-label={t('timetablePage.dayLabel')} value={mobileDay} onChange={setMobileDay}
                            items={days.map((d) => ({ value: String(d), label: dayName(d), count: formatCount(all.filter((s) => s.day_of_week === d).length, lang) }))} />
                        <ul className="flex flex-col gap-2">
                            {PERIODS.map((p) => (
                                <li key={p} className="flex items-center gap-3">
                                    <span className="flex w-16 shrink-0 flex-col">
                                        <span className="type-small-semibold text-ink">{t('timetablePage.periodShort', { n: formatCount(p, lang) })}</span>
                                        {timeOf(p) && <span className="type-caption tabular-nums text-muted">{timeOf(p)}</span>}
                                    </span>
                                    <span className="min-w-0 flex-1">{cell(Number(mobileDay), p)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}

            {editing && (
                <SlotDialog key={`${editing.day}-${editing.period}`} classId={Number(classId)} sectionId={Number(sectionId)} sectionLabel={sectionLabel}
                    day={editing.day} dayName={dayName(editing.day)} period={editing.period} existing={editing.slot}
                    onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); notify({ tone: 'ok', title: msg }); }} />
            )}
        </AppPage>
    );
};

export default TimetablePage;
