import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { financesService, type OutstandingEntry } from '../../api/services/finances.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    AlertCircle, CheckCircle2, Loader2, Send, TrendingDown,
    CreditCard, FileBarChart2, ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';
import NLQBar from '../../components/NLQBar';

const RISK_STYLE: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low: 'bg-slate-100 text-slate-600',
};

const AccountantHome: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();
    const [reminderSuccess, setReminderSuccess] = useState('');
    const [reminderError, setReminderError] = useState('');

    const today = new Date();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const todayLabel = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

    const { data: outstanding, isLoading } = useQuery({
        queryKey: ['finances', 'outstanding'],
        queryFn: () => financesService.getOutstanding(200),
    });

    const { data: monthlyReport } = useQuery({
        queryKey: ['finances', 'monthly-report', today.getFullYear(), today.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(today.getFullYear(), today.getMonth() + 1),
    });

    const reminderMutation = useMutation({
        mutationFn: financesService.sendBulkReminders,
        onSuccess: (data) => {
            setReminderSuccess(data.message);
            setReminderError('');
            setTimeout(() => setReminderSuccess(''), 5000);
        },
        onError: (err: any) => {
            setReminderError(err.response?.data?.detail || t('common.error'));
        },
    });

    const entries = outstanding?.entries ?? [];
    const totalOutstanding = outstanding?.total_outstanding ?? 0;
    const highRiskCount = entries.filter(e => e.risk === 'High').length;
    const firstName = user?.firstName || 'Accountant';

    const riskLabel = (risk: string) => {
        if (risk === 'High') return t('home.accountant.riskHigh');
        if (risk === 'Medium') return t('home.accountant.riskMedium');
        if (risk === 'Low') return t('home.accountant.riskLow');
        return risk;
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Greeting */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {t('home.goodMorning')}, {firstName}
                            </h1>
                            <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                        </div>
                        <Link
                            to="/finances"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <CreditCard className="w-4 h-4" />
                            {t('home.accountant.manageFees')}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Link>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-red-500 uppercase tracking-wide">{t('home.accountant.totalOutstanding')}</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">
                                Rs {Number(totalOutstanding).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.accountant.familiesDue')}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-red-500 uppercase tracking-wide">{t('home.accountant.highRisk')}</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{highRiskCount}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{t('home.accountant.thisMonth')}</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">
                                Rs {monthlyReport ? Number(monthlyReport.total_collected).toLocaleString() : '–'}
                            </p>
                        </div>
                    </div>

                    {reminderSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            {reminderSuccess}
                        </div>
                    )}
                    {reminderError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {reminderError}
                        </div>
                    )}

                    {/* Outstanding table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-red-500" />
                                <h2 className="font-bold text-slate-800">{t('home.accountant.outstandingBalances')}</h2>
                            </div>
                            <button
                                onClick={() => reminderMutation.mutate()}
                                disabled={reminderMutation.isPending || entries.length === 0}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
                            >
                                {reminderMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {t('home.accountant.sendReminders')}
                            </button>
                        </div>

                        {isLoading && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                            </div>
                        )}

                        {!isLoading && entries.length === 0 && (
                            <div className="py-16 text-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">{t('home.accountant.allClear')}</p>
                            </div>
                        )}

                        {entries.length > 0 && (
                            <div className="divide-y divide-slate-50">
                                <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide bg-slate-50">
                                    <span className="col-span-4">{t('home.accountant.student')}</span>
                                    <span className="col-span-2 text-right">{t('home.accountant.assigned')}</span>
                                    <span className="col-span-2 text-right">{t('home.accountant.paid')}</span>
                                    <span className="col-span-2 text-right">{t('home.accountant.balance')}</span>
                                    <span className="col-span-2 text-center">{t('home.accountant.risk')}</span>
                                </div>
                                {entries.map((entry: OutstandingEntry) => (
                                    <div key={entry.student_id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center">
                                        <div className="col-span-12 md:col-span-4">
                                            <p className="font-bold text-slate-800 text-sm">{entry.student_name}</p>
                                            <p className="text-xs text-slate-500 font-medium">{entry.admission_no}</p>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-right">
                                            <p className="text-sm font-semibold text-slate-600">
                                                Rs {Number(entry.total_assigned).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-right">
                                            <p className="text-sm font-semibold text-emerald-600">
                                                Rs {Number(entry.total_paid).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-right">
                                            <p className="text-sm font-bold text-red-700">
                                                Rs {Number(entry.balance).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="col-span-12 md:col-span-2 flex md:justify-center">
                                            <span className={cn(
                                                'text-xs font-bold px-2.5 py-1 rounded-lg',
                                                RISK_STYLE[entry.risk] ?? 'bg-slate-100 text-slate-600'
                                            )}>
                                                {riskLabel(entry.risk)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <NLQBar />

                    {/* Monthly report */}
                    {monthlyReport && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <FileBarChart2 className="w-5 h-5 text-brand" />
                                <h2 className="font-bold text-slate-800">
                                    {new Date(monthlyReport.year, monthlyReport.month - 1).toLocaleString(locale, {
                                        month: 'long', year: 'numeric',
                                    })} — {t('home.accountant.summary')}
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900">
                                        Rs {Number(monthlyReport.total_collected).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{t('home.accountant.collected')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900">{monthlyReport.transaction_count}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{t('home.accountant.transactions')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900">
                                        {monthlyReport.first_receipt ?? '–'} → {monthlyReport.last_receipt ?? '–'}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{t('home.accountant.receiptRange')}</p>
                                </div>
                                <div className="text-center">
                                    {monthlyReport.receipt_gaps.length === 0 ? (
                                        <>
                                            <p className="text-lg font-bold text-emerald-600">{t('home.accountant.noReceiptGaps')}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t('home.accountant.receiptGaps')}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-lg font-bold text-red-600">{monthlyReport.receipt_gaps.length}</p>
                                            <p className="text-xs text-red-500 font-medium mt-0.5">{t('home.accountant.receiptGaps')}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AccountantHome;
