import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { Landmark, Search, Trash2, Edit2, CheckCircle2, XCircle, Info, X, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { AccessControl } from '../AccessControl';
import type { FeeStructure } from '../../types/finance';

export const FeeStructureManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
    const [editForm, setEditForm] = useState({ name: '', amount: '', fee_type: '' });
    const [editError, setEditError] = useState<string | null>(null);

    const { data: feeStructures, isLoading } = useQuery({
        queryKey: ['fee-structures'],
        queryFn: () => financesService.getFeeStructures(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => financesService.deactivateFeeStructure(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-structures'] }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: { name?: string; amount?: number; fee_type?: string } }) =>
            financesService.updateFeeStructure(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
            setEditingFee(null);
            setEditError(null);
        },
        onError: (err: any) => setEditError(err.response?.data?.detail || 'Failed to update fee structure'),
    });

    const openEdit = (fee: FeeStructure) => {
        setEditForm({ name: fee.name, amount: String(fee.amount), fee_type: fee.fee_type || '' });
        setEditError(null);
        setEditingFee(fee);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(editForm.amount);
        if (!editForm.name.trim()) return setEditError('Name is required');
        if (isNaN(amount) || amount <= 0) return setEditError('Enter a valid amount');
        updateMutation.mutate({
            id: editingFee!.id,
            data: { name: editForm.name.trim(), amount, fee_type: editForm.fee_type || undefined },
        });
    };

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
        }).format(amt);
    };

    const filteredFees = feeStructures?.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.fee_type?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search fee structures..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>Total Types:</span>
                    <span className="text-slate-900">{feeStructures?.length || 0}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : filteredFees.map((fee, idx) => (
                    <motion.div
                        key={fee.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 p-6 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                    fee.is_active ? "bg-brand/5 text-brand" : "bg-slate-100 text-slate-400"
                                )}>
                                    <Landmark className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 group-hover:text-brand transition-colors">{fee.name}</h4>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        {fee.frequency.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <AccessControl id="finances_update">
                                    <button
                                        onClick={() => openEdit(fee)}
                                        className="p-2 text-slate-400 hover:text-brand hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </AccessControl>
                                <AccessControl id="finances_delete">
                                    <button 
                                        onClick={() => {
                                            if (confirm('Deactivate this fee structure?')) deleteMutation.mutate(fee.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </AccessControl>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl mb-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                    <p className="text-xl font-black text-slate-900">{formatCurrency(fee.amount)}</p>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                    fee.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-500"
                                )}>
                                    {fee.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {fee.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-50 pt-4">
                            <div className="flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                <span>Type: {fee.fee_type || 'General'}</span>
                            </div>
                            <span>ID: #{fee.id}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredFees.length === 0 && !isLoading && (
                <div className="py-20 text-center space-y-4">
                    <div className="inline-flex w-16 h-16 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                        <Search className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">No results found</h4>
                        <p className="text-sm text-slate-500 font-medium">Try adjusting your search terms</p>
                    </div>
                </div>
            )}

            {editingFee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setEditingFee(null)}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Edit Fee Structure</h3>
                                <p className="text-sm text-slate-500 font-medium capitalize">{editingFee.frequency.replace('_', ' ')} · #{editingFee.id}</p>
                            </div>
                            <button
                                onClick={() => setEditingFee(null)}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Amount (Rs.)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                                    <input
                                        placeholder="e.g. tuition"
                                        value={editForm.fee_type}
                                        onChange={(e) => setEditForm(f => ({ ...f, fee_type: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                    />
                                </div>
                            </div>

                            {editError && (
                                <p className="text-sm font-medium text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{editError}</p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingFee(null)}
                                    className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-900 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:opacity-95 transition-all disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
