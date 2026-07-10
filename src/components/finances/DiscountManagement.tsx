import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { Tag, Plus, Trash2, Search, X } from 'lucide-react';
import { AccessControl } from '../AccessControl';

export const DiscountManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [studentId, setStudentId] = useState('');
    const [searched, setSearched] = useState<number | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [form, setForm] = useState({
        fee_structure_id: '',
        is_percent: true,
        value: '',
        reason: '',
    });

    const { data: discounts, isLoading } = useQuery({
        queryKey: ['discounts', searched],
        queryFn: () => financesService.getStudentDiscounts(searched!),
        enabled: searched !== null,
    });

    const { data: feeStructures } = useQuery({
        queryKey: ['fee-structures', 'active'],
        queryFn: () => financesService.getFeeStructures(true),
        enabled: isCreateOpen,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => financesService.deleteDiscount(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts', searched] }),
    });

    const createMutation = useMutation({
        mutationFn: financesService.createDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discounts', searched] });
            setIsCreateOpen(false);
            setCreateError(null);
            setForm({ fee_structure_id: '', is_percent: true, value: '', reason: '' });
        },
        onError: (err: any) => {
            setCreateError(err.response?.data?.detail || 'Failed to apply scholarship');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        if (!form.fee_structure_id) return setCreateError('Select a fee structure');
        const value = parseFloat(form.value);
        if (isNaN(value) || value <= 0) return setCreateError('Enter a valid scholarship value');
        if (form.is_percent && value > 100) return setCreateError('Percentage cannot exceed 100');
        createMutation.mutate({
            student_id: searched!,
            fee_structure_id: Number(form.fee_structure_id),
            is_percent: form.is_percent,
            value,
            reason: form.reason || undefined,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(studentId);
        if (!isNaN(id)) setSearched(id);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Look up student scholarships</h3>
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="number"
                            placeholder="Student ID"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-all"
                    >
                        Search
                    </button>
                </form>
            </div>

            {searched !== null && (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                                <Tag className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Scholarships — Student #{searched}</p>
                                <p className="text-xs text-slate-400 font-medium">{discounts?.length ?? 0} active scholarships</p>
                            </div>
                        </div>
                        <AccessControl id="finances_create">
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 text-sm font-bold rounded-xl hover:bg-violet-100 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Scholarship
                            </button>
                        </AccessControl>
                    </div>

                    {isCreateOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                onClick={() => setIsCreateOpen(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            />
                            <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Apply Scholarship</h3>
                                        <p className="text-sm text-slate-500 font-medium">Student #{searched}</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateOpen(false)}
                                        className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Fee Structure</label>
                                        <select
                                            value={form.fee_structure_id}
                                            onChange={(e) => setForm(f => ({ ...f, fee_structure_id: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                        >
                                            <option value="">Select fee structure…</option>
                                            {(feeStructures || []).map((fs: any) => (
                                                <option key={fs.id} value={fs.id}>{fs.name} — Rs. {fs.amount}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                                            <select
                                                value={form.is_percent ? 'percent' : 'fixed'}
                                                onChange={(e) => setForm(f => ({ ...f, is_percent: e.target.value === 'percent' }))}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                            >
                                                <option value="percent">Percentage (%)</option>
                                                <option value="fixed">Fixed amount (Rs.)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Value</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder={form.is_percent ? 'e.g. 50' : 'e.g. 2000'}
                                                value={form.value}
                                                onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Reason</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Merit scholarship, sibling discount"
                                            value={form.reason}
                                            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                        />
                                    </div>

                                    {createError && (
                                        <p className="text-sm font-medium text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{createError}</p>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateOpen(false)}
                                            className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-900 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createMutation.isPending}
                                            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50"
                                        >
                                            {createMutation.isPending ? 'Applying…' : 'Apply Scholarship'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-12 text-center text-slate-400 text-sm font-medium">Loading…</div>
                    ) : discounts && discounts.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Value</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Valid</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {discounts.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{d.reason ?? '—'}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                            {d.is_percent ? `${d.value}%` : `Rs. ${d.value}`}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                            {d.valid_from ?? '—'} → {d.valid_to ?? 'ongoing'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <AccessControl id="finances_delete">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Remove this scholarship?')) deleteMutation.mutate(d.id);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </AccessControl>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center space-y-3">
                            <div className="inline-flex w-14 h-14 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                                <Tag className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No scholarships for this student</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
