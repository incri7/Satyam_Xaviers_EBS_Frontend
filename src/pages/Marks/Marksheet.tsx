import React from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, FileText, ArrowLeft } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../design-system';
import type { ReportCard } from '../../api/services/exams.service';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel } from '../../utils/academicYear';

/**
 * One student's result for one exam, laid out to be printed.
 *
 * The whole thing already existed server-side — /exams/{id}/report-card/{id}
 * returns every subject with its letter grade and grade point, the totals, and
 * the school letterhead — and nothing in the app ever called it. This is the
 * page that does.
 *
 * Grades are not stored on a mark; the endpoint derives them from grade_bands
 * on read. Correcting a band therefore re-grades every past marksheet rather
 * than leaving stale letters behind, which is why nothing is cached here.
 */

/**
 * Shared by the single sheet and the whole-class stack.
 *
 * Everything outside .print-root is chrome — sidebar, header, the page's own
 * controls — and has no place on a document that gets signed and handed out.
 * Each sheet breaks to its own page so a class prints as a stack rather than
 * one continuous ribbon; the last one does not, or every job ends on a blank.
 */
export const PrintStyles: React.FC = () => (
    <style>{`
        @media print {
            body * { visibility: hidden; }
            .print-root, .print-root * { visibility: visible; }
            .print-root { position: absolute; inset: 0; margin: 0; }
            .print-sheet {
                border: none; box-shadow: none; border-radius: 0;
                max-width: none; margin: 0; padding: 0;
                break-after: page; page-break-after: always;
            }
            .print-sheet:last-child { break-after: auto; page-break-after: auto; }
            .no-print { display: none !important; }
            @page { margin: 14mm; }
        }
    `}</style>
);

const Cell: React.FC<{ children?: React.ReactNode; className?: string; head?: boolean }> =
    ({ children, className, head }) => {
        const Tag = head ? 'th' : 'td';
        return (
            <Tag className={cn(
                'border border-slate-300 px-3 py-2 text-sm',
                head && 'bg-slate-100 font-bold text-slate-700 text-xs uppercase tracking-wide',
                className,
            )}>
                {children}
            </Tag>
        );
    };

/** The sheet itself, with no surrounding controls — reused per student when a
 *  whole class is printed at once. */
