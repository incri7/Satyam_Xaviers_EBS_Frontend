import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService, type ChildSummary } from '../../api/services/parent.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight,
    BookOpen, CreditCard, FileText, Calendar, Loader2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    P: { label: 'Present', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-6 h-6" /> },
    A: { label: 'Absent', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-6 h-6" /> },
    L: { label: 'Late', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock className="w-6 h-6" /> },
    HD: { label: 'Half Day', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Clock className="w-6 h-6" /> },
};

const ChildCard: React.FC<{ child: ChildSummary }> = ({ child }) => {
    const status = child.today_status ? STATUS_CONFIG[child.today_status] : null;
    const fullName = [child.first_name, child.last_name].filter(Boolean).join(' ');

    return (
        <div className={cn(
            "bg-white rounded-2xl border-2 p-5 shadow-sm transition-all",
            status ? status.bg : "border-slate-200"
        )}>
            {/* Identity */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
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
                        Not Marked
                    </div>
                )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
                <Link
                    to={`/parent/child/${child.student_id}/attendance`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <Calendar className="w-4 h-4" />
                        Attendance
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/marks`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <BookOpen className="w-4 h-4" />
                        Marks
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/fees`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <CreditCard className="w-4 h-4" />
                        Fees
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>

                <Link
                    to={`/parent/child/${child.student_id}/leave`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand/5 hover:text-brand transition-colors group"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-brand">
                        <FileText className="w-4 h-4" />
                        Leave
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                </Link>
            </div>
        </div>
    );
};

const ParentHome: React.FC = () => {
    const { user } = useAuthStore();
    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
    });

    const children = data?.children ?? [];
    const firstName = user?.firstName || 'Parent';

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Greeting */}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Good morning, {firstName}</h1>
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
                            Failed to load children. Please refresh.
                        </div>
                    )}

                    {!isLoading && children.length === 0 && !error && (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <p className="font-bold text-slate-400">No children linked to your account yet.</p>
                            <p className="text-sm text-slate-400 mt-1">Contact the school to link your children.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {children.map(child => (
                            <ChildCard key={child.student_id} child={child} />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ParentHome;
