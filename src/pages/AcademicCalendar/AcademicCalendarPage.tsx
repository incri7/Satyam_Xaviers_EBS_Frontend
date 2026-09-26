import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, Plus, RotateCw, Trash2, Wand2 } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, FormRow, IconButton, SelectField, Stepper, TextField, ToggleRow } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { academicCalendarService, type AcademicYear, type CalendarSummary, type TermSetup } from '../../api/services/academicCalendar.service';
import { MonthPreview } from '../../features/calendar/MonthPreview';
import { PRESET_2083, SATURDAY, WEEK_ORDER, countDays, eachDay, expandHolidays, type HolidayRange } from '../../features/calendar/days';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel, currentAcademicYear } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import { bsYearBounds } from '../../utils/nepaliDate';

const STEPS = ['year', 'terms', 'holidays', 'week', 'review'] as const;

/**
 * Figma B04 Academic calendar setup: the year's dates, its terms, holidays,
 * which weekdays the school works, and a review. Attendance percentages
 * count only the school days this produces.
 *
 * The working week defaults to Sunday to Friday. The old page sent Saturday
 * and Sunday as the weekend, which left every Sunday out of the school days
 * attendance is divided by. Running setup again on a year replaces its days.
 */
const AcademicCalendarPage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const [step, setStep] = useState(0);
    const [year, setYear] = useState<AcademicYear | null>(null);
    // Enrolments are keyed "2026-2027" and the server matches the year's name
    // against them, so the name is that form; the BS label is shown beside it.
    const thisStart = Number(currentAcademicYear().split('-')[0]);
    const yearChoices = [thisStart, thisStart + 1].map((y) => `${y}-${y + 1}`);
    const [name, setName] = useState(currentAcademicYear());
    // The school year is Baisakh to Chaitra: the dates start filled in with
    // 1 Baisakh and the last day of Chaitra of the chosen year.
    const boundsOf = (stored: string) => bsYearBounds(Number(stored.split('-')[0]) + 57);
    const [start, setStart] = useState(() => boundsOf(currentAcademicYear())?.start ?? '');
    const [end, setEnd] = useState(() => boundsOf(currentAcademicYear())?.end ?? '');
    const [isCurrent, setIsCurrent] = useState(true);
    const [terms, setTerms] = useState<TermSetup[]>([
        { term_number: 1, name: 'First term', start_date: '', end_date: '' },
        { term_number: 2, name: 'Second term', start_date: '', end_date: '' },
        { term_number: 3, name: 'Third term', start_date: '', end_date: '' },
    ]);
    const [ranges, setRanges] = useState<HolidayRange[]>(PRESET_2083);
    const [draft, setDraft] = useState<HolidayRange>({ label: '', from: '', to: '' });
    const [weekend, setWeekend] = useState<number[]>([SATURDAY]);
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<CalendarSummary | null>(null);

    const years = useQuery({ queryKey: ['academic-years'], queryFn: academicCalendarService.listYears });

    const yearFrom = year?.start_date ?? start;
    const yearTo = year?.end_date ?? end;
    const holidays = useMemo(() => (yearFrom && yearTo ? expandHolidays(ranges, yearFrom, yearTo) : []), [ranges, yearFrom, yearTo]);
    const totals = yearFrom && yearTo && yearTo > yearFrom ? countDays(yearFrom, yearTo, weekend, holidays) : null;
    const usedTerms = terms.filter((x) => x.start_date && x.end_date);

    const createYear = useMutation({
        mutationFn: () => academicCalendarService.createYear({ name, bs_year: academicYearLabel(name, 'en'), start_date: start, end_date: end, is_current: isCurrent }),
        onSuccess: (y) => { setYear(y); queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setStep(1); setTried(false); },
        onError: (err) => setError(errorText(err, t('academicCalendar.failedCreate'))),
    });
    const setup = useMutation({
        mutationFn: () => academicCalendarService.setupDays(year!.id, { weekend_days: weekend, holidays, terms: usedTerms }),
        onSuccess: (summary) => {
            setDone(summary);
            queryClient.invalidateQueries({ queryKey: ['academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
            queryClient.invalidateQueries({ queryKey: ['academic-calendar'] });
        },
        onError: (err) => setError(errorText(err, t('academicCalendar.failedCreate'))),
    });

    /** Start again on a year that exists, keeping its dates. */
    const resume = (y: AcademicYear) => {
        setYear(y); setName(y.name); setStart(y.start_date); setEnd(y.end_date); setIsCurrent(y.is_current);
        setDone(null); setError(null); setStep(1); setTried(false);
        // Its saved terms, where there are any, rather than the blank defaults.
        academicCalendarService.getTerms(y.id).then((saved) => {
            if (saved.length) setTerms(saved.map((x) => ({ term_number: x.term_number, name: x.name ?? '', start_date: x.start_date, end_date: x.end_date })));
        }).catch(() => { /* keep the defaults */ });
    };

    const termProblem = (x: TermSetup) => {
        if (!x.start_date && !x.end_date) return null;
        if (!x.start_date || !x.end_date || x.end_date < x.start_date) return t('calendarPage.termDates');
        if (x.start_date < yearFrom || x.end_date > yearTo) return t('calendarPage.termOutside');
        return null;
    };
    const next = () => {
        setTried(true);
        setError(null);
        if (step === 0) {
            if (year) { setStep(1); setTried(false); return; }
            if (!start || !end || end <= start) return;
            createYear.mutate();
            return;
        }
        if (step === 1 && terms.some(termProblem)) return;
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
        setTried(false);
    };
    const addRange = () => {
        if (!draft.label.trim() || !draft.from) return;
        setRanges((r) => [...r, { label: draft.label.trim(), from: draft.from, to: draft.to && draft.to >= draft.from ? draft.to : draft.from }]);
        setDraft({ label: '', from: '', to: '' });
    };
    const n = (v: number) => formatCount(v, lang);
    const rangeText = (r: HolidayRange) => r.from === r.to ? df.date(r.from) : t('leavePage.range', { from: df.date(r.from), to: df.date(r.to) });
    const inYear = (r: HolidayRange) => r.to >= yearFrom && r.from <= yearTo;

    const stepBody = [
        // 1. Year dates
        <div key="year" className="flex flex-col gap-4">
            {year ? <Banner tone="info" title={t('calendarPage.yearExists', { name: academicYearLabel(year.name, lang) })}>{t('calendarPage.yearExistsBody')}</Banner> : null}
            <SelectField label={t('calendarPage.yearName')} value={name} disabled={!!year} onChange={(e) => { const b = boundsOf(e.target.value); setName(e.target.value); if (b) { setStart(b.start); setEnd(b.end); } }} hint={t('calendarPage.yearNameHint')}
                options={(year && !yearChoices.includes(name) ? [name, ...yearChoices] : yearChoices).map((y) => ({ value: y, label: `${academicYearLabel(y, lang)} (${y})` }))} />
            <FormRow>
                <TextField label={t('academicCalendar.startDate')} type="date" value={start} disabled={!!year} onChange={(e) => setStart(e.target.value)} hint={start ? df.date(start, 'long') : t('calendarPage.startHint')}
                    error={tried && !start ? t('calendarPage.startError') : undefined} />
                <TextField label={t('academicCalendar.endDate')} type="date" value={end} min={start || undefined} disabled={!!year} onChange={(e) => setEnd(e.target.value)} hint={end ? df.date(end, 'long') : t('calendarPage.endHint')}
                    error={tried && (!end || (start && end <= start)) ? t('calendarPage.endError') : undefined} />
            </FormRow>
            {!year && <ToggleRow title={t('academicCalendar.setAsCurrent')} checked={isCurrent} onChange={setIsCurrent}>{t('calendarPage.currentBody')}</ToggleRow>}
        </div>,
        // 2. Terms
        <div key="terms" className="flex flex-col gap-3">
            <p className="type-small text-ink-2">{t('calendarPage.termsIntro')}</p>
            {terms.map((x, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-row border border-line-subtle bg-surface-2 p-3">
                    <div className="flex items-end gap-2">
                        <TextField label={t('calendarPage.termName', { n: n(i + 1) })} value={x.name} containerClassName="flex-1"
                            onChange={(e) => setTerms((p) => p.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
                        <IconButton icon={Trash2} label={t('calendarPage.removeTerm')} onClick={() => setTerms((p) => p.filter((_, j) => j !== i).map((y, j) => ({ ...y, term_number: j + 1 })))} />
                    </div>
                    <FormRow>
                        <TextField label={t('academicCalendar.termStart')} type="date" value={x.start_date} min={yearFrom} max={yearTo}
                            onChange={(e) => setTerms((p) => p.map((y, j) => (j === i ? { ...y, start_date: e.target.value } : y)))} hint={x.start_date ? df.date(x.start_date) : undefined} />
                        <TextField label={t('academicCalendar.termEnd')} type="date" value={x.end_date} min={x.start_date || yearFrom} max={yearTo}
                            onChange={(e) => setTerms((p) => p.map((y, j) => (j === i ? { ...y, end_date: e.target.value } : y)))} hint={x.end_date ? df.date(x.end_date) : undefined}
                            error={tried ? termProblem(x) ?? undefined : undefined} />
                    </FormRow>
                </div>
            ))}
            <Button variant="quiet" leftIcon={Plus} className="w-fit" onClick={() => setTerms((p) => [...p, { term_number: p.length + 1, name: '', start_date: '', end_date: '' }])}>{t('calendarPage.addTerm')}</Button>
        </div>,
        // 3. Holidays
        <div key="holidays" className="flex flex-col gap-3">
            <p className="type-small text-ink-2">{t('calendarPage.holidaysIntro', { n: n(holidays.length) })}</p>
            <div className="flex flex-col gap-2 rounded-row border border-line-subtle bg-surface-2 p-3">
                <TextField label={t('calendarPage.holidayName')} value={draft.label} placeholder={t('calendarPage.holidayHint')} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
                <FormRow>
                    <TextField label={t('leaves.from')} type="date" value={draft.from} min={yearFrom} max={yearTo} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} hint={draft.from ? df.date(draft.from) : undefined} />
                    <TextField label={t('leaves.to')} optional={t('peopleForms.optional')} type="date" value={draft.to} min={draft.from || yearFrom} max={yearTo} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} hint={draft.to ? df.date(draft.to) : t('calendarPage.oneDay')} />
                </FormRow>
                <Button variant="secondary" leftIcon={Plus} className="w-fit" disabled={!draft.label.trim() || !draft.from} onClick={addRange}>{t('calendarPage.addHoliday')}</Button>
            </div>
            <ul className="flex flex-col divide-y divide-line-subtle">
                {ranges.map((r, i) => (
                    <li key={`${r.label}-${r.from}-${i}`} className={cn('flex items-center gap-3 py-2.5', !inYear(r) && 'opacity-50')}>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate type-small-semibold text-ink">{r.label}</span>
                            <span className="type-caption text-muted">
                                {rangeText(r)}, {t('calendarPage.nDays', { count: eachDay(r.from, r.to).length, n: n(eachDay(r.from, r.to).length) })}
                                {!inYear(r) && ` · ${t('calendarPage.outsideYear')}`}
                            </span>
                        </span>
                        <IconButton icon={Trash2} label={t('calendarPage.removeHoliday', { name: r.label })} onClick={() => setRanges((p) => p.filter((_, j) => j !== i))} />
                    </li>
                ))}
            </ul>
            <Button variant="ghost" leftIcon={Wand2} className="w-fit" onClick={() => setRanges((p) => [...p, ...PRESET_2083.filter((x) => !p.some((y) => y.label === x.label && y.from === x.from))])}>{t('calendarPage.loadPreset')}</Button>
        </div>,
        // 4. Working week
        <div key="week" className="flex flex-col gap-3">
            <p className="type-small text-ink-2">{t('calendarPage.weekIntro')}</p>
            <div role="group" aria-label={t('calendarPage.steps.week')} className="grid grid-cols-7 gap-1.5">
                {WEEK_ORDER.map((d) => {
                    const works = !weekend.includes(d);
                    return (
                        <button key={d} type="button" aria-pressed={works} onClick={() => setWeekend((w) => (works ? [...w, d] : w.filter((x) => x !== d)))}
                            className={cn('flex flex-col items-center gap-1 rounded-row border-[1.5px] px-1 py-3 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                works ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-muted')}>
                            <span className="type-small-semibold">{t(`calendarPage.wd.${d}`)}</span>
                            <span className="type-micro">{works ? t('calendarPage.school') : t('calendarPage.off')}</span>
                        </button>
                    );
                })}
            </div>
            {!weekend.includes(6) && <p className="type-caption text-muted">{t('calendarPage.sundayNote')}</p>}
        </div>,
        // 5. Review
        <div key="review" className="flex flex-col gap-3.5">
            {done ? (
                <Banner tone="ok" icon={CheckCircle2} title={t('calendarPage.doneTitle', { name: academicYearLabel(year?.name ?? name, lang) })}>
                    {t('calendarPage.doneBody', { w: n(done.working_days), h: n(done.holidays), e: n(done.weekends) })}
                </Banner>
            ) : <p className="type-small text-ink-2">{t('calendarPage.reviewIntro')}</p>}
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[['total', totals?.total], ['working', done?.working_days ?? totals?.working], ['weekends', done?.weekends ?? totals?.weekends], ['holidays', done?.holidays ?? totals?.holidays]].map(([k, v]) => (
                    <div key={k as string} className={cn('flex flex-col gap-0.5 rounded-row px-3.5 py-3', k === 'working' ? 'bg-primary-soft' : 'bg-surface-2')}>
                        <dd className={cn('type-h3 tabular-nums', k === 'working' ? 'text-primary-text' : 'text-ink')}>{v == null ? '—' : n(v as number)}</dd>
                        <dt className="type-caption text-muted">{t(`calendarPage.count.${k}`)}</dt>
                    </div>
                ))}
            </dl>
            <ul className="flex flex-col gap-1 type-small text-ink-2">
                <li>{t('calendarPage.review.year', { name: academicYearLabel(year?.name ?? name, lang), from: df.date(yearFrom), to: df.date(yearTo) })}</li>
                <li>{usedTerms.length ? t('calendarPage.review.terms', { list: usedTerms.map((x) => x.name || t('calendarPage.termName', { n: x.term_number })).join(', ') }) : t('calendarPage.review.noTerms')}</li>
                <li>{t('calendarPage.review.week', { list: WEEK_ORDER.filter((d) => !weekend.includes(d)).map((d) => t(`calendarPage.wd.${d}`)).join(', ') })}</li>
            </ul>
        </div>,
    ];

    const last = step === STEPS.length - 1;
    return (
        <AppPage title={t('calendarPage.title')}>
            {/* Years already made */}
            {(years.data?.length ?? 0) > 0 && (
                <Card className="gap-3">
                    <CardHeader title={t('calendarPage.years')} />
                    <ul className="flex flex-col divide-y divide-line-subtle">
                        {years.data!.map((y) => (
                            <li key={y.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex items-center gap-2 type-small-semibold text-ink">{academicYearLabel(y.name, lang)}{y.is_current && <Badge tone="ok" dot>{t('academicCalendar.current')}</Badge>}</span>
                                    <span className="type-caption text-muted">
                                        {t('leavePage.range', { from: df.date(y.start_date), to: df.date(y.end_date) })} · {y.working_days_count ? t('calendarPage.schoolDays', { n: n(y.working_days_count) }) : t('academicCalendar.notSetUp')}
                                    </span>
                                </span>
                                <Button variant={y.working_days_count ? 'ghost' : 'quiet'} size="sm" leftIcon={y.working_days_count ? RotateCw : ArrowRight} onClick={() => resume(y)}>
                                    {y.working_days_count ? t('calendarPage.redo') : t('calendarPage.continue')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <Card className="gap-4">
                    <CardHeader title={year ? t('calendarPage.setUpNamed', { name: academicYearLabel(year.name, lang) }) : t('calendarPage.setUpNew')} subtitle={t('calendarPage.intro')} />
                    <Stepper steps={STEPS.map((s) => t(`calendarPage.steps.${s}`))} current={done ? STEPS.length : step} label={t('calendarPage.progress')} />
                    {error && <Banner tone="bad" title={t('calendarPage.failed')}>{error}</Banner>}
                    {stepBody[step]}
                    <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3.5">
                        {step > 0 && !done && <Button variant="ghost" leftIcon={ArrowLeft} onClick={() => { setStep((s) => s - 1); setTried(false); }}>{t('calendarPage.back')}</Button>}
                        <span className="ml-auto" />
                        {!last ? (
                            <Button rightIcon={ArrowRight} loading={createYear.isPending} onClick={next}>{step === 0 && !year ? t('calendarPage.createAndNext') : t('calendarPage.next')}</Button>
                        ) : done ? (
                            <Button variant="quiet" onClick={() => { setDone(null); setYear(null); setStep(0); setStart(''); setEnd(''); }}>{t('calendarPage.another')}</Button>
                        ) : (
                            <Button leftIcon={CalendarCheck} loading={setup.isPending} disabled={!year} onClick={() => { setError(null); setup.mutate(); }}>{t('calendarPage.activate')}</Button>
                        )}
                    </div>
                </Card>

                <Card className="gap-3 lg:sticky lg:top-0">
                    {yearFrom && yearTo && yearTo > yearFrom ? (
                        <>
                            <MonthPreview key={yearFrom} yearFrom={yearFrom} yearTo={yearTo} weekend={weekend} holidays={holidays} />
                            {totals && (
                                <div className="rounded-row bg-primary-soft px-3.5 py-3">
                                    <p className="type-caption text-primary-text">{t('calendarPage.workingIn', { name: academicYearLabel(year?.name ?? name, lang) })}</p>
                                    <p className="type-figure-m tabular-nums text-primary-text">{n(totals.working)}</p>
                                    <p className="type-caption text-primary-text/80">{t('calendarPage.workingOf', { t: n(totals.total), w: n(totals.weekends), h: n(totals.holidays) })}</p>
                                </div>
                            )}
                        </>
                    ) : <EmptyState icon={CalendarDays} title={t('calendarPage.previewTitle')}>{t('calendarPage.previewBody')}</EmptyState>}
                </Card>
            </div>
        </AppPage>
    );
};

export default AcademicCalendarPage;
