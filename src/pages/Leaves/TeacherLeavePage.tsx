import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    leavesService,
    type LeaveCreate,
    type LeaveType,
    type LeaveRead,
} from '../../api/services/leaves.service';
import { Loader2, PlusCircle, CheckCircle2, XCircle, Clock, CalendarDays } from 'lucide-react';
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

const TeacherLeavePage: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState<LeaveCreate>({
        applicant_type: 'teacher',
        leave_type: 'casual',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const LEAVE_TYPES: { value: LeaveType; labelKey: string }[] = [
        { value: 'casual', labelKey: 'leaves.typeCasual' },
        { value: 'sick', labelKey: 'leaves.typeSick' },
        { value: 'earned', labelKey: 'leaves.typeEarned' },
        { value: 'maternity', labelKey: 'leaves.typeMaternity' },
        { value: 'unpaid', labelKey: 'leaves.typeUnpaid' },
    ];

    const STATUS_LABEL: Record<string, string> = {
        pending: t('leaves.statusPending'),
        approved: t('leaves.statusApproved'),
        rejected: t('leaves.statusRejected'),
    };

    const { data: balance, isLoading: balanceLoading } = useQuery({
        queryKey: ['leaves', 'my-balance'],
        queryFn: () => leavesService.getMyBalance(),
    });

    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['leaves', 'my-history'],
        queryFn: () => leavesService.listLeaves({ limit: 50 }),
    });

    const submitMutation = useMutation({
        mutationFn: (data: LeaveCreate) => leavesService.submitLeave(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            setShowForm(false);
            setForm({ applicant_type: 'teacher', leave_type: 'casual', start_date: '', end_date: '', reason: '' });
            setFormError('');
        },
        onError: (err: any) => {
            const detail = err.response?.data?.detail;
            setFormError(typeof detail === 'string' ? detail : t('common.error'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.start_date || !form.end_date) {
            setFormError(t('leaves.from') + ' / ' + t('leaves.to') + ' required.');
            return;
        }
        setFormError('');
        submitMutation.mutate(form);
    };

    const balanceItems = balance
        ? [
              { labelKey: 'leaves.typeCasual', total: balance.casual_total, remaining: balance.casual_remaining },
              { labelKey: 'leaves.typeSick', total: balance.sick_total, remaining: balance.sick_remaining },
              { labelKey: 'leaves.typeEarned', total: balance.earned_total, remaining: balance.earned_remaining },
              { labelKey: 'leaves.typeMaternity', total: balance.maternity_total, remaining: balance.maternity_remaining },
          ]
        : [];

    const leaves = history?.leaves ?? [];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{t('leaves.title')}</h1>
                            <p className="text-slate-500 text-sm font-medium mt-0.5">
                                {t('leaves.balanceFor')} {balance?.year ?? new Date().getFullYear()}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowForm(s => !s)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {t('leaves.applyLeave')}
                        </button>
                    </div>

                    {/* Balance cards */}
                    {balanceLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {balanceItems.map(item => (
                                <div key={item.labelKey} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t(item.labelKey)}</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">{item.remaining}</p>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">{t('leaves.of')} {item.total} {t('leaves.remaining')}</p>
                                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-brand transition-all"
                                            style={{ width: item.total > 0 ? `${(item.remaining / item.total) * 100}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Apply form */}
                    {showForm && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-brand" />
                                {t('leaves.newRequest')}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                            {t('leaves.leaveType')}
                                        </label>
                                        <select
                                            value={form.leave_type}
                                            onChange={e => setForm(f => ({ ...f, leave_type: e.target.value as LeaveType }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                        >
                                            {LEAVE_TYPES.map(t_ => (
                                                <option key={t_.value} value={t_.value}>{t(t_.labelKey)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                                {t('leaves.from')}
                                            </label>
                                            <input
                                                type="date"
                                                value={form.start_date}
                                                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                                required
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                                {t('leaves.to')}
                                            </label>
                                            <input
                                                type="date"
                                                value={form.end_date}
                                                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                                required
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                        {t('leaves.reason')}
                                    </label>
                                    <textarea
                                        value={form.reason}
                                        onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                        rows={3}
                                        placeholder={t('leaves.reasonPlaceholder')}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                                    />
                                </div>
                                {formError && (
                                    <p className="text-sm text-red-600 font-medium">{formError}</p>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitMutation.isPending}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-95 disabled:opacity-60 transition-all"
                                    >
                                        {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {t('leaves.submitRequest')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setFormError(''); }}
                                        className="px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                        {t('leaves.cancel')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Leave history */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h2 className="font-bold text-slate-800">{t('leaves.history')}</h2>
                        </div>
                        {historyLoading && (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                            </div>
                        )}
                        {!historyLoading && leaves.length === 0 && (
                            <div className="py-12 text-center">
                                <p className="text-slate-400 font-medium">{t('leaves.noLeaves')}</p>
                            </div>
                        )}
                        {leaves.length > 0 && (
                            <div className="divide-y divide-slate-50">
                                {leaves.map((leave: LeaveRead) => (
                                    <div key={leave.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm capitalize">
                                                {leave.leave_type}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                {leave.start_date} → {leave.end_date}
                                                {leave.reason && ` · ${leave.reason}`}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg capitalize',
                                            STATUS_STYLE[leave.status] ?? 'bg-slate-100 text-slate-600'
                                        )}>
                                            {STATUS_ICON[leave.status]}
                                            {STATUS_LABEL[leave.status] ?? leave.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherLeavePage;
