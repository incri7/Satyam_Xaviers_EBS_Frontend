import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Home, Edit2, MapPin, Briefcase, Mail, Phone, Users, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { EditParentModal } from './EditParentModal';
import type { Parent } from '../../types/people';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { Pagination } from '../common/Pagination';
import { cn } from '../../utils/cn';

type ParentSortKey = 'name' | 'occupation' | 'city';

/** Sortable column header: ascending -> descending -> unsorted. */
const ParentSortTh: React.FC<{
    k: ParentSortKey;
    sort: { by: ParentSortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: ParentSortKey) => void;
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

export const ParentManagement: React.FC = () => {
    const [view, setView] = useViewMode('people_parents_view');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [occupation, setOccupation] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
    const [sort, setSort] = useState<{ by: ParentSortKey | null; dir: 'asc' | 'desc' }>({
        by: null,
        dir: 'asc',
    });
    const [editingParent, setEditingParent] = useState<Parent | null>(null);

    React.useEffect(() => {
        const id = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const toggleSort = (key: ParentSortKey) =>
        setSort((prev) => {
            setPage(1);
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const hasFilters = Boolean(searchQuery || occupation || status);
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setOccupation('');
        setStatus('');
        setPage(1);
    };

    const { data: occupations } = useQuery({
        queryKey: ['parent-occupations'],
        queryFn: peopleService.getParentOccupations,
        staleTime: 5 * 60 * 1000,
    });

    const { data: parentData, isLoading } = useQuery({
        queryKey: ['parents', searchQuery, page, limit, occupation, status, sort.by, sort.dir],
        queryFn: () =>
            peopleService.getParents({
                search: searchQuery,
                page,
                limit,
                occupation: occupation || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: sort.by ?? undefined,
                sort_dir: sort.dir,
            }),
        placeholderData: (prev: any) => prev,
    });

    const parents = parentData?.parents || [];
    const parentName = (p: Parent) =>
        [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
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
                            value={occupation}
                            onChange={(v) => { setOccupation(v); setPage(1); }}
                            label="Occupation"
                            icon={<Briefcase className="w-4 h-4 text-slate-400 shrink-0" />}
                            options={[
                                { value: '', label: 'All occupations' },
                                ...(((occupations as string[] | undefined) || []).map((o) => ({ value: o, label: o }))),
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
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm px-1">
                <p className="font-bold text-slate-400">
                    Parents <span className="text-slate-900">{parentData?.total_count ?? 0}</span>
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
                                    <ParentSortTh k="name" sort={sort} onSort={toggleSort}>Parent</ParentSortTh>
                                    <ParentSortTh k="occupation" sort={sort} onSort={toggleSort}>Occupation</ParentSortTh>
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                                    <ParentSortTh k="city" sort={sort} onSort={toggleSort}>City</ParentSortTh>
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading
                                    ? [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-6 bg-slate-50/20" />
                                        </tr>
                                    ))
                                    : parents.map((p: Parent) => (
                                        <tr key={p.id} className="group hover:bg-slate-50/60 focus-within:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                                                        <Home className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900 whitespace-nowrap">{parentName(p)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                {p.occupation ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold whitespace-nowrap">
                                                        {p.occupation}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3.5 text-sm">
                                                <div className="space-y-0.5">
                                                    {/* The guardian's own details first: a secondary guardian
                                                        has no login, so user is null for them. */}
                                                    {(p.phone || p.user?.phone) && (
                                                        <p className="font-medium text-slate-600 whitespace-nowrap">{p.phone || p.user?.phone}</p>
                                                    )}
                                                    {(p.email || p.user?.email) && (
                                                        <p className="text-xs text-slate-400 truncate max-w-[16rem]">{p.email || p.user?.email}</p>
                                                    )}
                                                    {!p.phone && !p.email && !p.user?.phone && !p.user?.email && (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">{p.city || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <AccessControl id="parents_update">
                                                        <button
                                                            onClick={() => setEditingParent(p)}
                                                            aria-label="Edit parent"
                                                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </AccessControl>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {parents.length === 0 && !isLoading && (
                        <div className="py-16 text-center space-y-2">
                            <p className="font-bold text-slate-900">No parents found</p>
                            <p className="text-slate-500 text-sm">Try a different search, or clear the filters.</p>
                        </div>
                    )}
                </div>
            )}

            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', view !== 'cards' && 'hidden')}>
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : parents.map((p: Parent) => (
                    <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 p-6 space-y-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{p.first_name} {p.last_name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                        <Briefcase className="w-3 h-3" />
                                        <span>{p.occupation || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <AccessControl id="parents_update">
                                <button
                                    onClick={() => setEditingParent(p)}
                                    className="p-2 text-slate-400 hover:text-brand hover:bg-rose-50 rounded-lg transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </AccessControl>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Details</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span className="truncate">{p.user?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{p.user?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="line-clamp-2">{p.city || 'N/A'}, {p.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                                <Users className="w-3 h-3" />
                                <span>Nat ID: {p.national_id || 'N/A'}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {parentData && (
                <Pagination
                    page={parentData.page}
                    totalPages={parentData.total_pages}
                    totalCount={parentData.total_count}
                    pageSize={parentData.limit}
                    onChange={setPage}
                />
            )}

            {editingParent && (
                <EditParentModal
                    parent={editingParent}
                    isOpen={!!editingParent}
                    onClose={() => setEditingParent(null)}
                />
            )}
        </div>
    );
};
