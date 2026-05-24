import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService } from '../../api/services/parent.service';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_STYLE: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700',
    A: 'bg-red-100 text-red-700',
    L: 'bg-amber-100 text-amber-700',
    HD: 'bg-blue-100 text-blue-700',
    H: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
    P: 'Present', A: 'Absent', L: 'Late', HD: 'Half Day', H: 'Holiday',
};

const ChildAttendancePage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const id = Number(studentId);

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent', 'child-attendance', id],
        queryFn: () => parentService.getChildAttendance(id, 90),
        enabled: !!id,
    });

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Link to="/home/parent" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Attendance History</h1>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Failed to load attendance.
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Summary card */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                                    <p className="text-2xl font-bold text-slate-900">{data.total_days}</p>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Days</p>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm text-center">
                                    <p className="text-2xl font-bold text-emerald-700">{data.present_days}</p>
                                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">Present</p>
                                </div>
                                <div className="bg-brand/5 rounded-2xl p-4 border border-brand/20 shadow-sm text-center">
                                    <p className="text-2xl font-bold text-brand">{data.attendance_percent}%</p>
                                    <p className="text-xs font-semibold text-brand/70 mt-0.5">Attendance</p>
                                </div>
                            </div>

                            {/* Record list */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                {data.records.length === 0 ? (
                                    <p className="text-center text-slate-400 font-medium py-10">No records yet.</p>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {data.records.map(r => (
                                            <div key={r.date} className="flex items-center justify-between px-5 py-3">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {new Date(r.date).toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric',
                                                    })}
                                                </span>
                                                <span className={cn(
                                                    "text-xs font-bold px-3 py-1 rounded-lg",
                                                    STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-500'
                                                )}>
                                                    {STATUS_LABEL[r.status] || r.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChildAttendancePage;
