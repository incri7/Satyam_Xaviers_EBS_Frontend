import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService, type ChildSummary } from '../../api/services/parent.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight,
    BookOpen, CreditCard, FileText, Calendar, Loader2, BellRing
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';

const ChildCard: React.FC<{ child: ChildSummary; feeDue?: number }> = ({ child, feeDue }) => {
    const { t } = useTranslation();

    const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
        P: { label: t('home.parent.present'), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-6 h-6" /> },
        A: { label: t('home.parent.absent'), color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-6 h-6" /> },
        L: { label: t('home.parent.late'), color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock className="w-6 h-6" /> },
        HD: { label: t('home.parent.halfDay'), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Clock className="w-6 h-6" /> },
    };

    const status = child.today_status ? STATUS_CONFIG[child.today_status] : null;
    const fullName = [child.first_name, child.last_name].filter(Boolean).join(' ');

    return (
        <div className={cn(
            "bg-white rounded-2xl border-2 p-5 shadow-sm transition-all",
            status ? status.bg : "border-slate-200"
        )}>
            <Link
                to={`/parent/child/${child.student_id}/dashboard`}
                className="flex items-start justify-between mb-4 -m-1 p-1 rounded-xl hover:bg-slate-50/80 transition-colors group/name"
            >
                <div>
                    <h2 className="text-xl font-bold text-slate-900 group-hover/name:text-brand transition-colors">{fullName}</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        {child.class_name}{child.section_name ? ` · ${child.section_name}` : ''} · {child.admission_no}
                    </p>
                </div>
                {status ? (
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm", status.color)}>
                        {status.icon}
                        {status.label}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm text-slate-400 bg-slate-50">
                        <AlertCircle className="w-5 h-5" />
                        {t('home.parent.notMarked')}
                    </div>
                )}
            </Link>

            <div className="grid grid-cols-2 gap-2">
                <Link
                    to={`/parent/child/${child.student_id}/attendance`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <Calendar className="w-4 h-4" />
                        {t('home.parent.attendance')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/marks`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <BookOpen className="w-4 h-4" />
                        {t('home.parent.marks')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/fees`}
                    className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-colors group",
                        feeDue && feeDue > 0
                            ? "bg-red-50 hover:bg-red-100 text-red-700"
                            : "bg-slate-50 hover:bg-brand/5 hover:text-brand"
                    )}
                >
                    <div className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        feeDue && feeDue > 0 ? "text-red-700" : "text-slate-700 group-hover:text-brand"
                    )}>
                        <CreditCard className="w-4 h-4" />
                        {feeDue && feeDue > 0 ? `Rs ${feeDue.toLocaleString()} ${t('home.parent.due')}` : t('home.parent.fees')}
                    </div>
                    <ChevronRight className={cn("w-4 h-4", feeDue && feeDue > 0 ? "text-red-400" : "text-slate-400 group-hover:text-brand")} />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/leave`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <FileText className="w-4 h-4" />
                        {t('home.parent.leave')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>
            </div>
        </div>
    );
};

const ParentHome: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { user } = useAuthStore();
    const todayLabel = df.date(new Date(), 'long');

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
    });

    const children = data?.children ?? [];
    const firstName = user?.firstName || 'Parent';

    // Fee reminder — fetched per child (no bulk endpoint), shown as a banner
    // whenever any child has an outstanding balance, so it surfaces the
    // moment a parent opens the app rather than waiting to be discovered on
    // each child's own Fees page.
    const feeQueries = useQueries({
        queries: children.map(child => ({
            queryKey: ['parent', 'child-fees', child.student_id],
            queryFn: () => parentService.getChildFees(child.student_id),
            enabled: children.length > 0,
        })),
    });
    const feeDueByStudent = new Map<number, number>();
    children.forEach((child, i) => {
        const due = Number(feeQueries[i]?.data?.total_due ?? 0);
        if (due > 0) feeDueByStudent.set(child.student_id, due);
    });
    const childrenWithDues = children.filter(c => feeDueByStudent.has(c.student_id));
    const totalDue = Array.from(feeDueByStudent.values()).reduce((sum, v) => sum + v, 0);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('home.goodMorning')}, {firstName}</h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {t('home.parent.failedLoad')}
                        </div>
                    )}

                    {!isLoading && children.length === 0 && !error && (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <p className="font-bold text-slate-400">{t('home.parent.noChildren')}</p>
                            <p className="text-sm text-slate-400 mt-1">{t('home.parent.contactSchool')}</p>
                        </div>
                    )}

                    {childrenWithDues.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4">
                            <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                                <BellRing className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-red-800">{t('home.parent.feeReminder')}</h2>
                                <p className="text-sm text-red-600 font-medium mt-0.5">
                                    {t('home.parent.feeReminderTotal', { amount: totalDue.toLocaleString() })}
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    {childrenWithDues.map(child => (
                                        <Link
                                            key={child.student_id}
                                            to={`/parent/child/${child.student_id}/fees`}
                                            className="flex items-center justify-between bg-white/70 hover:bg-white rounded-xl px-3 py-2 transition-colors group"
                                        >
                                            <span className="text-sm font-semibold text-slate-700">
                                                {[child.first_name, child.last_name].filter(Boolean).join(' ')}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm font-bold text-red-700">
                                                Rs {feeDueByStudent.get(child.student_id)!.toLocaleString()}
                                                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {children.map(child => (
                            <ChildCard key={child.student_id} child={child} feeDue={feeDueByStudent.get(child.student_id)} />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ParentHome;