export const MarksheetDocument: React.FC<{ data: ReportCard }> = ({ data }) => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { school, exam, subjects } = data;
    const passed = data.result === 'PASS';

    return (
        <div className="print-sheet bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-10 max-w-3xl mx-auto">
            <header className="text-center border-b-2 border-slate-800 pb-4 mb-5">
                {school?.logo_url && (
                    <img src={school.logo_url} alt="" className="h-16 mx-auto mb-2" />
                )}
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{school?.name}</h1>
                {school?.name_nepali && (
                    <p className="text-sm font-bold text-slate-600">{school.name_nepali}</p>
                )}
                {school?.address && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{school.address}</p>
                )}
                <p className="text-xs font-medium text-slate-400">
                    {[school?.phone, school?.email].filter(Boolean).join(' · ')}
                </p>
                {school?.motto && (
                    <p className="text-[11px] italic text-slate-400 mt-1">{school.motto}</p>
                )}
            </header>

            <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-slate-700 mb-5">
                {exam.name}{exam.term ? ' · ' + exam.term : ''} · {academicYearLabel(exam.academic_year, df.lang)}
            </p>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-5 text-sm">
                {[
                    [t('marks.student'), data.student_name],
                    [t('marks.admissionNo'), data.admission_no],
                    [t('marks.class'), [data.class_name, data.section_name].filter(Boolean).join(' ')],
                    [t('marks.examDate'), df.date(new Date())],
                ].map(([label, value]) => (
                    <div key={String(label)} className="flex gap-2">
                        <dt className="font-bold text-slate-500 shrink-0">{label}:</dt>
                        <dd className="font-bold text-slate-900 truncate">{value || '—'}</dd>
                    </div>
                ))}
            </dl>

            <table className="w-full border-collapse mb-5">
                <thead>
                    <tr>
                        <Cell head className="text-left w-8">#</Cell>
                        <Cell head className="text-left">{t('marks.subject')}</Cell>
                        <Cell head className="text-right">{t('marks.fullMarks')}</Cell>
                        <Cell head className="text-right">{t('marks.obtained')}</Cell>
                        <Cell head className="text-right">{t('marks.percent')}</Cell>
                        <Cell head className="text-center">{t('marks.grade')}</Cell>
                        <Cell head className="text-center">{t('marks.gradePoint')}</Cell>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((s, i) => (
                        <tr key={s.subject_id}>
                            <Cell className="text-slate-400">{i + 1}</Cell>
                            <Cell className="font-medium text-slate-800">{s.subject_name}</Cell>
                            <Cell className="text-right tabular-nums text-slate-600">{s.max_marks}</Cell>
                            <Cell className={cn(
                                'text-right tabular-nums font-bold',
                                s.is_absent ? 'text-slate-400 italic' : 'text-slate-900',
                            )}>
                                {s.is_absent ? t('marks.absent') : (s.obtained ?? '—')}
                            </Cell>
                            <Cell className="text-right tabular-nums text-slate-600">
                                {s.percent ? s.percent + '%' : '—'}
                            </Cell>
                            <Cell className={cn(
                                'text-center font-black',
                                s.is_pass === false ? 'text-red-600' : 'text-slate-900',
                            )}>
                                {s.grade ?? '—'}
                            </Cell>
                            <Cell className="text-center tabular-nums text-slate-600">
                                {s.grade_point ?? '—'}
                            </Cell>
                        </tr>
                    ))}
                    <tr>
                        <Cell head />
                        <Cell head className="text-right">{t('marks.total')}</Cell>
                        <Cell head className="text-right tabular-nums">{data.total_max}</Cell>
                        <Cell head className="text-right tabular-nums">{data.total_obtained}</Cell>
                        <Cell head className="text-right tabular-nums">{data.percent}%</Cell>
                        <Cell head className="text-center">{data.grade ?? '—'}</Cell>
                        <Cell head className="text-center tabular-nums">{data.gpa}</Cell>
                    </tr>
                </tbody>
            </table>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm mb-10">
                <span className="font-bold text-slate-500">
                    {t('marks.gpa')}: <span className="text-slate-900 font-black">{data.gpa}</span>
                </span>
                <span className="font-bold text-slate-500">
                    {t('marks.subjectsPassed')}: <span className="text-slate-900 font-black">
                        {data.subjects_passed}
                    </span>
                    {data.subjects_failed > 0 && (
                        <span className="text-red-600 font-black"> · {t('marks.failed')} {data.subjects_failed}</span>
                    )}
                </span>
                <span className={cn(
                    'ml-auto px-4 py-1.5 rounded-lg font-black uppercase tracking-wider',
                    data.result === 'PENDING' ? 'bg-slate-100 text-slate-500'
                        : passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
                )}>
                    {data.result}
                </span>
            </div>

            {/* Ruled lines, because this gets signed on paper. */}
            <div className="grid grid-cols-3 gap-8 pt-6 text-center text-xs font-bold text-slate-500">
                {[t('marks.classTeacher'), t('marks.checkedBy'),
                  school?.principal_name || t('marks.principal')].map((label, i) => (
                    <div key={i}>
                        <div className="border-t border-slate-400 pt-1.5">{label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Marksheet: React.FC<{
    data?: ReportCard;
    isLoading: boolean;
    isError: boolean;
    onBack: () => void;
}> = ({ data, isLoading, isError, onBack }) => {
    const { t } = useTranslation();
    const bar = (
        <div className="no-print flex flex-wrap items-center gap-2">
            <Button variant="ghost" leftIcon={ArrowLeft} onClick={onBack}>{t('marks.backToClass')}</Button>
            {data && !isLoading && !isError && (
                <>
                    <Badge tone={data.result === 'PASS' ? 'ok' : data.result === 'FAIL' ? 'bad' : 'neutral'} dot>{t(`marksPage.result.${data.result}`, { defaultValue: data.result })}</Badge>
                    <Button variant="secondary" leftIcon={Printer} onClick={() => window.print()} className="ml-auto">{t('marks.printMarksheet')}</Button>
                </>
            )}
        </div>
    );

    if (isLoading) {
        return <div className="flex flex-col gap-3.5">{bar}<Skeleton className="mx-auto h-[640px] w-full max-w-3xl rounded-card" /></div>;
    }
    if (isError || !data) {
        return (
            <div className="flex flex-col gap-3.5">
                {bar}
                <Card><EmptyState icon={FileText} title={t('marks.noMarksheet')}>{t('marks.noMarksheetWhy')}</EmptyState></Card>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-3.5">
            <PrintStyles />
            {bar}
            <div className="print-root">
                <MarksheetDocument data={data} />
            </div>
        </div>
    );
};

export default Marksheet;
