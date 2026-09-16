import React from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Loader2, Users, AlertCircle, ChevronRight } from 'lucide-react';
import type { ClassReportCards } from '../../api/services/exams.service';
import { cn } from '../../utils/cn';
import { PrintStyles, MarksheetDocument } from './Marksheet';

/**
 * The whole class: a results table on screen, a stack of marksheets on paper.
 *
 * Printing a class one child at a time is the job this replaces. On screen the
 * table is the more useful artefact — it ranks and compares, which a pile of
 * individual sheets cannot — while the sheets themselves are rendered only for
 * the printer, each breaking to its own page.
 */
export const ClassMarksheets: React.FC<{
    data?: ClassReportCards;
    isLoading: boolean;
    isError: boolean;
    /** The row is the way into a student's sheet. The table already shows more
     *  than a dropdown could — percentage, GPA, grade, result — so it should
     *  be the thing you click rather than a list to cross-reference. */
    onOpenStudent: (studentId: number) => void;
}> = ({ data, isLoading, isError, onOpenStudent }) => {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        );
    }

    if (isError || !data || data.cards.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">{t('marks.noClassMarks')}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">{t('marks.noClassMarksWhy')}</p>
            </div>
        );
    }

    const passed = data.cards.filter((c) => c.result === 'PASS').length;

    return (
        <>
            <PrintStyles />

            <div className="no-print space-y-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {t('marks.marksheetsReady')}
                        </p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">
                            {data.cards.length}
                            <span className="text-sm font-bold text-slate-400"> / {data.total_students}</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {t('marks.passed')}
                        </p>
                        <p className="text-2xl font-black text-emerald-600 tabular-nums">{passed}</p>
                    </div>
                    {data.cards.length - passed > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {t('marks.failed')}
                            </p>
                            <p className="text-2xl font-black text-red-500 tabular-nums">
                                {data.cards.length - passed}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold text-sm rounded-xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        {t('marks.printAll', { count: data.cards.length })}
                    </button>
                </div>

                {/* Students with no marks would print as blank paper, so they are
                    named here instead of silently dropped from the stack. */}
                {data.without_marks > 0 && (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 text-amber-800">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-sm font-bold">
                            {t('marks.withoutMarks', { count: data.without_marks })}
                        </p>
                    </div>
                )}

                <p className="text-xs font-bold text-slate-400 px-1">{t('marks.openHint')}</p>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['#', t('marks.student'), t('marks.admissionNo')].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                    {[t('marks.obtained'), t('marks.percent'), t('marks.gpa')].map((h) => (
                                        <th key={h} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                    {[t('marks.grade'), t('marks.result')].map((h) => (
                                        <th key={h} className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                    <th className="w-8" aria-hidden="true" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.cards.map((c, i) => (
                                    <tr
                                        key={c.student_id}
                                        onClick={() => onOpenStudent(c.student_id)}
                                        tabIndex={0}
                                        role="button"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onOpenStudent(c.student_id);
                                            }
                                        }}
                                        className="cursor-pointer hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 transition-colors"
                                    >
                                        <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                                        <td className="px-4 py-2.5 text-sm font-bold text-slate-800">{c.student_name}</td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{c.admission_no}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-600">
                                            {c.total_obtained} / {c.total_max}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums font-bold text-slate-900">
                                            {c.percent}%
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-600">
                                            {c.gpa}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-center font-black text-slate-900">
                                            {c.grade ?? '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={cn(
                                                'text-[10px] font-black uppercase px-2 py-1 rounded-lg',
                                                c.result === 'PASS' ? 'bg-emerald-50 text-emerald-600'
                                                    : c.result === 'FAIL' ? 'bg-red-50 text-red-500'
                                                        : 'bg-slate-100 text-slate-500',
                                            )}>
                                                {c.result}
                                            </span>
                                        </td>
                                        <td className="pr-4 text-slate-300">
                                            <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Rendered for the printer only — on screen the table above says
                more in less space than thirty stacked sheets would. */}
            <div className="print-root hidden print:block">
                {data.cards.map((c) => (
                    <MarksheetDocument key={c.student_id} data={c} />
                ))}
            </div>
        </>
    );
};

export default ClassMarksheets;
