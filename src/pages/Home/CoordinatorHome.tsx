import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    leavesService,
    type PendingLeaveRead,
    type SubstituteCandidate,
    type LeaveStatus,
} from '../../api/services/leaves.service';
import { examsService } from '../../api/services/exams.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    CheckCircle2, XCircle, Loader2, Users, BookOpen,
    ChevronDown, ChevronUp, UserCheck, AlertCircle, BarChart2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const LEAVE_TYPE_LABEL: Record<string, string> = {
    casual: 'Casual',
    sick: 'Sick',
    earned: 'Earned',
    maternity: 'Maternity',
    unpaid: 'Unpaid',
};

const LeaveCard: React.FC<{
    leave: PendingLeaveRead;
    onApprove: (leaveId: number, substituteId: number | null) => void;
    onReject: (leaveId: number) => void;
    isPending: boolean;
}> = ({ leave, onApprove, onReject, isPending }) => {
    const [expanded, setExpanded] = useState(false);
    const [selectedSubstitute, setSelectedSubstitute] = useState<number | null>(null);

    const { data: substitutes, isFetching: loadingSubs } = useQuery({
        queryKey: ['leaves', leave.id, 'substitutes'],
        queryFn: () => leavesService.getSuggestedSubstitutes(leave.id),
        enabled: expanded && leave.applicant_type === 'teacher',
    });

    const dayCount = Math.max(1, Math.round(
        (new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / 86400000
    ) + 1);

    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-4 bg-white">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{leave.applicant_name}</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 capitalize">
                            {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                            {leave.start_date} → {leave.end_date} ({dayCount}d)
                        </span>
                    </div>
                    {leave.reason && (
                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">{leave.reason}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {leave.applicant_type === 'teacher' && (
                        <button
                            onClick={() => setExpanded(s => !s)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                            title="View substitute suggestions"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                    <button
                        onClick={() => onReject(leave.id)}
                        disabled={isPending}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Reject"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onApprove(leave.id, selectedSubstitute)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                    </button>
                </div>
            </div>

            {/* Substitute panel */}
            {expanded && leave.applicant_type === 'teacher' && (
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" /> Assign Substitute
                    </p>
                    {loadingSubs && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading suggestions…
                        </div>
                    )}
                    {!loadingSubs && substitutes && substitutes.length === 0 && (
                        <p className="text-xs text-slate-400 font-medium">No available substitutes found.</p>
                    )}
                    {!loadingSubs && substitutes && substitutes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {substitutes.map((s: SubstituteCandidate) => (
                                <button
                                    key={s.teacher_id}
                                    onClick={() => setSelectedSubstitute(
                                        selectedSubstitute === s.teacher_id ? null : s.teacher_id
                                    )}
                                    className={cn(
                                        'text-xs font-bold px-3 py-1.5 rounded-xl border transition-all',
                                        selectedSubstitute === s.teacher_id
                                            ? 'bg-brand text-white border-brand'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-brand/50'
                                    )}
                                >
                                    {s.name}
                                    {s.shared_subjects.length > 0 && (
                                        <span className="ml-1 opacity-70">({s.shared_subjects.slice(0, 2).join(', ')})</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedSubstitute && (
                        <p className="text-xs text-brand font-bold mt-2">
                            Substitute will be assigned on approval.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

const CoordinatorHome: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });
    const firstName = user?.firstName || 'Coordinator';

    const { data: pendingLeaves, isLoading: leavesLoading } = useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: () => leavesService.getPendingLeaves(),
    });

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

    const statusMutation = useMutation({
        mutationFn: ({ leaveId, decision, substituteId }: {
            leaveId: number;
            decision: LeaveStatus;
            substituteId: number | null;
        }) => leavesService.updateLeaveStatus(leaveId, {
            status: decision,
            substitute_teacher_id: substituteId ?? undefined,
        }),
        onMutate: ({ leaveId }) => setProcessingId(leaveId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves', 'pending'] });
            setActionError('');
        },
        onError: (err: any) => {
            const detail = err.response?.data?.detail;
            setActionError(typeof detail === 'string' ? detail : 'Action failed. Please try again.');
        },
        onSettled: () => setProcessingId(null),
    });

    const handleApprove = (leaveId: number, substituteId: number | null) => {
        statusMutation.mutate({ leaveId, decision: 'approved', substituteId });
    };

    const handleReject = (leaveId: number) => {
        statusMutation.mutate({ leaveId, decision: 'rejected', substituteId: null });
    };

    const pending = pendingLeaves ?? [];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Greeting */}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Good morning, {firstName}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                    </div>

                    {/* Summary strip */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className={cn(
                            'rounded-2xl p-4 border-2',
                            pending.length > 0
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-emerald-50 border-emerald-100'
                        )}>
                            <p className={cn(
                                'text-xs font-bold uppercase tracking-wide',
                                pending.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                            )}>
                                Pending Approvals
                            </p>
                            <p className={cn(
                                'text-3xl font-black mt-1',
                                pending.length > 0 ? 'text-amber-700' : 'text-emerald-700'
                            )}>
                                {pending.length}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Staff Leaves</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">
                                {pending.filter(l => l.applicant_type === 'teacher' || l.applicant_type === 'staff').length}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Student Leaves</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">
                                {pending.filter(l => l.applicant_type === 'student').length}
                            </p>
                        </div>
                    </div>

                    {/* Error banner */}
                    {actionError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {actionError}
                        </div>
                    )}

                    {/* Pending leave queue */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Users className="w-5 h-5 text-amber-500" />
                            <h2 className="font-bold text-slate-800">Pending Leave Requests</h2>
                            {pending.length > 0 && (
                                <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">
                                    {pending.length} awaiting
                                </span>
                            )}
                        </div>

                        {leavesLoading && (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                            </div>
                        )}

                        {!leavesLoading && pending.length === 0 && (
                            <div className="py-14 text-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">All clear — no pending requests.</p>
                            </div>
                        )}

                        {pending.length > 0 && (
                            <div className="p-4 space-y-3">
                                {pending.map(leave => (
                                    <LeaveCard
                                        key={leave.id}
                                        leave={leave}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        isPending={processingId === leave.id && statusMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

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
                                <p className="font-bold text-slate-900 text-sm">Attendance</p>
                                <p className="text-xs text-slate-500 font-medium">View school attendance</p>
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
                                <p className="font-bold text-slate-900 text-sm">Marks</p>
                                <p className="text-xs text-slate-500 font-medium">Review marks entry</p>
                            </div>
                        </a>
                    </div>

                    {/* Marks entry progress tracker */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-violet-500" />
                                <h2 className="font-bold text-slate-800">Marks Entry Progress</h2>
                            </div>
                            {examsData && examsData.length > 0 && (
                                <select
                                    value={selectedExamId ?? ''}
                                    onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                                    className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">Select exam…</option>
                                    {examsData.map((exam) => (
                                        <option key={exam.id} value={exam.id}>{exam.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedExamId === null && (
                            <div className="py-10 text-center text-sm text-slate-400 font-medium">
                                Select an exam above to see marks entry status.
                            </div>
                        )}

                        {selectedExamId !== null && progressLoading && (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                            </div>
                        )}

                        {marksProgress && (
                            <div className="p-5 space-y-4">
                                {/* Overall */}
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overall</p>
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

                                {/* Per-entry rows */}
                                {marksProgress.entries.length === 0 && (
                                    <p className="text-sm text-slate-400 font-medium text-center py-4">
                                        No schedules found for this exam.
                                    </p>
                                )}
                                {marksProgress.entries.map((entry) => {
                                    const pct = Math.min(100, entry.completion_pct);
                                    const color = pct === 100
                                        ? 'bg-emerald-500'
                                        : pct >= 50
                                        ? 'bg-amber-400'
                                        : 'bg-rose-400';
                                    return (
                                        <div key={entry.schedule_id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-semibold text-slate-700">
                                                    {entry.subject_name}
                                                    <span className="ml-2 text-slate-400 font-medium">
                                                        Class {entry.class_id} · Sec {entry.section_id}
                                                    </span>
                                                </p>
                                                <p className="text-xs font-black text-slate-900">
                                                    {entry.marks_entered}/{entry.total_enrolled}
                                                    <span className="ml-1 text-slate-400 font-medium">
                                                        ({pct.toFixed(0)}%)
                                                    </span>
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
