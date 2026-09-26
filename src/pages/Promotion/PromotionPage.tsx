import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Award, CheckCircle2, GraduationCap, Layers, RotateCw, ShieldAlert } from 'lucide-react';

import { Badge, Banner, Button, Card, EmptyState, FilterChips, Person, SearchField, SegmentedControl, SelectField, Skeleton } from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { SelectMenu } from '../../components/common/SelectMenu';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { academicCalendarService, type PromotionConfirmEntry, type PromotionDecision } from '../../api/services/academicCalendar.service';
import { academicsService } from '../../api/services/academics.service';
import { classRank } from '../../features/dashboard/queries';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

type Final = PromotionConfirmEntry['final_decision'];
type Group = 'promote' | 'hold' | 'leave' | 'review';
interface Row { d: PromotionDecision; group: Group; misLeaving: boolean }

/**
 * Figma B05 Year-end promotion: the server's recommendation for every
 * student, changeable here, then one confirm that enrols them in the next
 * year. Each student starts with a next class — the class above for
 * promotion, the same class for holding back — so nobody is left out of the
 * confirm for want of a dropdown.
 *
 * The server picks the leaving class by the highest class *name*, which
 * makes "UKG" outrank "Class 10". Only the genuinely highest class is
 * treated as leaving here; anyone else it marks as leaving is flagged for
 * review instead.
 */
