import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { Tag, Plus, Trash2, Search } from 'lucide-react';
import { AccessControl } from '../AccessControl';

export const DiscountManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [studentId, setStudentId] = useState('');
    const [searched, setSearched] = useState<number | null>(null);

    const { data: discounts, isLoading } = useQuery({
        queryKey: ['discounts', searched],
        queryFn: () => financesService.getStudentDiscounts(searched!),
        enabled: searched !== null,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => financesService.deleteDiscount(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts', searched] }),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(studentId);
        if (!isNaN(id)) setSearched(id);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Look up student discounts</h3>
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
                                <p className="font-bold text-slate-900 text-sm">Discounts — Student #{searched}</p>
                                <p className="text-xs text-slate-400 font-medium">{discounts?.length ?? 0} active discounts</p>
                            </div>
                        </div>
                        <AccessControl id="finances_create">
                            <button
                                onClick={() => alert('Add discount — connect to CreateDiscountModal')}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 text-sm font-bold rounded-xl hover:bg-violet-100 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Discount
                            </button>
                        </AccessControl>
                    </div>

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
                                                        if (confirm('Remove this discount?')) deleteMutation.mutate(d.id);
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
                            <p className="text-sm text-slate-500 font-medium">No discounts for this student</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
