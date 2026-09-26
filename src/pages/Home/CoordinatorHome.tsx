import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { examsService } from '../../api/services/exams.service';
import { useAuthStore } from '../../store/useAuthStore';
import { LeaveBalanceCard } from '../../components/leaves/LeaveBalanceCard';
import { AbsentTodayCard } from '../../components/attendance/AbsentTodayCard';
import { Loader2, Users, BookOpen, BarChart2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';

const CoordinatorHome: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { user } = useAuthStore();
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

    const todayLabel = df.date(new Date(), 'long');
    const firstName = user?.firstName || 'Coordinator';

    const { data: examsData } = useQuery({
        queryKey: ['exams'],
        queryFn: () => examsService.listExams(),
        select: (d) => d.exams,
    });

    const { data: marksProgress, isLoading: progressLoading } = useQuery({
        queryKey: ['marks-progress', selectedExamId],
        queryFn: () => examsService.getMarksProgress(selectedExamId!),
        enabled: selectedExamId !== null,
    });

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-[260px]">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {t('home.goodMorning')}, {firstName}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                    </div>

                    <LeaveBalanceCard />

                    <AbsentTodayCard />

                    {/* Quick links */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="/attendance"
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{t('nav.attendance')}</p>
                                <p className="text-xs text-slate-500 font-medium">{t('home.coordinator.viewAttendance')}</p>
                            </div>
                        </a>
                        <a
                            href="/marks"
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{t('nav.marks')}</p>
                                <p className="text-xs text-slate-500 font-medium">{t('home.coordinator.reviewMarks')}</p>
                            </div>
                        </a>
                    </div>

                    {/* Marks entry progress */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-violet-500" />
                                <h2 className="font-bold text-slate-800">{t('home.coordinator.marksEntryProgress')}</h2>
                            </div>
                            {examsData && examsData.length > 0 && (
                                <select
                                    value={selectedExamId ?? ''}
                                    onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                                    className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">{t('home.coordinator.selectExam')}</option>
                                    {examsData.map((exam) => (
                                        <option key={exam.id} value={exam.id}>{exam.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedExamId === null && (
                            <div className="py-10 text-center text-sm text-slate-400 font-medium">
                                {t('home.coordinator.selectExamPrompt')}
                            </div>
                        )}

                        {selectedExamId !== null && progressLoading && (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                            </div>
                        )}

                        {marksProgress && (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.coordinator.overall')}</p>
                                    <p className="text-xs font-black text-slate-900">
                                        {marksProgress.overall_pct.toFixed(0)}%
                                    </p>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full rounded-full bg-violet-500 transition-all"
                                        style={{ width: `${marksProgress.overall_pct}%` }}
                                    />
                                </div>

                                {marksProgress.entries.length === 0 && (
                                    <p className="text-sm text-slate-400 font-medium text-center py-4">
                                        {t('home.coordinator.noSchedules')}
                                    </p>
                                )}
                                {marksProgress.entries.map((entry) => {
                                    const pct = Math.min(100, entry.completion_pct);
                                    const color = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
                                    return (
                                        <div key={entry.schedule_id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-semibold text-slate-700">
                                                    {entry.subject_name}
                                                    <span className="ml-2 text-slate-400 font-medium">
                                                        {entry.class_name} · {entry.section_name}
                                                    </span>
                                                </p>
                                                <p className="text-xs font-black text-slate-900">
                                                    {entry.marks_entered}/{entry.total_enrolled}
                                                    <span className="ml-1 text-slate-400 font-medium">({pct.toFixed(0)}%)</span>
                                                </p>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn('h-full rounded-full transition-all', color)}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CoordinatorHome;
