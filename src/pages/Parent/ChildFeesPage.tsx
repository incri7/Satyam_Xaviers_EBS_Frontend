import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService } from '../../api/services/parent.service';
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const ChildFeesPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const id = Number(studentId);

    const { data, isLoading, error } = useQuery({
        queryKey: ['parent', 'child-fees', id],
        queryFn: () => parentService.getChildFees(id),
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
                        <h1 className="text-xl font-bold text-slate-900">Fee Balance</h1>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Failed to load fee data.
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Total due banner */}
                            <div className={cn(
                                "rounded-2xl p-5 border-2",
                                Number(data.total_due) > 0
                                    ? "bg-red-50 border-red-200"
                                    : "bg-emerald-50 border-emerald-200"
                            )}>
                                <p className="text-sm font-semibold text-slate-600">Total Outstanding</p>
                                <p className={cn(
                                    "text-3xl font-bold mt-0.5",
                                    Number(data.total_due) > 0 ? "text-red-700" : "text-emerald-700"
                                )}>
                                    Rs {Number(data.total_due).toLocaleString()}
                                </p>
                                {Number(data.total_due) === 0 && (
                                    <p className="text-sm text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" /> All fees cleared
                                    </p>
                                )}
                            </div>

                            {/* Fee breakdown */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                {data.fees.length === 0 ? (
                                    <p className="text-center text-slate-400 font-medium py-10">No fee assignments found.</p>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {data.fees.map((fee, i) => (
                                            <div key={i} className="px-5 py-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{fee.fee_name}</p>
                                                        <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">{fee.frequency}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-slate-700">Rs {Number(fee.amount).toLocaleString()}</p>
                                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                                            Paid: Rs {Number(fee.paid_amount).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {Number(fee.balance) > 0 && (
                                                    <div className="mt-2 flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5">
                                                        <span className="text-xs font-semibold text-red-600">Balance due</span>
                                                        <span className="text-sm font-bold text-red-700">
                                                            Rs {Number(fee.balance).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
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

export default ChildFeesPage;
