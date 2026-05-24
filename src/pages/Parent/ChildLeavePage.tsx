import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { leavesService, type LeaveType } from '../../api/services/leaves.service';
import { ArrowLeft, AlertCircle, Loader2, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
};

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
    { value: 'casual', label: 'Casual' },
    { value: 'sick', label: 'Sick' },
    { value: 'earned', label: 'Earned' },
    { value: 'maternity', label: 'Maternity' },
    { value: 'unpaid', label: 'Unpaid' },
];

const ChildLeavePage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const id = Number(studentId);
    const queryClient = useQueryClient();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        leave_type: 'casual' as LeaveType,
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['parent', 'child-leaves', id],
        queryFn: () => leavesService.getChildLeaves(id),
        enabled: !!id,
    });

    const submitMutation = useMutation({
        mutationFn: () => leavesService.submitLeave({
            applicant_type: 'student',
            applicant_student_id: id,
            leave_type: formData.leave_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent', 'child-leaves', id] });
            setFormSuccess('Leave request submitted successfully.');
            setFormError('');
            setShowForm(false);
            setFormData({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
            setTimeout(() => setFormSuccess(''), 4000);
        },
        onError: (err: any) => {
            setFormError(err.response?.data?.detail || 'Failed to submit leave request.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.start_date || !formData.end_date) {
            setFormError('Please fill in start and end dates.');
            return;
        }
        setFormError('');
        submitMutation.mutate();
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to="/home/parent" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </Link>
                            <h1 className="text-xl font-bold text-slate-900">Leave Requests</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(v => !v)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-95 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Request
                        </button>
                    </div>

                    {formSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="w-5 h-5" /> {formSuccess}
                        </div>
                    )}

                    {showForm && (
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                            <h2 className="font-bold text-slate-800">New Leave Request</h2>

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Leave Type</label>
                                    <select
                                        value={formData.leave_type}
                                        onChange={e => setFormData(p => ({ ...p, leave_type: e.target.value as LeaveType }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                    >
                                        {LEAVE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">End Date</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason (optional)</label>
                                    <input
                                        type="text"
                                        value={formData.reason}
                                        onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                                        placeholder="Brief reason..."
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={submitMutation.isPending}
                                    className="px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Submit Request
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}

                    {data && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {data.leaves.length === 0 ? (
                                <p className="text-center text-slate-400 font-medium py-10">No leave requests yet.</p>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {data.leaves.map(leave => (
                                        <div key={leave.id} className="px-5 py-4 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 capitalize">
                                                    {leave.leave_type} Leave
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {leave.start_date} → {leave.end_date}
                                                </p>
                                                {leave.reason && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{leave.reason}</p>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg shrink-0",
                                                STATUS_STYLE[leave.status]
                                            )}>
                                                {STATUS_ICON[leave.status]}
                                                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChildLeavePage;
