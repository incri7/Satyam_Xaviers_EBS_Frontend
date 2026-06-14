import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { studentService, type AssignmentSummary, type MarkTrendEntry } from '../../api/services/student.service';
import {
    Loader2, CheckCircle2, AlertCircle, BookOpen,
    TrendingUp, TrendingDown, Minus, Calendar, ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_STYLE: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700',
    A: 'bg-red-100 text-red-700',
    L: 'bg-amber-100 text-amber-700',
    HD: 'bg-blue-100 text-blue-700',
    H: 'bg-slate-100 text-slate-500',
    not_marked: 'bg-slate-100 text-slate-500',
};

const SUBMISSION_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    submitted: 'bg-emerald-100 text-emerald-700',
    graded: 'bg-brand/10 text-brand',
    missing: 'bg-red-100 text-red-700',
};

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
};

const StudentHome: React.FC = () => {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';

    const STATUS_LABEL: Record<string, string> = {
        P: t('home.student.presentToday'),
        A: t('home.student.absentToday'),
        L: t('home.student.lateToday'),
        HD: t('home.student.halfDay'),
        H: t('home.student.holiday'),
        not_marked: t('home.student.notMarkedYet'),
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ['student', 'home'],
        queryFn: () => studentService.getHome(),
    });

    const submitMutation = useMutation({
        mutationFn: (assignmentId: number) => studentService.submitAssignment(assignmentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'home'] }),
    });

    if (isLoading) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center lg:pl-72">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                </main>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center lg:pl-72">
                    <div className="text-center">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="font-bold text-slate-500">{t('home.student.loadError')}</p>
                    </div>
                </main>
            </div>
        );
    }

    const classLabel = [data.class_name, data.section_name].filter(Boolean).join(' — ');
    const attPctColor = data.attendance_pct >= 75 ? 'text-emerald-700' : data.attendance_pct >= 60 ? 'text-amber-700' : 'text-red-700';
    const attBgColor = data.attendance_pct >= 75 ? 'bg-emerald-50 border-emerald-100' : data.attendance_pct >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Greeting + today status */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {data.student_name}
                                </h1>
                                {classLabel && (
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">{classLabel}</p>
                                )}
                            </div>
                            <span className={cn(
                                'text-sm font-bold px-3 py-1.5 rounded-xl shrink-0',
                                STATUS_STYLE[data.today_status] ?? 'bg-slate-100 text-slate-500'
                            )}>
                                {STATUS_LABEL[data.today_status] ?? data.today_status}
                            </span>
                        </div>
                    </div>

                    {/* Attendance % */}
                    <div className={cn('rounded-2xl border p-5', attBgColor)}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-slate-600">{t('home.student.attendanceLast90')}</p>
                            <p className={cn('text-2xl font-black', attPctColor)}>
                                {data.attendance_pct}%
                            </p>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/60 overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    data.attendance_pct >= 75 ? 'bg-emerald-500' :
                                    data.attendance_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                )}
                                style={{ width: `${Math.min(data.attendance_pct, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-2">
                            {data.attendance_present} {t('home.student.presentOf')} {data.attendance_total} {t('home.student.recordedDays')}
                        </p>
                        {data.attendance_pct < 75 && (
                            <p className="text-xs font-bold text-red-600 mt-1.5">
                                {t('home.student.lowAttendanceWarning')}
                            </p>
                        )}
                    </div>

                    {/* Pending assignments */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <h2 className="font-bold text-slate-800">{t('home.student.dueThisWeek')}</h2>
                            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">
                                {data.pending_assignments.length}
                            </span>
                        </div>

                        {data.pending_assignments.length === 0 ? (
                            <div className="py-10 text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                                <p className="text-slate-400 font-medium text-sm">{t('home.student.nothingDue')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {data.pending_assignments.map((a: AssignmentSummary) => (
                                    <div key={a.id} className="px-5 py-3.5 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{a.title}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                {a.subject_name} · {t('home.student.due')} {a.due_date}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={cn(
                                                'text-xs font-bold px-2 py-1 rounded-lg capitalize',
                                                SUBMISSION_STYLE[a.submission_status] ?? 'bg-slate-100 text-slate-600'
                                            )}>
                                                {a.submission_status}
                                            </span>
                                            {a.submission_status === 'pending' && (
                                                <button
                                                    onClick={() => submitMutation.mutate(a.id)}
                                                    disabled={submitMutation.isPending}
                                                    className="text-xs font-bold px-3 py-1.5 bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1"
                                                >
                                                    {submitMutation.isPending
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <ChevronRight className="w-3 h-3" />}
                                                    {t('home.student.submit')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent marks */}
                    {data.recent_marks.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-violet-500" />
                                <h2 className="font-bold text-slate-800">{t('home.student.recentMarks')}</h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {data.recent_marks.map((m: MarkTrendEntry, i: number) => (
                                    <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm">{m.subject_name}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{m.exam_name}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 text-sm">
                                                    {m.obtained !== null ? m.obtained : '—'}
                                                    <span className="text-xs font-medium text-slate-400">/{m.max_marks}</span>
                                                </p>
                                                {m.percentage !== null && (
                                                    <p className="text-xs font-bold text-slate-500">{m.percentage}%</p>
                                                )}
                                            </div>
                                            <TrendIcon trend={m.trend} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentHome;
