import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookMarked, Printer, TrendingDown, TrendingUp, WifiOff } from 'lucide-react';

import { Badge, Button, Card, CardHeader, EmptyState, FilterChips, Skeleton, Table, TableCard, THead, Td, Th, Tr, type BadgeTone } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { examsService, type ReportCard, type ReportCardSubject } from '../../api/services/exams.service';
import { InlineError } from '../../features/home/parts';
import { ChildHeader } from '../../features/parent/ChildHeader';
import { groupByExam, useChildMarks } from '../../features/parent/queries';
import { markText, useChildParam } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { toNepaliDigits } from '../../utils/nepaliDate';
import { MarksheetDocument, PrintStyles } from '../Marks/Marksheet';
import { cn } from '../../utils/cn';

/** Figures that must keep their decimals ("3.60"), in the reader's digits. */
const digits = (v: string, lang: string) => (lang === 'ne' ? toNepaliDigits(v) : v);

const gradeTone = (g: string | null, pass: boolean | null): BadgeTone =>
    pass === false || g === 'NG' ? 'bad' : g?.startsWith('A') ? 'ok' : g === 'B+' ? 'brand' : 'warn';

/**
 * Figma D04 Child marks: pick an exam, see each subject's marks, grade and
 * grade point with the GPA, and how each subject moved since the exam
 * before. Grades come from the school's grading scale on the server (the
 * report card), so they match the printed marksheet exactly.
 *
 * Adapted: there is no class-teacher remark in the data yet, so the GPA card
 * shows the result and subjects passed instead; "Download report card"
 * prints the same marksheet the school prints.
 */
export default function ChildMarksPage() {
    const { t } = useTranslation();
    const { id, child } = useChildParam();
    const marks = useChildMarks(id);
    const exams = groupByExam(marks.data?.marks ?? []).filter((e) => e.examId > 0).reverse();   // newest first
    const [picked, setPicked] = useState<number | null>(null);
    const examId = picked !== null && exams.some((e) => e.examId === picked) ? picked : exams[0]?.examId;
    const prevId = exams[exams.findIndex((e) => e.examId === examId) + 1]?.examId;
    const card = useQuery({ queryKey: ['report-card', examId, id], queryFn: () => examsService.getReportCard(examId!, id), enabled: !!examId && !!id });
    const prev = useQuery({ queryKey: ['report-card', prevId, id], queryFn: () => examsService.getReportCard(prevId!, id), enabled: !!prevId && !!id });

    return (
        <AppPage title={t('childPage.marks')}>
            <PrintStyles />
            <div className="no-print flex flex-col gap-3.5 lg:gap-[18px]">
                <ChildHeader title={t('childPage.marks')}
                    action={card.data && <Button leftIcon={Printer} className="max-md:hidden" onClick={() => window.print()}>{t('childPage.printReport')}</Button>} />
                {marks.isError ? (
                    <EmptyState icon={WifiOff} tone="bad" title={t('childPage.marksErrorTitle', { name: child?.first_name ?? '' })}
                        action={<Button variant="quiet" onClick={() => void marks.refetch()}>{t('classesPage.action.retry')}</Button>}>
                        {t('parentHome.errorBody')}
                    </EmptyState>
                ) : marks.isPending ? <Skeleton className="h-[320px]" /> : exams.length === 0 ? (
                    <EmptyState icon={BookMarked} title={t('childPage.noMarksTitle')}>{t('childPage.noMarksBody')}</EmptyState>
                ) : (
                    <>
                        {exams.length > 1 && (
                            <FilterChips aria-label={t('childPage.pickExam')} value={String(examId)} onChange={(v) => setPicked(Number(v))}
                                items={exams.map((e) => ({ value: String(e.examId), label: e.name }))} />
                        )}
                        {card.isPending ? <Skeleton className="h-[320px]" /> : card.isError ? (
                            <Card><InlineError title={t('childPage.reportError')} onRetry={() => void card.refetch()} /></Card>
                        ) : (
                            <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-[18px]">
                                <div className="order-2 lg:order-1"><Subjects card={card.data} /></div>
                                <div className="order-1 flex flex-col gap-3.5 lg:order-2 lg:gap-[18px]">
                                    <GpaHero card={card.data} prev={prev.data} />
                                    {prev.data && <Comparison now={card.data.subjects} before={prev.data.subjects} beforeName={prev.data.exam.name} />}
                                </div>
                            </div>
                        )}
                        {card.data && <Button leftIcon={Printer} fullWidth className="md:hidden" onClick={() => window.print()}>{t('childPage.printReport')}</Button>}
                    </>
                )}
            </div>
            {card.data && <div className="print-root hidden print:block"><MarksheetDocument data={card.data} /></div>}
        </AppPage>
    );
}

