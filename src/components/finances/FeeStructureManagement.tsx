import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { academicsService } from '../../api/services/academics.service';
import {
    Landmark, Search, Trash2, Edit2, X, Save, ChevronRight, ArrowLeft,
    Bus, CalendarDays, Repeat, Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { AccessControl } from '../AccessControl';
import type { FeeStructure } from '../../types/finance';
import type { Class } from '../../types/academic';

type View =
    | { level: 'classes' }
    | { level: 'class'; classId: number | null; className: string };

const rs = (amt: number) => `Rs ${new Intl.NumberFormat('en-IN').format(amt)}`;

/** The paper chart's bottom-line rows, derived from a class's component fees. */
const summarise = (fees: FeeStructure[]) => {
    const sum = (list: FeeStructure[]) => list.reduce((t, f) => t + Number(f.amount), 0);
    const yearlyCharge = sum(fees.filter(f => f.frequency === 'yearly' && f.fee_type === 'Academic Year Charge'));
    const monthly = sum(fees.filter(f => f.frequency === 'monthly'));
    const oneTime = sum(fees.filter(f => f.frequency === 'one_time'));
    return {
        yearlyCharge,
        monthly,
        oneTime,
        oldStudent: yearlyCharge + monthly,
        newStudent: yearlyCharge + monthly + oneTime,
    };
};

export const FeeStructureManagement: React.FC = () => {
    const [view, setView] = useState<View>({ level: 'classes' });

    const { data: fees, isLoading: feesLoading } = useQuery({
        queryKey: ['fee-structures'],
        queryFn: () => financesService.getFeeStructures(),
    });
    const { data: classesData, isLoading: classesLoading } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const isLoading = feesLoading || classesLoading;
    const allFees = fees || [];

    if (view.level === 'class') {
        return (
            <ClassFeeView
                classId={view.classId}
                className={view.className}
                fees={allFees.filter(f => (f.class_id ?? null) === view.classId)}
                onBack={() => setView({ level: 'classes' })}
            />
        );
    }

    return (
        <ClassFeeList
            fees={allFees}
            classes={(classesData?.classes || []) as Class[]}
            isLoading={isLoading}
            onOpen={(classId, className) => setView({ level: 'class', classId, className })}
        />
    );
};

// ── Level 1: one card per class, showing the quotable totals ──────────────────
const ClassFeeList: React.FC<{
    fees: FeeStructure[];
    classes: Class[];
    isLoading: boolean;
    onOpen: (classId: number | null, className: string) => void;
}> = ({ fees, classes, isLoading, onOpen }) => {
    const [search, setSearch] = useState('');

    const groups = useMemo(() => {
        const byClass = new Map<number, FeeStructure[]>();
        const schoolWide: FeeStructure[] = [];
        for (const f of fees) {
            if (f.class_id == null) schoolWide.push(f);
            else byClass.set(f.class_id, [...(byClass.get(f.class_id) || []), f]);
        }
        return { byClass, schoolWide };
    }, [fees]);

    const visibleClasses = classes.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 shrink-0">
                    <span>Fee items:</span>
                    <span className="text-slate-900">{fees.length}</span>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-slate-100" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleClasses.map((c, i) => {
                            const classFees = groups.byClass.get(c.id) || [];
                            const s = summarise(classFees);
                            return (
                                <motion.button
                                    key={c.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i, 12) * 0.02 }}
                                    onClick={() => onOpen(c.id, c.name)}
                                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md hover:border-brand/20 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                                                <Landmark className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{c.name}</p>
                                                <p className="text-[11px] font-bold text-slate-400">
                                                    {classFees.length} fee {classFees.length === 1 ? 'item' : 'items'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                                    </div>

                                    {classFees.length === 0 ? (
                                        <p className="text-xs font-bold text-slate-300 py-2">No fees configured</p>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50">
                                            <Stat label="Monthly" value={s.monthly} />
                                            <Stat label="Yearly" value={s.yearlyCharge} />
                                            <Stat label="New adm." value={s.newStudent} accent />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {groups.schoolWide.length > 0 && !search && (
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => onOpen(null, 'School-wide fees')}
                            className="group w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:border-brand/20 transition-all text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                    <Bus className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">School-wide fees</p>
                                    <p className="text-[11px] font-bold text-slate-400">
                                        Transport routes &amp; diary · {groups.schoolWide.length} items · not class-specific
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                        </motion.button>
                    )}
                </>
            )}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
    <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className={cn('text-sm font-black tabular-nums', accent ? 'text-brand' : 'text-slate-900')}>
            {value > 0 ? rs(value) : '—'}
        </p>
    </div>
);

