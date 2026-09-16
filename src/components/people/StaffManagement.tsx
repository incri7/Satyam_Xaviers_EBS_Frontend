import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Edit2, Users, MapPin, Briefcase, Phone, Plus, Power, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { Pagination } from '../common/Pagination';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { EditStaffModal } from './EditStaffModal';
import { AddStaffModal } from './AddStaffModal';
import { StaffProfileDrawer } from './StaffProfileDrawer';
import { cn } from '../../utils/cn';
import type { Staff } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '../common/ConfirmDialog';

type StaffSortKey = 'name' | 'code' | 'designation' | 'phone' | 'join_date' | 'status';

/** Sortable column header: ascending -> descending -> unsorted. */
const StaffSortTh: React.FC<{
    k: StaffSortKey;
    sort: { by: StaffSortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: StaffSortKey) => void;
    children: React.ReactNode;
}> = ({ k, sort, onSort, children }) => {
    const active = sort.by === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    return (
        <th scope="col" className="px-6 py-4 whitespace-nowrap">
            <button
                type="button"
                onClick={() => onSort(k)}
                className={cn(
                    'group inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors rounded',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600',
                )}
            >
                {children}
                <Icon className={cn('w-3.5 h-3.5 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
            </button>
        </th>
    );
};

export const StaffManagement: React.FC = () => {
    const { t } = useTranslation();
    const [confirmUI, confirm] = useConfirmDialog();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [view, setView] = useViewMode('people_staff_view');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [designation, setDesignation] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
    const [sort, setSort] = useState<{ by: StaffSortKey | null; dir: 'asc' | 'desc' }>({
        by: null,
        dir: 'asc',
    });

    React.useEffect(() => {
        const id = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const toggleSort = (key: StaffSortKey) =>
        setSort((prev) => {
            setPage(1);
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const hasFilters = Boolean(searchQuery || designation || status);
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setDesignation('');
        setStatus('');
        setPage(1);
    };

    const { data: designations } = useQuery({
        queryKey: ['staff-designations'],
        queryFn: peopleService.getStaffDesignations,
        staleTime: 5 * 60 * 1000,
    });

    const fullName = (m: Staff) =>
        [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(' ');
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [viewingStaffId, setViewingStaffId] = useState<number | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const { data: staffData, isLoading, isError } = useQuery({
        queryKey: ['staff', searchQuery, page, limit, designation, status, sort.by, sort.dir],
        queryFn: () =>
            peopleService.getStaffList({
                search: searchQuery,
                page,
                limit,
                designation: designation || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: sort.by ?? undefined,
                sort_dir: sort.dir,
            }),
        placeholderData: (prev: any) => prev,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => peopleService.setStaffActive(id, isActive),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
        onError: (err: any) => alert(err.response?.data?.detail || err.message || 'Failed to update status'),
    });

    const staffList = staffData?.staff || [];

    return (
        <div className="space-y-6">
            {confirmUI}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => setSearchInput('')}
                            aria-label="Clear"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <SelectMenu
                        value={designation}
                        onChange={(v) => { setDesignation(v); setPage(1); }}
                        label="Designation"
                        icon={<Briefcase className="w-4 h-4 text-slate-400 shrink-0" />}
                        options={[
                            { value: '', label: 'All designations' },
                            ...((designations as string[] | undefined) || []).map((d) => ({ value: d, label: d })),
                        ]}
                    />
                    <SelectMenu
                        value={status}
                        onChange={(v) => { setStatus(v as '' | 'active' | 'inactive'); setPage(1); }}
                        label="Status"
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                    />
                    <ViewToggle value={view} onChange={setView} />
                    <AccessControl id="staff_create">
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-200 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Staff</span>
                        </button>
                    </AccessControl>
                </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm px-1">
                <p className="font-bold text-slate-400">
                    Staff <span className="text-slate-900">{staffData?.total_count ?? 0}</span>
                </p>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-brand transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear filters
                    </button>
                )}
            </div>

            {view === 'table' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <StaffSortTh k="name" sort={sort} onSort={toggleSort}>Staff</StaffSortTh>
                                    <StaffSortTh k="code" sort={sort} onSort={toggleSort}>Code</StaffSortTh>
                                    <StaffSortTh k="designation" sort={sort} onSort={toggleSort}>Designation</StaffSortTh>
                                    <StaffSortTh k="phone" sort={sort} onSort={toggleSort}>Phone</StaffSortTh>
                                    <StaffSortTh k="join_date" sort={sort} onSort={toggleSort}>Joined</StaffSortTh>
                                    <StaffSortTh k="status" sort={sort} onSort={toggleSort}>Status</StaffSortTh>
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading
                                    ? [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={7} className="px-6 py-6 bg-slate-50/20" />
                                        </tr>
                                    ))
                                    : staffList.map((m: Staff) => (
                                        <tr key={m.id} className="group hover:bg-slate-50/60 focus-within:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingStaffId(m.id)}
                                                        className="font-bold text-slate-900 hover:text-brand transition-colors text-left whitespace-nowrap"
                                                    >
                                                        {fullName(m)}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{m.staff_code || '—'}</td>
                                            <td className="px-6 py-3.5">
                                                {m.designation ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold whitespace-nowrap">
                                                        {m.designation}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">{m.phone || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{df.date(m.join_date)}</td>
                                            <td className="px-6 py-3.5">
                                                <span className={cn(
                                                    'inline-flex text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider',
                                                    m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
                                                )}>
                                                    {m.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <AccessControl id="staff_update">
                                                        <button
                                                            onClick={() => setEditingStaff(m)}
                                                            aria-label="Edit staff"
                                                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </AccessControl>
                                                    <AccessControl id="staff_update">
                                                        <button
                                                            onClick={() => {
                                                                const next = !m.is_active;
                                                                confirm({
                                                                    tone: 'neutral',
                                                                    title: next ? t('confirm.staffActivate.title') : t('confirm.staffDeactivate.title'),
                                                                    body: t(next ? 'confirm.staffActivate.body' : 'confirm.staffDeactivate.body', { name: fullName(m) }),
                                                                    confirmLabel: next ? t('confirm.staffActivate.action') : t('confirm.staffDeactivate.action'),
                                                                    onConfirm: () => statusMutation.mutate({ id: m.id, isActive: next }),
                                                                });
                                                            }}
                                                            aria-label={m.is_active ? 'Mark inactive' : 'Mark active'}
                                                            className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                    </AccessControl>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {staffList.length === 0 && !isLoading && (
                        <div className="py-16 text-center space-y-2">
                            <p className="font-bold text-slate-900">No staff found</p>
                            <p className="text-slate-500 text-sm">Try a different search, or clear the filters.</p>
                        </div>
                    )}
                </div>
            )}

            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', view !== 'cards' && 'hidden')}>
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : staffList.map((m: Staff) => (
                    <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative",
                            !m.is_active && "opacity-60"
                        )}
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="staff_update">
                                        <button
                                            onClick={() => setEditingStaff(m)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="staff_update">
                                        <button
                                            onClick={() => {
                                                const next = !m.is_active;
                                                confirm({
                                                    tone: 'neutral',
                                                    title: next
                                                        ? t('confirm.staffActivate.title')
                                                        : t('confirm.staffDeactivate.title'),
                                                    body: t(
                                                        next ? 'confirm.staffActivate.body' : 'confirm.staffDeactivate.body',
                                                        { name: `${m.first_name} ${m.last_name || ''}`.trim() },
                                                    ),
                                                    confirmLabel: next
                                                        ? t('confirm.staffActivate.action')
                                                        : t('confirm.staffDeactivate.action'),
                                                    onConfirm: () => statusMutation.mutate({ id: m.id, isActive: next }),
                                                });
                                            }}
                                            title={m.is_active ? 'Mark inactive' : 'Mark active'}
                                            className={cn(
                                                "p-2 rounded-lg transition-all",
                                                m.is_active ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                                            )}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{m.first_name} {m.last_name}</h3>
                                    {!m.is_active && (
                                        <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-full">Inactive</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{m.designation || 'Staff'}</span>
                                    <span>•</span>
                                    <span>{m.staff_code}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{m.city || 'N/A'}, {m.state || ''}</span>
                                </div>
                                {m.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span className="line-clamp-1">{m.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-amber-50/50 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Joined: {df.date(m.join_date, 'medium', 'N/A')}</span>
                            <button
                                onClick={() => setViewingStaffId(m.id)}
                                className="text-xs font-bold text-amber-600 hover:underline"
                            >
                                Details →
                            </button>
                        </div>
                    </motion.div>
                ))}

                {isError && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-10 h-10 text-red-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Failed to load staff</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">There was a problem fetching staff records. Please try again.</p>
                    </div>
                )}
                {staffList.length === 0 && !isLoading && !isError && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No staff found</h3>
                    </div>
                )}
            </div>

            {editingStaff && (
                <EditStaffModal
                    staff={editingStaff}
                    isOpen={!!editingStaff}
                    onClose={() => setEditingStaff(null)}
                />
            )}

            {staffData && (
                <Pagination
                    page={staffData.page}
                    totalPages={staffData.total_pages}
                    totalCount={staffData.total_count}
                    pageSize={staffData.limit}
                    onChange={setPage}
                />
            )}

            <StaffProfileDrawer staffId={viewingStaffId} onClose={() => setViewingStaffId(null)} />

            <AddStaffModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        </div>
    );
};
