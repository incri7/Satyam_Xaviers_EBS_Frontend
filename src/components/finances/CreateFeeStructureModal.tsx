import React, { useState } from 'react';
import { X, Landmark, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import type { FeeStructureCreate } from '../../types/finance';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const FREQUENCY_OPTIONS = [
    { label: 'One Time', value: 'one_time' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
];

export const CreateFeeStructureModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        name: '',
        frequency: 'monthly',
        amount: '',
        fee_type: '',
        valid_from: '',
        valid_to: '',
    });

    const mutation = useMutation({
        mutationFn: (data: FeeStructureCreate) => financesService.createFeeStructure(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            setSuccess(true);
            setTimeout(() => { onClose(); setSuccess(false); resetForm(); }, 1500);
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to create fee structure');
        },
    });

    const resetForm = () => {
        setForm({ name: '', frequency: 'monthly', amount: '', fee_type: '', valid_from: '', valid_to: '' });
        setFieldErrors({});
        setError(null);
    };

    if (!isOpen) return null;

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Name is required';
        if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Amount must be greater than 0';
        if (!form.frequency) errors.frequency = 'Frequency is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: FeeStructureCreate = {
            name: form.name,
            frequency: form.frequency as any,
            amount: parseFloat(form.amount),
            fee_type: form.fee_type || undefined,
            is_active: true,
            valid_from: form.valid_from || undefined,
            valid_to: form.valid_to || undefined,
        };
        mutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-brand p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Landmark size={100} /></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">New Fee Structure</h2>
                            <p className="text-white/80 font-medium text-sm">Define a new fee type for students</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 bg-white">
                    {success ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Fee Structure Created!</h3>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-semibold">{error}</div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Fee Name *</label>
                                <input
                                    placeholder="e.g. Monthly Tuition Fee"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300", fieldErrors.name && "border-red-300")}
                                />
                                {fieldErrors.name && <p className="text-xs text-red-500 font-bold">{fieldErrors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Amount (NPR) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300", fieldErrors.amount && "border-red-300")}
                                    />
                                    {fieldErrors.amount && <p className="text-xs text-red-500 font-bold">{fieldErrors.amount}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Frequency *</label>
                                    <div className="relative">
                                        <select
                                            value={form.frequency}
                                            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all"
                                        >
                                            {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Fee Type</label>
                                <input
                                    placeholder="e.g. Tuition, Lab, Library"
                                    value={form.fee_type}
                                    onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Valid From</label>
                                    <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Valid To</label>
                                    <input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all" />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200">Cancel</button>
                                <button type="submit" disabled={mutation.isPending} className="flex-[2] bg-brand text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                    {mutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Landmark size={18} /><span>Create Fee Structure</span></>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
