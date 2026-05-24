import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { attendanceService } from '../../api/services/attendance.service';
import { assignmentsService } from '../../api/services/assignments.service';
import { leavesService } from '../../api/services/leaves.service';
import { aiService, type RiskFlag } from '../../api/services/ai.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    ClipboardCheck, ClipboardList, BookMarked, ArrowRight,
    Calendar, Clock, CheckCircle2, AlertTriangle, Umbrella, ShieldAlert, X
} from 'lucide-react';
import { cn } from '../../utils/cn';

const TeacherHome: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const today = new Date().toISOString().split('T')[0];
    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    const { data: myAssignments } = useQuery({
        queryKey: ['assignments', 'my-classes'],
        queryFn: () => assignmentsService.listMyAssignments(),
    });

    const { data: todayAttendance } = useQuery({
        queryKey: ['attendance', 'today-summary', today],
        queryFn: () => attendanceService.getAttendances({ date: today, limit: 1 }),
    });

    const { data: leaveBalance } = useQuery({
        queryKey: ['leaves', 'my-balance'],
        queryFn: () => leavesService.getMyBalance(),
    });

    const { data: riskFlags } = useQuery({
        queryKey: ['ai', 'risk-flags'],
        queryFn: () => aiService.getRiskFlags(),
        staleTime: 5 * 60 * 1000,
    });

    const dismissMutation = useMutation({
        mutationFn: (studentId: number) => aiService.dismissRiskFlag(studentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'risk-flags'] }),
    });

    const assignments = myAssignments?.assignments || [];
    const dueThisWeek = assignments.filter(a => {
        const due = new Date(a.due_date);
        const now = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);
        return due >= now && due <= weekFromNow;
    });
    const overdue = assignments.filter(a => new Date(a.due_date) < new Date());

    const hasMarkedToday = (todayAttendance?.total_count ?? 0) > 0;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Greeting */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{todayLabel}</p>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
                                {user?.firstName || 'Teacher'}
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">
                                {hasMarkedToday
                                    ? "Attendance marked for today."
                                    : "Attendance not yet marked for today."}
                            </p>
                        </div>
                    </div>

                    {/* Leave balance strip */}
                    {leaveBalance && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Umbrella className="w-4 h-4 text-brand" />
                                    <span className="text-sm font-bold text-slate-700">Leave Balance {leaveBalance.year}</span>
                                </div>
                                <Link to="/leave" className="text-xs font-bold text-brand hover:underline">
                                    Apply →
                                </Link>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: 'Casual', remaining: leaveBalance.casual_remaining, total: leaveBalance.casual_total },
                                    { label: 'Sick', remaining: leaveBalance.sick_remaining, total: leaveBalance.sick_total },
                                    { label: 'Earned', remaining: leaveBalance.earned_remaining, total: leaveBalance.earned_total },
                                    { label: 'Maternity', remaining: leaveBalance.maternity_remaining, total: leaveBalance.maternity_total },
                                ].map(item => (
                                    <div key={item.label} className="text-center">
                                        <p className="text-lg font-black text-slate-900">{item.remaining}</p>
                                        <p className="text-xs text-slate-400 font-medium">/{item.total} {item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick action cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            to="/attendance"
                            className={cn(
                                "group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all",
                                !hasMarkedToday && "border-brand/30 bg-brand/5"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                                hasMarkedToday ? "bg-emerald-100 text-emerald-600" : "bg-brand text-white shadow-lg shadow-brand/30"
                            )}>
                                <ClipboardCheck className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Mark Attendance</h3>
                            <p className="text-sm text-slate-500 font-medium mb-4">
                                {hasMarkedToday ? "Already marked today" : "Not marked yet — tap to mark"}
                            </p>
                            <div className="flex items-center gap-1 text-sm font-bold text-brand group-hover:gap-2 transition-all">
                                {hasMarkedToday ? (
                                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600">Done</span></>
                                ) : (
                                    <><span>Mark now</span><ArrowRight className="w-4 h-4" /></>
                                )}
                            </div>
                        </Link>

                        <Link
                            to="/marks"
                            className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                                <BookMarked className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Enter Marks</h3>
                            <p className="text-sm text-slate-500 font-medium mb-4">Bulk marks entry for your classes</p>
                            <div className="flex items-center gap-1 text-sm font-bold text-brand group-hover:gap-2 transition-all">
                                <span>Open marks grid</span><ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>

                        <Link
                            to="/assignments"
                            className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Assignments</h3>
                            <p className="text-sm text-slate-500 font-medium mb-4">
                                {dueThisWeek.length > 0
                                    ? `${dueThisWeek.length} due this week`
                                    : overdue.length > 0
                                    ? `${overdue.length} overdue`
                                    : 'Manage class assignments'}
                            </p>
                            <div className="flex items-center gap-1 text-sm font-bold text-brand group-hover:gap-2 transition-all">
                                <span>View assignments</span><ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>
                    </div>

                    {/* Upcoming due dates */}
                    {dueThisWeek.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-slate-900 text-sm">Due This Week</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {dueThisWeek.slice(0, 5).map(a => (
                                    <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-900">{a.title}</span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Overdue alert */}
                    {overdue.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-red-900 text-sm">{overdue.length} assignment{overdue.length > 1 ? 's' : ''} past due date</p>
                                <p className="text-xs text-red-600 font-medium mt-0.5">Review submissions and update status</p>
                            </div>
                            <Link to="/assignments" className="text-xs font-bold text-red-600 hover:underline shrink-0">
                                Review →
                            </Link>
                        </div>
                    )}

                    {/* At-risk student flags */}
                    {riskFlags && riskFlags.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-orange-500" />
                                <h3 className="font-bold text-slate-900 text-sm">At-Risk Students</h3>
                                <span className="ml-auto text-xs text-slate-400 font-medium">AI flagged · confidence ≥ 70%</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {riskFlags.map((flag: RiskFlag) => (
                                    <div key={flag.student_id} className="px-6 py-4 flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{flag.student_name}</p>
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {flag.attendance_flag && (
                                                    <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg">
                                                        {flag.consecutive_absences}d absent · {flag.attendance_pct.toFixed(0)}% attendance
                                                    </span>
                                                )}
                                                {flag.fee_default_flag && (
                                                    <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg">
                                                        Fee default
                                                    </span>
                                                )}
                                                <span className="text-xs font-medium text-slate-400">
                                                    Score: {(flag.risk_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => dismissMutation.mutate(flag.student_id)}
                                            disabled={dismissMutation.isPending}
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                                            title="Dismiss flag"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
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

export default TeacherHome;