function GpaHero({ card, prev }: { card: ReportCard; prev?: ReportCard }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const gpa = Number(card.gpa);
    const before = prev ? Number(prev.gpa) : null;
    const diff = before !== null ? Math.round((gpa - before) * 100) / 100 : null;
    const pending = card.result === 'PENDING';
    return (
        <section aria-label={t('childPage.gpa')} className="flex flex-col gap-2 rounded-[20px] bg-hero p-[18px] text-white shadow-glow-primary lg:p-6">
            <p className="type-small text-white/80">{card.exam.name}</p>
            <p className="flex flex-wrap items-baseline gap-3">
                <span className="type-figure-l lg:type-figure-xl">{digits(gpa.toFixed(2), lang)}</span>
                <span className="type-h3 text-white/80">{card.grade ? t('childPage.gpaGrade', { grade: card.grade }) : t('childPage.gpa')}</span>
            </p>
            {diff !== null && Math.abs(diff) >= 0.01 && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/14 py-1 pr-3 pl-2.5 ring-1 ring-inset ring-white/22 type-caption-semibold">
                    {diff > 0 ? <TrendingUp size={14} className="text-[#9BE8C6]" aria-hidden /> : <TrendingDown size={14} className="text-[#FFB4AA]" aria-hidden />}
                    {t(diff > 0 ? 'childPage.gpaUp' : 'childPage.gpaDown', { prev: digits(before!.toFixed(2), lang), exam: prev!.exam.name })}
                </span>
            )}
            <div className="mt-1 flex flex-col gap-1 rounded-row bg-[#0B1A3D]/35 px-3.5 py-3 ring-1 ring-inset ring-white/14">
                <p className="type-micro-bold uppercase tracking-wide text-white/70">{t('childPage.result')}</p>
                <p className="type-small">
                    {pending ? t('childPage.resultPending') : t(card.result === 'PASS' ? 'childPage.passed' : 'childPage.failed', {
                        a: formatCount(card.subjects_passed, lang), b: formatCount(card.subjects_passed + card.subjects_failed, lang),
                    })}
                </p>
                <p className="type-micro text-white/65">{t('childPage.totalLine', { got: markText(card.total_obtained), out: markText(card.total_max), pct: digits(markText(card.percent), lang) })}</p>
            </div>
        </section>
    );
}

