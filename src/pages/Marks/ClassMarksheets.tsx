import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronRight, NotebookPen, Printer, Users } from 'lucide-react';

import { Badge, Banner, Button, Card, EmptyState, ListCard, ListRow, Person, SearchField, Skeleton, Table, TableCard, THead, Td, Th, Tr } from '../../design-system';
import type { ClassReportCards } from '../../api/services/exams.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { PrintStyles, MarksheetDocument } from './Marksheet';

/**
 * Figma C05 Class marksheets: the class's results ranked on screen, and a
 * stack of marksheets on paper.
 *
 * On screen the table ranks and compares, which a pile of sheets cannot; the
 * sheets are rendered only for the printer, each on its own page. Students
 * who did not pass every subject are listed after the ranked ones.
 */
export const ClassMarksheets: React.FC<{
    data?: ClassReportCards;
    isLoading: boolean;
    isError: boolean;
    onOpenStudent: (studentId: number) => void;
    onOpenEntry: () => void;
}> = ({ data, isLoading, isError, onOpenStudent, onOpenEntry }) => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [search, setSearch] = useState('');

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[104px] rounded-card" />)}</div>
                <Skeleton className="h-[360px] rounded-card" />
            </div>
        );
    }
    if (isError || !data || data.cards.length === 0) {
        return (
            <Card>
                <EmptyState icon={Users} title={t('marks.noClassMarks')} action={<Button variant="quiet" size="sm" leftIcon={NotebookPen} onClick={onOpenEntry}>{t('marksPage.openEntry')}</Button>}>
                    {t('marks.noClassMarksWhy')}
                </EmptyState>
            </Card>
        );
    }

    const passedCards = data.cards.filter((c) => c.result === 'PASS').sort((a, b) => Number(b.percent) - Number(a.percent));
    const others = data.cards.filter((c) => c.result !== 'PASS').sort((a, b) => Number(b.percent) - Number(a.percent));
    const ranked = [...passedCards.map((c, i) => ({ c, rank: i + 1 })), ...others.map((c) => ({ c, rank: null as number | null }))];
    const q = search.trim().toLowerCase();
    const shown = q ? ranked.filter(({ c }) => c.student_name.toLowerCase().includes(q) || (c.admission_no ?? '').toLowerCase().includes(q)) : ranked;
    const gpas = data.cards.map((c) => Number(c.gpa)).filter(Number.isFinite);
    const classGpa = gpas.length ? gpas.reduce((a, b) => a + b, 0) / gpas.length : null;
    const top = passedCards[0];
    const n = (v: number) => formatCount(v, lang);

    const result = (r: string) => (
        <Badge tone={r === 'PASS' ? 'ok' : r === 'FAIL' ? 'bad' : 'neutral'} dot>{t(`marksPage.result.${r}`, { defaultValue: r })}</Badge>
    );
    const stats = [
        { label: t('marks.marksheetsReady'), value: `${n(data.cards.length)} / ${n(data.total_students)}`, sub: data.without_marks > 0 ? t('marks.withoutMarks', { count: data.without_marks }) : t('marksPage.allHaveMarks') },
        { label: t('marks.passed'), value: n(passedCards.length), sub: t('marksPage.ofGraded', { pct: n(Math.round((passedCards.length / data.cards.length) * 1000) / 10) }), tone: 'text-ok' },
        { label: t('marksPage.notPassed'), value: n(others.length), sub: t('marksPage.notPassedSub'), tone: others.length ? 'text-bad' : undefined },
        { label: t('marksPage.classGpa'), value: classGpa != null ? classGpa.toFixed(2) : '—', sub: top ? t('marksPage.highest', { gpa: top.gpa, name: top.student_name }) : '' },
    ];

    return (
        <>
            <PrintStyles />
            <div className="no-print flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                    {stats.map((s) => (
                        <div key={s.label} className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface p-3.5 shadow-e1 lg:px-[18px] lg:py-4">
                            <p className="type-small-medium text-ink-2">{s.label}</p>
                            <p className={`type-figure-m tabular-nums ${s.tone ?? 'text-ink'}`}>{s.value}</p>
                            <p className="truncate type-caption text-muted">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Students with no marks would print as blank paper, so they are named here. */}
                {data.without_marks > 0 && (
                    <Banner tone="warn" icon={AlertCircle} title={t('marks.withoutMarks', { count: data.without_marks })}
                        action={<Button variant="quiet" size="sm" leftIcon={NotebookPen} onClick={onOpenEntry}>{t('marksPage.openEntry')}</Button>}>
                        {t('marksPage.withoutMarksBody')}
                    </Banner>
                )}

                <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
                    <SearchField value={search} onChange={setSearch} placeholder={t('marksPage.find')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
                    <Button leftIcon={Printer} onClick={() => window.print()} className="md:ml-auto">{t('marks.printAll', { count: data.cards.length })}</Button>
                </div>

                <TableCard className="max-md:hidden" title={t('marksPage.ranked')} subtitle={t('marksPage.rankedSub')}>
                    <Table aria-label={t('marksPage.ranked')}>
                        <THead>
                            <Th className="w-14">{t('marksPage.rank')}</Th>
                            <Th>{t('marks.student')}</Th>
                            <Th className="text-right">{t('marks.total')}</Th>
                            <Th className="text-right">{t('marks.percent')}</Th>
                            <Th className="text-right">{t('marks.gpa')}</Th>
                            <Th className="text-center">{t('marks.grade')}</Th>
                            <Th>{t('marks.result')}</Th>
                            <Th className="w-10"><span className="sr-only">{t('marksPage.open')}</span></Th>
                        </THead>
                        <tbody>
                            {shown.map(({ c, rank }) => (
                                <Tr key={c.student_id} onClick={() => onOpenStudent(c.student_id)} className="cursor-pointer">
                                    <Td className="tabular-nums text-muted">{rank != null ? n(rank) : '—'}</Td>
                                    <Td><Person name={c.student_name} sub={c.admission_no} /></Td>
                                    <Td className="whitespace-nowrap text-right tabular-nums">{t('marksPage.of', { a: c.total_obtained, b: c.total_max })}</Td>
                                    <Td className="text-right type-small-semibold tabular-nums">{c.percent}%</Td>
                                    <Td className="text-right tabular-nums">{c.gpa}</Td>
                                    <Td className="text-center type-small-semibold">{c.grade ?? '—'}</Td>
                                    <Td>{result(c.result)}</Td>
                                    <Td>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenStudent(c.student_id); }} aria-label={t('marksPage.viewCard', { name: c.student_name })}
                                            className="grid size-8 place-items-center rounded-full text-muted outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">
                                            <ChevronRight size={16} aria-hidden />
                                        </button>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                </TableCard>

                <ListCard className="md:hidden">
                    {shown.map(({ c, rank }) => (
                        <ListRow key={c.student_id} onClick={() => onOpenStudent(c.student_id)}>
                            <span className="w-6 shrink-0 text-right type-caption tabular-nums text-muted">{rank != null ? n(rank) : '—'}</span>
                            <span className="min-w-0 flex-1"><Person name={c.student_name} sub={`${c.percent}%, GPA ${c.gpa}`} size={36} /></span>
                            {result(c.result)}
                        </ListRow>
                    ))}
                </ListCard>
            </div>

            {/* Rendered for the printer only. */}
            <div className="print-root hidden print:block">
                {data.cards.map((c) => <MarksheetDocument key={c.student_id} data={c} />)}
            </div>
        </>
    );
};

export default ClassMarksheets;
