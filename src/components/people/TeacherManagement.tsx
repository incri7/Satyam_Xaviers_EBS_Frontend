import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Edit2, Microscope, MapPin, Briefcase, GraduationCap, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { Pagination } from '../common/Pagination';
import { useDateFormat } from '../../hooks/useDateFormat';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { cn } from '../../utils/cn';
import { EditTeacherModal } from './EditTeacherModal';
import type { Teacher } from '../../types/people';

type TeacherSortKey = 'name' | 'code' | 'designation' | 'qualification' | 'experience' | 'join_date';

/** Sortable column header: ascending -> descending -> unsorted. */
const TeacherSortTh: React.FC<{
    k: TeacherSortKey;
    sort: { by: TeacherSortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: TeacherSortKey) => void;
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

export const TeacherManagement: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const df = useDateFormat();
    const [view, setView] = useViewMode('people_teachers_view');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [designation, setDesignation] = useState('');
    const [sort, setSort] = useState<{ by: TeacherSortKey | null; dir: 'asc' | 'desc' }>({
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

    const toggleSort = (key: TeacherSortKey) =>
        setSort((prev) => {
            setPage(1);
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const hasFilters = Boolean(searchQuery || designation);
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setDesignation('');
        setPage(1);
    };

    const { data: designations } = useQuery({
        queryKey: ['teacher-designations'],
        queryFn: peopleService.getTeacherDesignations,
        staleTime: 5 * 60 * 1000,
    });

    const fullName = (t: Teacher) =>
        [t.first_name, t.middle_name, t.last_name].filter(Boolean).join(' ');
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

    const { data: teacherData, isLoading } = useQuery({
        queryKey: ['teachers', searchQuery, page, limit, designation, sort.by, sort.dir],
        queryFn: () =>
            peopleService.getTeachers({
                search: searchQuery,
                page,
                limit,
                designation: designation || undefined,
                sort_by: sort.by ?? undefined,
                sort_dir: sort.dir,
            }),
        placeholderData: (prev: any) => prev,
    });

    const teachers = teacherData?.teachers || [];

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, staff code..."
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
                    <div className="flex flex-wrap gap-3">
                        <SelectMenu
                            value={designation}
                            onChange={(v) => { setDesignation(v); setPage(1); }}
                            label="Designation"
                            icon={<Briefcase className="w-4 h-4 text-slate-400 shrink-0" />}
                            options={[
                                { value: '', label: 'All designations' },
                                ...((designations as string[] | undefined) || []).map((d) => ({
                                    value: d,
                                    label: d,
                                })),
                            ]}
                        />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm px-1">
                <p className="font-bold text-slate-400">
                    Teachers <span className="text-slate-900">{teacherData?.total_count ?? 0}</span>
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
                                    <TeacherSortTh k="name" sort={sort} onSort={toggleSort}>Teacher</TeacherSortTh>
                                    <TeacherSortTh k="code" sort={sort} onSort={toggleSort}>Code</TeacherSortTh>
                                    <TeacherSortTh k="designation" sort={sort} onSort={toggleSort}>Designation</TeacherSortTh>
                                    <TeacherSortTh k="qualification" sort={sort} onSort={toggleSort}>Qualification</TeacherSortTh>
                                    <TeacherSortTh k="experience" sort={sort} onSort={toggleSort}>Experience</TeacherSortTh>
                                    <TeacherSortTh k="join_date" sort={sort} onSort={toggleSort}>Joined</TeacherSortTh>
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
                                    : teachers.map((t: Teacher) => (
                                        <tr key={t.id} className="group hover:bg-slate-50/60 focus-within:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                        <Microscope className="w-4 h-4" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/people/teachers/${t.id}`)}
                                                        className="font-bold text-slate-900 hover:text-brand transition-colors text-left whitespace-nowrap"
                                                    >
                                                        {fullName(t)}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{t.staff_code || '—'}</td>
                                            <td className="px-6 py-3.5">
                                                {t.designation ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold whitespace-nowrap">
                                                        {t.designation}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-600">{t.qualification || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                {t.experience_years ? `${t.experience_years} yr` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{df.date(t.join_date)}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <AccessControl id="teachers_update">
                                                        <button
                                                            onClick={() => setEditingTeacher(t)}
                                                            aria-label="Edit teacher"
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
                    {teachers.length === 0 && !isLoading && (
                        <div className="py-16 text-center space-y-2">
                            <p className="font-bold text-slate-900">No teachers found</p>
                            <p className="text-slate-500 text-sm">Try a different search, or clear the filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Grid */}
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', view !== 'cards' && 'hidden')}>
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : teachers.map((teacher: Teacher) => (
                    <motion.div
                        key={teacher.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Microscope className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="teachers_update">
                                        <button
                                            onClick={() => setEditingTeacher(teacher)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{teacher.first_name} {teacher.last_name}</h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{teacher.designation || 'Teacher'}</span>
                                    <span>•</span>
                                    <span>{teacher.staff_code}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{teacher.qualification || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{teacher.city || 'N/A'}, {teacher.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-blue-50/50 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Exp: {teacher.experience_years || 0} Years</span>
                            <button
                                onClick={() => navigate(`/people/teachers/${teacher.id}`)}
                                className="text-xs font-bold text-blue-600 hover:underline"
                            >
                                {t('profile.viewProfile')}
                            </button>
                        </div>
                    </motion.div>
                ))}

                {teachers.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Microscope className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No teachers found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search query or add a new teacher.</p>
                    </div>
                )}
            </div>

            {teacherData && (
                <Pagination
                    page={teacherData.page}
                    totalPages={teacherData.total_pages}
                    totalCount={teacherData.total_count}
                    pageSize={teacherData.limit}
                    onChange={setPage}
                />
            )}

            {editingTeacher && (
                <EditTeacherModal
                    teacher={editingTeacher}
                    isOpen={!!editingTeacher}
                    onClose={() => setEditingTeacher(null)}
                />
            )}

        </div>
    );
};
