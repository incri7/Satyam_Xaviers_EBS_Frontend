import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { Receipt, Search, Filter, RotateCcw, Download, Calendar, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AccessControl } from '../AccessControl';
import { useDateFormat } from '../../hooks/useDateFormat';

export const PaymentManagement: React.FC = () => {
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterMethod, setFilterMethod] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments'],
        queryFn: () => financesService.listPayments(),
    });

    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const reverseMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            financesService.reversePayment(id, reason),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
    });

    const handleDownload = async (payment: { id: number; receipt_no?: string }) => {
        setDownloadingId(payment.id);
        try {
            const blob = await financesService.downloadReceiptBlob(payment.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-${payment.receipt_no ?? payment.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setDownloadingId(null);
        }
    };

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
        }).format(amt);
    };

    const formatDate = (dateStr: string) => df.date(dateStr);

    const filteredPayments = payments?.filter(p => {
        const matchesSearch =
            p.receipt_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (filterMethod && p.method !== filterMethod) return false;
        if (filterFrom && p.paid_at && p.paid_at.slice(0, 10) < filterFrom) return false;
        if (filterTo && p.paid_at && p.paid_at.slice(0, 10) > filterTo) return false;
        return true;
    }) || [];

    const activeFilterCount = [filterMethod, filterFrom, filterTo].filter(Boolean).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by receipt or trans ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all",
                            showFilters || activeFilterCount > 0
                                ? "bg-brand/5 border-brand/20 text-brand"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200"></div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <span>Transactions:</span>
                        <span className="text-slate-900">{filteredPayments.length}</span>
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Method</label>
                        <select
                            value={filterMethod}
                            onChange={(e) => setFilterMethod(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        >
                            <option value="">All methods</option>
                            <option value="cash">Cash</option>
                            <option value="online">Online</option>
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="card">Card</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">From</label>
                        <input
                            type="date"
                            value={filterFrom}
                            onChange={(e) => setFilterFrom(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">To</label>
                        <input
                            type="date"
                            value={filterTo}
                            onChange={(e) => setFilterTo(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <button
                        onClick={() => { setFilterMethod(''); setFilterFrom(''); setFilterTo(''); }}
                        disabled={activeFilterCount === 0}
                        className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-40"
                    >
                        Clear filters
                    </button>
                </div>
            )}

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Receipt / ID</th>
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Method</th>
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredPayments.map((payment) => {
                                const isVoid = payment.receipt_no?.startsWith('VOID');
                                return (
                                    <tr key={payment.id} className={cn("group transition-colors", isVoid ? "bg-slate-50/50" : "hover:bg-slate-50/30")}>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                                    isVoid ? "bg-slate-200 text-slate-400" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    <Receipt className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className={cn("font-bold text-sm transition-colors", isVoid ? "text-slate-400" : "text-slate-900")}>
                                                        {payment.receipt_no || 'N/A'}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">#{payment.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {formatDate(payment.paid_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 capitalize">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                {payment.method.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={cn("text-sm font-black tracking-tight", isVoid ? "text-slate-400 line-through" : "text-slate-900")}>
                                                {formatCurrency(payment.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                isVoid ? "bg-slate-200 text-slate-500" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {isVoid ? 'Voided' : 'Completed'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownload(payment)}
                                                    disabled={downloadingId === payment.id}
                                                    title="Download receipt PDF"
                                                    className="p-2 text-slate-400 hover:text-brand hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                {!isVoid && (
                                                    <AccessControl id="payments_create">
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Reason for reversal:');
                                                                if (reason) reverseMutation.mutate({ id: payment.id, reason });
                                                            }}
                                                            title="Reverse payment"
                                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    </AccessControl>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredPayments.length === 0 && !isLoading && (
                    <div className="py-20 text-center space-y-4">
                        <div className="inline-flex w-16 h-16 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                            <Receipt className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">No transactions found</h4>
                            <p className="text-sm text-slate-500 font-medium">Try adjusting your search filters</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
