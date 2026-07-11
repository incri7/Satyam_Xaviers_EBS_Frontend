import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService } from '../../api/services/parent.service';
import { getMarksComparison } from '../../api/services/exams.service';
import { ArrowLeft, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

const ChildMarksPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { t } = useTranslation();
    const id = Number(studentId);

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent', 'child-marks', id],
        queryFn: () => parentService.getChildMarks(id),
        enabled: !!id,
    });

    const { data: comparison } = useQuery({
        queryKey: ['marks-comparison', id],
        queryFn: () => getMarksComparison(id),
        enabled: !!id,
    });
    const showComparison = (comparison?.exams.length ?? 0) >= 2;

    type MarkEntry = NonNullable<typeof data>['marks'][number];
    const grouped = (data?.marks ?? []).reduce<Record<string, MarkEntry[]>>((acc, m) => {
        (acc[m.exam_name] = acc[m.exam_name] || []).push(m);
        return acc;
    }, {});

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3">
                        <Link to="/home/parent" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">{t('parent.marks')}</h1>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> {t('parent.failedMarks')}
                        </div>
                    )}

                    {data && Object.keys(grouped).length === 0 && (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <p className="font-bold text-slate-400">{t('parent.noMarks')}</p>
                        </div>
                    )}

                    {/* Compare marks through the year — per-subject % across exams */}
                    {showComparison && comparison && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-brand" />
                                <h2 className="font-bold text-slate-800 text-sm">{t('parent.marksComparison', 'Progress across exams')}</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[480px]">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{t('marks.subject', 'Subject')}</th>
                                            {comparison.exams.map(e => (
                                                <th key={e.id} className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">{e.name}</th>
                                            ))}
                                            <th className="px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">{t('parent.trend', 'Trend')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {comparison.subjects.map(s => {
                                            const values = comparison.exams.map(e => s.pct_by_exam[String(e.id)]);
                                            const present = values.filter((v): v is number => v != null);
                                            const delta = present.length >= 2 ? present[present.length - 1] - present[0] : null;
                                            return (
                                                <tr key={s.subject_id}>
                                                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">{s.subject_name}</td>
                                                    {values.map((v, i) => (
                                                        <td key={i} className={cn(
                                                            'px-4 py-3 text-sm font-bold text-right',
                                                            v == null ? 'text-slate-300' :
                                                            v >= 80 ? 'text-emerald-600' : v >= 60 ? 'text-amber-600' : 'text-red-600'
                                                        )}>
                                                            {v != null ? `${v}%` : '—'}
                                                        </td>
                                                    ))}
                                                    <td className={cn(
                                                        'px-5 py-3 text-sm font-black text-right',
                                                        delta == null ? 'text-slate-300' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'
                                                    )}>
                                                        {delta == null ? '—' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} ${Math.abs(delta).toFixed(1)}`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {Object.entries(grouped).map(([examName, marks]) => (
                        <div key={examName} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                                <h2 className="font-bold text-slate-800">{examName}</h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {marks.map((m, i) => {
                                    const pct = m.max_marks && m.obtained != null
                                        ? Math.round((Number(m.obtained) / Number(m.max_marks)) * 100)
                                        : null;
                                    return (
                                        <div key={i} className="flex items-center justify-between px-5 py-3">
                                            <span className="text-sm font-semibold text-slate-700">{m.subject_name}</span>
                                            <div className="text-right">
                                                {m.is_absent ? (
                                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700">{t('marks.absent')}</span>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {m.obtained ?? '–'} / {m.max_marks ?? '–'}
                                                        </span>
                                                        {pct != null && (
                                                            <p className={cn(
                                                                "text-xs font-semibold mt-0.5",
                                                                pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
                                                            )}>
                                                                {pct}%
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ChildMarksPage;