function Subjects({ card }: { card: ReportCard }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const pct = (s: ReportCardSubject) => (s.percent === null ? '—' : `${digits(markText(s.percent), lang)}%`);
    const grade = (s: ReportCardSubject) => s.is_absent ? <Badge tone="bad">{t('childPage.absentPaper')}</Badge>
        : s.grade ? <Badge tone={gradeTone(s.grade, s.is_pass)}>{s.grade}</Badge> : <span className="text-muted">—</span>;
    return (
        <>
            <TableCard className="max-md:hidden" title={t('childPage.subjectResults')} subtitle={card.exam.name}
                footer={
                    <div className="flex items-center gap-3 bg-surface-2 px-4 py-3.5 md:px-[18px]">
                        <span className="flex-1 type-body-semibold text-ink">{t('childPage.gpaLong')}</span>
                        {card.grade && <Badge tone={gradeTone(card.grade, card.result !== 'FAIL')}>{card.grade}</Badge>}
                        <span className="type-title text-ink">{digits(Number(card.gpa).toFixed(2), lang)}</span>
                    </div>
                }>
                <Table aria-label={t('childPage.subjectResults')}>
                    <THead>
                        <Th>{t('childPage.col.subject')}</Th>
                        <Th className="text-right">{t('childPage.col.marks')}</Th>
                        <Th className="text-right">{t('childPage.col.percent')}</Th>
                        <Th>{t('childPage.col.grade')}</Th>
                        <Th className="text-right">{t('childPage.col.gp')}</Th>
                    </THead>
                    <tbody>
                        {card.subjects.map((s) => (
                            <Tr key={s.subject_id}>
                                <Td className="type-body-semibold text-ink">{s.subject_name}</Td>
                                <Td className="text-right tabular-nums text-ink">{s.is_absent ? '—' : t('childPage.outOf', { a: markText(s.obtained), b: markText(s.max_marks) })}</Td>
                                <Td className="text-right tabular-nums text-ink-2">{pct(s)}</Td>
                                <Td>{grade(s)}</Td>
                                <Td className="text-right type-body-semibold tabular-nums text-ink">{s.grade_point === null || s.is_absent ? '—' : Number(s.grade_point).toFixed(1)}</Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>
            <Card className="gap-0 py-1.5 md:hidden">
                <ul>
                    {card.subjects.map((s) => (
                        <li key={s.subject_id} className="flex items-center gap-2.5 border-b border-line-subtle py-2.5 last:border-b-0">
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <p className="type-body-semibold text-ink">{s.subject_name}</p>
                                <p className="type-small text-muted">{s.is_absent ? t('childPage.absentPaper') : `${t('childPage.outOf', { a: markText(s.obtained), b: markText(s.max_marks) })}, ${pct(s)}`}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                {grade(s)}
                                {!s.is_absent && s.grade_point !== null && <span className="type-caption text-ink-2">{t('childPage.gpShort', { gp: Number(s.grade_point).toFixed(1) })}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </>
    );
}

function Comparison({ now, before, beforeName }: { now: ReportCardSubject[]; before: ReportCardSubject[]; beforeName: string }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const prevBy = new Map(before.map((s) => [s.subject_name, s.percent === null ? null : Number(s.percent)]));
    const rows = now.filter((s) => s.percent !== null && prevBy.get(s.subject_name) != null)
        .map((s) => ({ name: s.subject_name, pct: Number(s.percent), prev: prevBy.get(s.subject_name)! }));
    if (rows.length === 0) return null;
    return (
        <Card className="gap-1.5">
            <CardHeader title={t('childPage.compared')} subtitle={beforeName} />
            <ul>
                {rows.map((r) => {
                    const d = Math.round((r.pct - r.prev) * 10) / 10;
                    const down = d < 0;
                    return (
                        <li key={r.name} className="flex flex-col gap-1.5 border-b border-line-subtle py-2 last:border-b-0">
                            <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate type-small-semibold text-ink">{r.name}</span>
                                <span className="type-small text-muted">{t('childPage.fromTo', { a: formatCount(r.prev, lang), b: formatCount(r.pct, lang) })}</span>
                                {Math.abs(d) >= 1 && <Badge tone={down ? 'bad' : 'ok'}>{t(down ? 'childPage.downN' : 'childPage.upN', { n: formatCount(Math.abs(d), lang) })}</Badge>}
                            </div>
                            <div className="relative h-2 rounded-full bg-sunken" role="img" aria-label={t('childPage.fromTo', { a: r.prev, b: r.pct })}>
                                <div className={cn('h-full rounded-full', down ? 'bg-bad' : 'bg-primary')} style={{ width: `${Math.min(100, r.pct)}%` }} />
                                <span aria-hidden className="absolute -top-0.5 h-3 w-0.5 rounded-sm bg-ink-2" style={{ left: `calc(${Math.min(100, r.prev)}% - 1px)` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="flex gap-3.5 pt-1.5 type-caption text-ink-2">
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-3.5 rounded-full bg-primary" />{t('childPage.thisExam')}</span>
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 rounded-sm bg-ink-2" />{t('childPage.lastExam')}</span>
            </div>
        </Card>
    );
}