// ── Level 2: one class → its components, grouped, with the chart's bottom line ─
const FREQUENCY_GROUPS = [
    { key: 'yearly' as const, title: 'Yearly charges', icon: CalendarDays, tone: 'text-indigo-600 bg-indigo-50' },
    { key: 'monthly' as const, title: 'Monthly', icon: Repeat, tone: 'text-emerald-600 bg-emerald-50' },
    { key: 'quarterly' as const, title: 'Quarterly', icon: Repeat, tone: 'text-sky-600 bg-sky-50' },
    { key: 'one_time' as const, title: 'One-time (new admission)', icon: Sparkles, tone: 'text-amber-600 bg-amber-50' },
];

const ClassFeeView: React.FC<{
    classId: number | null;
    className: string;
    fees: FeeStructure[];
    onBack: () => void;
}> = ({ classId, className, fees, onBack }) => {
    const queryClient = useQueryClient();
    const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
    const [editForm, setEditForm] = useState({ name: '', amount: '', fee_type: '' });
    const [editError, setEditError] = useState<string | null>(null);

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

    const s = summarise(fees);
    const isSchoolWide = classId === null;

    return (
        <div className="space-y-5">
            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                All classes  ›  {className}
            </button>

            {!isSchoolWide && fees.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                        {className} · fee summary
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryTile label="Yearly charge" value={s.yearlyCharge} />
                        <SummaryTile label="Monthly fee" value={s.monthly} />
                        <SummaryTile label="Total — old student" value={s.oldStudent} hint="Yearly + 1 month" />
                        <SummaryTile label="Total — new student" value={s.newStudent} hint="+ admission items" accent />
                    </div>
                </div>
            )}

            {fees.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                    <div className="inline-flex w-16 h-16 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                        <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">No fees for {className}</h4>
                        <p className="text-sm text-slate-500 font-medium">Add a fee structure and pick this class.</p>
                    </div>
                </div>
            ) : (
                FREQUENCY_GROUPS.map(group => {
                    const rows = fees.filter(f => f.frequency === group.key);
                    if (rows.length === 0) return null;
                    const Icon = group.icon;
                    const groupTotal = rows.reduce((t, f) => t + Number(f.amount), 0);
                    return (
                        <div key={group.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 bg-slate-50/40">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', group.tone)}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{group.title}</span>
                                    <span className="text-[11px] font-bold text-slate-400">({rows.length})</span>
                                </div>
                                <span className="text-sm font-black text-slate-900 tabular-nums">{rs(groupTotal)}</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {rows.map(fee => (
                                    <div key={fee.id} className="group flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                                        <div className="min-w-0">
                                            <p className={cn('text-sm font-bold truncate', fee.is_active ? 'text-slate-800' : 'text-slate-400 line-through')}>
                                                {fee.name}
                                            </p>
                                            <p className="text-[11px] font-bold text-slate-400">{fee.fee_type || 'General'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-sm font-black text-slate-900 tabular-nums">{rs(Number(fee.amount))}</span>
                                            <div className="flex items-center gap-1.5">
                                                <AccessControl id="finances_update">
                                                    <button
                                                        onClick={() => openEdit(fee)}
                                                        aria-label={`Edit ${fee.name}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-slate-900 hover:bg-brand rounded-lg shadow-sm transition-all"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </button>
                                                </AccessControl>
                                                <AccessControl id="finances_delete">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Deactivate "${fee.name}" for ${className}?`)) deleteMutation.mutate(fee.id);
                                                        }}
                                                        aria-label={`Deactivate ${fee.name}`}
                                                        className="inline-flex items-center justify-center p-1.5 text-slate-500 bg-white border border-slate-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </AccessControl>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {editingFee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setEditingFee(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Edit Fee Structure</h3>
                                <p className="text-sm text-slate-500 font-medium capitalize">
                                    {className} · {editingFee.frequency.replace('_', ' ')}
                                </p>
                            </div>
                            <button onClick={() => setEditingFee(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
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
                                        placeholder="e.g. Tuition"
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

const SummaryTile: React.FC<{ label: string; value: number; hint?: string; accent?: boolean }> = ({ label, value, hint, accent }) => (
    <div className={cn('p-4 rounded-2xl', accent ? 'bg-brand/5' : 'bg-slate-50')}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className={cn('text-lg font-black tabular-nums', accent ? 'text-brand' : 'text-slate-900')}>
            {value > 0 ? rs(value) : '—'}
        </p>
        {hint && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{hint}</p>}
    </div>
);
