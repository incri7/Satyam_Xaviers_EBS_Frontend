import React, { useState } from 'react';
import { X, Wallet, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import type { ExpenseCreate } from '../../types/finance';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const PAYMENT_MODES = [
    { label: 'Cash', value: 'cash' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Online', value: 'online' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Card', value: 'card' },
];

const EXPENSE_CATEGORIES = [
    'Utilities', 'Maintenance', 'Supplies', 'Equipment', 'Transport',
    'Salaries', 'Events', 'Office', 'Printing', 'Miscellaneous',
];

export const RecordExpenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        category: '',
        customCategory: '',
        amount: '',
        vendor_name: '',
        invoice_no: '',
        payment_mode: 'cash',
        description: '',
    });

    const mutation = useMutation({
        mutationFn: (data: ExpenseCreate) => financesService.recordExpense(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            setSuccess(true);
            setTimeout(() => { onClose(); setSuccess(false); resetForm(); }, 1500);
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to record expense');
        },
    });

    const resetForm = () => {
        setForm({ date: new Date().toISOString().slice(0, 10), category: '', customCategory: '', amount: '', vendor_name: '', invoice_no: '', payment_mode: 'cash', description: '' });
        setFieldErrors({});
        setError(null);
    };

    if (!isOpen) return null;

    const validate = () => {
        const errors: Record<string, string> = {};
        const category = form.category === '__custom__' ? form.customCategory : form.category;
        if (!category?.trim()) errors.category = 'Category is required';
        if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Amount must be greater than 0';
        if (!form.date) errors.date = 'Date is required';
        if (!form.payment_mode) errors.payment_mode = 'Payment mode is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const category = form.category === '__custom__' ? form.customCategory : form.category;

        const payload: ExpenseCreate = {
            date: form.date,
            category,
            amount: parseFloat(form.amount),
            vendor_name: form.vendor_name || undefined,
            invoice_no: form.invoice_no || undefined,
            payment_mode: form.payment_mode as any,
            description: form.description || undefined,
        };
        mutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet size={100} /></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Record Expense</h2>
                            <p className="text-white/80 font-medium text-sm">Log a new school expense</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 bg-white overflow-y-auto flex-1">
                    {success ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Expense Recorded!</h3>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-semibold">{error}</div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Date *</label>
                                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all", fieldErrors.date && "border-red-300")} />
                                    {fieldErrors.date && <p className="text-xs text-red-500 font-bold">{fieldErrors.date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Amount (NPR) *</label>
                                    <input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300", fieldErrors.amount && "border-red-300")} />
                                    {fieldErrors.amount && <p className="text-xs text-red-500 font-bold">{fieldErrors.amount}</p>}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Category *</label>
                                <div className="relative">
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all", fieldErrors.category && "border-red-300")}
                                    >
                                        <option value="">Select category</option>
                                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="__custom__">Custom Category...</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                {form.category === '__custom__' && (
                                    <input
                                        placeholder="Enter custom category"
                                        value={form.customCategory}
                                        onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300 mt-2"
                                    />
                                )}
                                {fieldErrors.category && <p className="text-xs text-red-500 font-bold">{fieldErrors.category}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Vendor</label>
                                    <input placeholder="Vendor name" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Invoice No.</label>
                                    <input placeholder="INV-XXXX" value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Payment Mode *</label>
                                <div className="relative">
                                    <select
                                        value={form.payment_mode}
                                        onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all"
                                    >
                                        {PAYMENT_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Brief description of the expense..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300 resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200">Cancel</button>
                                <button type="submit" disabled={mutation.isPending} className="flex-[2] bg-rose-500 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                    {mutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Wallet size={18} /><span>Record Expense</span></>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
