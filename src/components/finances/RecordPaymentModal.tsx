import React, { useState } from 'react';
import { X, Receipt, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { peopleService } from '../../api/services/people.service';
import type { PaymentCreate } from '../../types/finance';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const PAYMENT_METHODS = [
    { label: 'Cash', value: 'cash' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Online', value: 'online' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Card', value: 'card' },
];

export const RecordPaymentModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [studentSearch, setStudentSearch] = useState('');

    const [form, setForm] = useState({
        student_id: '',
        fee_structure_id: '',
        amount: '',
        method: 'cash',
        paid_at: new Date().toISOString().slice(0, 16),
        receipt_no: '',
        transaction_id: '',
    });

    // Fetch students for selection
    const { data: studentsData } = useQuery({
        queryKey: ['students-for-payment', studentSearch],
        queryFn: () => peopleService.getStudents({ search: studentSearch, limit: 50 }),
        enabled: isOpen,
    });

    // Fetch fee structures for selection
    const { data: feeStructures } = useQuery({
        queryKey: ['fee-structures-active'],
        queryFn: () => financesService.getFeeStructures(true),
        enabled: isOpen,
    });

    const mutation = useMutation({
        mutationFn: (data: PaymentCreate) => financesService.recordPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            setSuccess(true);
            setTimeout(() => { onClose(); setSuccess(false); resetForm(); }, 1500);
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to record payment');
        },
    });

    const resetForm = () => {
        setForm({ student_id: '', fee_structure_id: '', amount: '', method: 'cash', paid_at: new Date().toISOString().slice(0, 16), receipt_no: '', transaction_id: '' });
        setFieldErrors({});
        setError(null);
    };

    if (!isOpen) return null;

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!form.student_id) errors.student_id = 'Student is required';
        if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'Amount must be greater than 0';
        if (!form.method) errors.method = 'Payment method is required';
        if (!form.paid_at) errors.paid_at = 'Payment date is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: PaymentCreate = {
            student_id: parseInt(form.student_id),
            fee_structure_id: form.fee_structure_id ? parseInt(form.fee_structure_id) : undefined,
            amount: parseFloat(form.amount),
            method: form.method as any,
            paid_at: form.paid_at,
            receipt_no: form.receipt_no || undefined,
            transaction_id: form.transaction_id || undefined,
        };
        mutation.mutate(payload);
    };

    const students = studentsData?.students || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Receipt size={100} /></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Record Payment</h2>
                            <p className="text-white/80 font-medium text-sm">Record a new student fee payment</p>
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
                            <h3 className="text-xl font-bold text-slate-900">Payment Recorded!</h3>
                            <p className="text-slate-500 font-medium text-sm">Receipt has been generated automatically.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-semibold">{error}</div>
                            )}

                            {/* Student Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Student *</label>
                                <input
                                    type="text"
                                    placeholder="Search student by name..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300 mb-2"
                                />
                                <div className="relative">
                                    <select
                                        value={form.student_id}
                                        onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                                        className={cn("w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all", fieldErrors.student_id && "border-red-300")}
                                    >
                                        <option value="">Select student</option>
                                        {students.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.admission_no ? `(${s.admission_no})` : ''}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                {fieldErrors.student_id && <p className="text-xs text-red-500 font-bold">{fieldErrors.student_id}</p>}
                            </div>

                            {/* Fee Structure (optional) */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Fee Structure</label>
                                <div className="relative">
                                    <select
                                        value={form.fee_structure_id}
                                        onChange={(e) => setForm({ ...form, fee_structure_id: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all"
                                    >
                                        <option value="">None (General Payment)</option>
                                        {feeStructures?.map((fs: any) => (
                                            <option key={fs.id} value={fs.id}>{fs.name} — NPR {fs.amount}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
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
                                    <label className="text-sm font-bold text-slate-700">Method *</label>
                                    <div className="relative">
                                        <select
                                            value={form.method}
                                            onChange={(e) => setForm({ ...form, method: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold appearance-none outline-none transition-all"
                                        >
                                            {PAYMENT_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Payment Date *</label>
                                <input type="datetime-local" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Receipt No.</label>
                                    <input placeholder="Auto-generated if blank" value={form.receipt_no} onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Transaction ID</label>
                                    <input placeholder="e.g. TXN-12345" value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm font-bold outline-none transition-all placeholder:text-slate-300" />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200">Cancel</button>
                                <button type="submit" disabled={mutation.isPending} className="flex-[2] bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                    {mutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Receipt size={18} /><span>Record Payment</span></>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