const PromotionPage: React.FC = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const [decision, setDecision] = useState<Record<number, Final>>({});
    const [toClass, setToClass] = useState<Record<number, number>>({});
    const [target, setTarget] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [view, setView] = useState<'all' | Group>('all');
    const [search, setSearch] = useState('');
    const [done, setDone] = useState<{ enrollments_created: number; graduated: number } | null>(null);

    const current = useQuery({ queryKey: ['academic-years', 'current'], queryFn: academicCalendarService.getCurrentYear, retry: false });
    const years = useQuery({ queryKey: ['academic-years'], queryFn: academicCalendarService.listYears });
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }) });
    const evaluate = useMutation({ mutationFn: () => academicCalendarService.evaluatePromotion(current.data!.id), onSuccess: () => { setDecision({}); setToClass({}); } });

    const classList = useMemo(() => classes.data?.classes ?? [], [classes.data]);
    const topRank = Math.max(...classList.map((c) => classRank(c.name)).filter((r) => r < 1000), -99);
    const idOf = (name: string) => classList.find((c) => c.name === name)?.id;
    const nextOf = (name: string) => {
        const above = classList.filter((c) => classRank(c.name) === classRank(name) + 1);
        return above.length === 1 ? above[0].id : undefined; // Class 10 → Science or Management is the school's choice
    };

    const rows: Row[] = useMemo(() => {
        const r = evaluate.data;
        if (!r) return [];
        const leaving = r.graduating.map((d) => (classRank(d.class_name) === topRank
            ? { d, group: 'leave' as Group, misLeaving: false }
            : { d, group: 'review' as Group, misLeaving: true }));
        return [
            ...r.promote.map((d) => ({ d, group: 'promote' as Group, misLeaving: false })),
            ...r.hold_back.map((d) => ({ d, group: 'hold' as Group, misLeaving: false })),
            ...r.review_required.map((d) => ({ d, group: 'review' as Group, misLeaving: false })),
            ...leaving,
        ];
    }, [evaluate.data, topRank]);

    const defaultFinal = (row: Row): Final | undefined =>
        row.group === 'promote' ? 'PROMOTE' : row.group === 'hold' ? 'HOLD_BACK' : row.group === 'leave' ? 'GRADUATING' : undefined;
    const finalOf = (row: Row) => decision[row.d.student_id] ?? defaultFinal(row);
    const classOf = (row: Row) => {
        const f = finalOf(row);
        if (toClass[row.d.student_id]) return toClass[row.d.student_id];
        if (f === 'PROMOTE') return nextOf(row.d.class_name);
        if (f === 'HOLD_BACK') return idOf(row.d.class_name);
        return undefined;
    };
    const ready = (row: Row) => { const f = finalOf(row); return f === 'GRADUATING' || (!!f && !!classOf(row)); };
    const unready = rows.filter((r) => !ready(r));

    const counts = { promote: 0, hold: 0, leave: 0, review: 0 };
    rows.forEach((r) => { counts[r.group] += 1; });
    const q = search.trim().toLowerCase();
    const shown = rows.filter((r) => (view === 'all' || r.group === view) && (!classFilter || r.d.class_name === classFilter) && (!q || r.d.student_name.toLowerCase().includes(q)));
    const classNames = [...new Set(rows.map((r) => r.d.class_name))].sort((a, b) => classRank(a) - classRank(b));
    const targets = (years.data ?? []).filter((y) => y.id !== current.data?.id);
    const targetName = target || targets.find((y) => !y.is_current && y.start_date > (current.data?.start_date ?? ''))?.name || '';

    const confirmPromotion = useMutation({
        mutationFn: () => academicCalendarService.confirmPromotion({
            from_academic_year_id: current.data!.id,
            to_academic_year_name: targetName,
            decisions: rows.map((r) => ({ student_id: r.d.student_id, final_decision: finalOf(r)!, to_class_id: classOf(r) ?? 0 })),
        }),
        onSuccess: (res) => { setDone(res); ['academic-years', 'enrollments', 'students'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); },
    });
    const askConfirm = () => confirm({
        title: t('promotionPage.confirmTitle', { year: academicYearLabel(targetName, lang) }),
        body: t('promotionPage.confirmBody', { n: formatCount(rows.length - counts.leave, lang), l: formatCount(rows.filter((r) => finalOf(r) === 'GRADUATING').length, lang) }),
        confirmLabel: t('promotionPage.confirm'),
        onConfirm: () => confirmPromotion.mutate(),
    });

    const setFinal = (row: Row, f: Final) => {
        setDecision((d) => ({ ...d, [row.d.student_id]: f }));
        setToClass((c) => { const n = { ...c }; delete n[row.d.student_id]; return n; });
    };
    const pct = (v: number) => `${formatCount(Math.round(v * 10) / 10, lang)}%`;
    const groupBadge = (row: Row) => row.misLeaving
        ? <Badge tone="warn" dot>{t('promotionPage.checkLeaving')}</Badge>
        : row.group === 'review' ? <Badge tone="warn" dot>{t('promotionPage.group.review')}</Badge> : null;
    const decisionControl = (row: Row) => {
        const f = finalOf(row);
        if (row.group === 'leave') return <Badge tone="info" dot>{t('promotionPage.leaving')}</Badge>;
        return (
            <SegmentedControl size="sm" aria-label={t('promotionPage.decision')} value={(f ?? '') as string} onChange={(v) => setFinal(row, v as Final)} className="w-max"
                options={[{ value: 'PROMOTE', label: t('promotionPage.promote') }, { value: 'HOLD_BACK', label: t('promotionPage.hold') }]} />
        );
    };
    const classControl = (row: Row) => {
        const f = finalOf(row);
        if (f === 'GRADUATING') return <span className="type-small text-muted">{t('promotionPage.leavesSchool')}</span>;
        if (!f) return <span className="type-small text-warn">{t('promotionPage.decideFirst')}</span>;
        return (
            <SelectField label={t('promotionPage.nextYear')} className="h-10" containerClassName="min-w-[150px] [&_label]:sr-only" value={classOf(row) ?? ''} placeholder={t('promotionPage.pickClass')}
                onChange={(e) => setToClass((c) => ({ ...c, [row.d.student_id]: Number(e.target.value) }))}
                options={classList.map((c) => ({ value: c.id, label: c.name }))} />
        );
    };

    const stats: { key: Group; icon: typeof Award; tone: string }[] = [
        { key: 'promote', icon: Award, tone: 'text-ok' },
        { key: 'hold', icon: RotateCw, tone: 'text-bad' },
        { key: 'leave', icon: GraduationCap, tone: 'text-info' },
        { key: 'review', icon: ShieldAlert, tone: 'text-warn' },
    ];

    return (
        <AppPage title={t('promotionPage.title')}>
            {confirmUI}
            <PageBar actions={evaluate.data && !done ? <Button variant="quiet" leftIcon={RotateCw} loading={evaluate.isPending} onClick={() => evaluate.mutate()}>{t('promotionPage.again')}</Button> : undefined}>
                <p className="type-small text-muted">{current.data ? t('promotionPage.intro', { year: academicYearLabel(current.data.name, lang) }) : t('promotionPage.introPlain')}</p>
            </PageBar>

            {done ? (
                <Card><EmptyState icon={CheckCircle2} title={t('promotion.complete')}>{t('promotionPage.doneBody', { n: formatCount(done.enrollments_created, lang), l: formatCount(done.graduated, lang), year: academicYearLabel(targetName, lang) })}</EmptyState></Card>
            ) : current.isPending ? <Skeleton className="h-[200px] rounded-card" />
                : !current.data ? (
                    <Card><EmptyState icon={AlertTriangle} tone="bad" title={t('promotionPage.noYear')}>{t('promotion.noYear')}</EmptyState></Card>
                ) : !evaluate.data ? (
                    <Card>
                        <EmptyState icon={GraduationCap} title={t('promotionPage.readyTitle', { year: academicYearLabel(current.data.name, lang) })}
                            action={<Button leftIcon={GraduationCap} loading={evaluate.isPending} onClick={() => evaluate.mutate()}>{t('promotion.evaluate')}</Button>}>
                            {t('promotionPage.readyBody')}
                        </EmptyState>
                        {evaluate.isError && <Banner tone="bad" title={t('promotion.evalFailed')}>{errorText(evaluate.error, t('peoplePage.error.body'))}</Banner>}
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                            {stats.map((s) => (
                                <button key={s.key} type="button" onClick={() => setView(view === s.key ? 'all' : s.key)} aria-pressed={view === s.key}
                                    className={cn('flex flex-col gap-1 rounded-card border bg-surface p-3.5 text-left shadow-e1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60 lg:px-[18px] lg:py-4',
                                        view === s.key ? 'border-primary' : 'border-line hover:border-primary-soft-line')}>
                                    <span className="flex items-center gap-2 type-small-medium text-ink-2"><s.icon size={16} className={s.tone} aria-hidden />{t(`promotionPage.group.${s.key}`)}</span>
                                    <span className={cn('type-figure-m tabular-nums', s.tone)}>{formatCount(counts[s.key], lang)}</span>
                                    <span className="type-caption text-muted">{t(`promotionPage.groupSub.${s.key}`)}</span>
                                </button>
                            ))}
                        </div>
                        {rows.some((r) => r.misLeaving) && (
                            <Banner tone="warn" icon={AlertTriangle} title={t('promotionPage.misLeavingTitle', { count: rows.filter((r) => r.misLeaving).length, n: formatCount(rows.filter((r) => r.misLeaving).length, lang) })}>{t('promotionPage.misLeavingBody')}</Banner>
                        )}

                        <Toolbar>
                            <SearchField value={search} onChange={setSearch} placeholder={t('promotionPage.search')} clearLabel={t('common.clear')} containerClassName="md:w-[260px]" />
                            <SelectMenu value={classFilter} label={t('attendance.class')} icon={<Layers />} onChange={setClassFilter}
                                options={[{ value: '', label: t('classesPage.enrolments.allClasses') }, ...classNames.map((c) => ({ value: c, label: c }))]} />
                        </Toolbar>
                        {view !== 'all' && <FilterChips aria-label={t('promotionPage.decision')} value={view} onChange={setView}
                            items={[{ value: 'all', label: t('financePage.expenses.all'), count: formatCount(rows.length, lang) }, { value: view, label: t(`promotionPage.group.${view}`), count: formatCount(counts[view as Group], lang) }]} />}

                        <Card className="gap-0 overflow-hidden p-0">
                            <div aria-hidden className="grid grid-cols-[minmax(0,1.6fr)_repeat(2,80px)_190px_170px] gap-3 border-b border-line-subtle px-5 py-2.5 type-caption-semibold text-muted max-lg:hidden">
                                <span>{t('promotionPage.student')}</span><span className="text-right">{t('promotionPage.attendance')}</span><span className="text-right">{t('promotionPage.marks')}</span>
                                <span>{t('promotionPage.decision')}</span><span>{t('promotionPage.nextYear')}</span>
                            </div>
                            <ul className="flex flex-col divide-y divide-line-subtle">
                                {shown.slice(0, 300).map((row) => (
                                    <li key={row.d.student_id} className={cn('grid items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,80px)_190px_170px] lg:px-5', !ready(row) && 'bg-warn-soft/40')}>
                                        <span className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1"><Person name={row.d.student_name} sub={row.d.class_name} size={36} /></span>{groupBadge(row)}</span>
                                        <span className="flex flex-col lg:items-end"><span className="type-caption text-muted lg:hidden">{t('promotionPage.attendance')}</span><span className={cn('type-small-semibold tabular-nums', row.d.attendance_pct < 75 ? 'text-bad' : 'text-ink')}>{pct(row.d.attendance_pct)}</span></span>
                                        <span className="flex flex-col lg:items-end"><span className="type-caption text-muted lg:hidden">{t('promotionPage.marks')}</span><span className={cn('type-small-semibold tabular-nums', row.d.marks_pct < 40 ? 'text-bad' : 'text-ink')}>{pct(row.d.marks_pct)}</span></span>
                                        <span>{decisionControl(row)}</span>
                                        <span>{classControl(row)}</span>
                                    </li>
                                ))}
                                {shown.length === 0 && <li className="px-5 py-6 text-center type-small text-muted">{t('peoplePage.empty.filtered')}</li>}
                            </ul>
                            {shown.length > 300 && <p className="border-t border-line-subtle px-5 py-3 type-caption text-muted">{t('promotionPage.narrow', { n: formatCount(shown.length, lang) })}</p>}
                        </Card>

                        <Card className="sticky bottom-3 z-10 gap-3 shadow-e3">
                            <div className="flex flex-wrap items-end gap-3">
                                <SelectField label={t('promotionPage.target')} value={targetName} placeholder={t('peopleForms.choose')} containerClassName="w-full sm:w-[260px]"
                                    hint={targets.length ? undefined : t('promotionPage.noTarget')} onChange={(e) => setTarget(e.target.value)}
                                    options={targets.map((y) => ({ value: y.name, label: `${academicYearLabel(y.name, lang)} (${y.name})` }))} />
                                <p className={cn('flex-1 type-small', unready.length ? 'text-warn' : 'text-ink-2')}>
                                    {unready.length ? t('promotionPage.unready', { count: unready.length, n: formatCount(unready.length, lang) }) : t('promotionPage.allReady', { n: formatCount(rows.length, lang) })}
                                </p>
                                <Button leftIcon={CheckCircle2} loading={confirmPromotion.isPending} disabled={!targetName || unready.length > 0} onClick={askConfirm}>{t('promotionPage.confirm')}</Button>
                            </div>
                            {confirmPromotion.isError && <Banner tone="bad" title={t('promotion.confirmFailed')}>{errorText(confirmPromotion.error, t('peoplePage.error.body'))}</Banner>}
                            <p className="type-caption text-muted">{t('promotionPage.irreversible')}</p>
                        </Card>
                    </>
                )}
        </AppPage>
    );
};

export default PromotionPage;
