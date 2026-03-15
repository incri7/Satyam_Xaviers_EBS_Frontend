import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { Wallet, Search, Ban, Calendar, User, ShoppingBag, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { AccessControl } from '../AccessControl';

export const ExpenseManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => financesService.listExpenses(),
    });

    const voidMutation = useMutation({
        mutationFn: (id: number) => financesService.voidExpense(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    });

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
        }).format(amt);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredExpenses = expenses?.filter(e => 
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by category, vendor or invoice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <span>Total Records:</span>
                        <span className="text-slate-900">{expenses?.length || 0}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : filteredExpenses.map((expense, idx) => {
                    const isVoid = expense.invoice_no?.startsWith('VOID') || expense.description?.startsWith('VOID');
                    return (
                        <motion.div
                            key={expense.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                                "group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col md:flex-row items-center justify-between gap-6",
                                isVoid && "opacity-60 grayscale-[0.5] bg-slate-50 border-dashed"
                            )}
                        >
                            <div className="flex items-center gap-6 flex-1 min-w-0">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                                    isVoid ? "bg-slate-200 text-slate-400" : "bg-rose-50 text-rose-600"
                                )}>
                                    <ShoppingBag className="w-7 h-7" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={cn("font-bold text-lg truncate transition-colors", isVoid ? "text-slate-500" : "text-slate-900 group-hover:text-brand")}>
                                            {expense.category}
                                        </h4>
                                        {isVoid && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-md">Voided</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-300" /> {formatDate(expense.date)}</span>
                                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-300" /> {expense.vendor_name || 'Generic Vendor'}</span>
                                        <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-300" /> {expense.invoice_no || 'No Invoice'}</span>
                                    </div>
                                    {expense.description && (
                                        <p className="mt-2 text-sm text-slate-500 font-medium truncate max-w-md italic">
                                            "{expense.description}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-8 shrink-0">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Spent</p>
                                    <p className={cn("text-2xl font-black tracking-tight", isVoid ? "text-slate-400 line-through" : "text-slate-900")}>
                                        {formatCurrency(expense.amount)}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2 border-l border-slate-100 pl-8">
                                    {!isVoid && (
                                        <AccessControl id="expenses_delete">
                                            <button 
                                                onClick={() => {
                                                    if (confirm('Void this expense record?')) voidMutation.mutate(expense.id);
                                                }}
                                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm active:scale-95"
                                                title="Void Expense"
                                            >
                                                <Ban className="w-5 h-5" />
                                            </button>
                                        </AccessControl>
                                    )}
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                        isVoid ? "bg-slate-100 text-slate-400 border border-slate-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                                    )}>
                                        {expense.payment_mode.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filteredExpenses.length === 0 && !isLoading && (
                <div className="py-20 text-center space-y-4">
                    <div className="inline-flex w-16 h-16 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">No expenses recorded</h4>
                        <p className="text-sm text-slate-500 font-medium">Try adjusting your search criteria</p>
                    </div>
                </div>
            )}
        </div>
    );
};
