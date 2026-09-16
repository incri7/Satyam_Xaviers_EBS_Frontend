import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { Trash2, UserCheck, Calendar, User, Edit2, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { academicYearOptions, currentAcademicYear, academicYearLabel } from '../../utils/academicYear';
import { AccessControl } from '../AccessControl';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { Pagination } from '../common/Pagination';
import { SelectMenu } from '../common/SelectMenu';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useTranslation } from 'react-i18next';
import type { Enrollment } from '../../types/academic';
import { useConfirmDialog } from '../common/ConfirmDialog';

export const EnrollmentManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const yearOptions = academicYearOptions(3);
    const [view, setView] = useViewMode('academics_enrollments_view');
    const [academicYear, setAcademicYearState] = useState(() => {
        const stored = localStorage.getItem('academics_enrollment_year');
        return stored && yearOptions.includes(stored) ? stored : currentAcademicYear();
    });
    const df = useDateFormat();
    const [confirmUI, confirm] = useConfirmDialog();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState<string>('');
    const [status, setStatus] = useState<'active' | 'all'>('active');
    const [sort, setSort] = useState<{ by: SortKey | null; dir: 'asc' | 'desc' }>({ by: null, dir: 'asc' });

    // Debounced, so typing a name doesn't fire a request per keystroke.
    React.useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    // Any filter change is a different result set, so start at its first page.
    const resetTo = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

    const { data: classData } = useQuery({
        queryKey: ['classes', 'all'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const setAcademicYear = (year: string) => {
        setAcademicYearState(year);
        setPage(1);   // a different year is a different list
        localStorage.setItem('academics_enrollment_year', year);
    };

    const PAGE_SIZE = 100;   // the endpoint's own ceiling (limit le=100)
    const { data: enrollmentData, isLoading } = useQuery({
        queryKey: ['enrollments', academicYear, page, search, classId, status, sort.by, sort.dir],
        queryFn: () => academicsService.getEnrollments({
            academic_year: academicYear,
            skip: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            search: search || undefined,
            class_id: classId ? Number(classId) : undefined,
            include_inactive: status === 'all',
            sort_by: sort.by ?? undefined,
            sort_dir: sort.dir,
        }),
        placeholderData: (prev) => prev,   // keep rows visible while the next page loads
    });

    const deleteMutation = useMutation({
        mutationFn: academicsService.deleteEnrollment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete enrollment');
        },
    });

    const enrollments = enrollmentData?.enrollments || [];

    const openEdit = (enrollment: Enrollment) => {
        setSelectedEnrollment(enrollment);
        setIsEditModalOpen(true);
    };

    const confirmDelete = (enrollment: Enrollment) =>
        confirm({
            title: t('confirm.deleteEnrollment.title'),
            body: t('confirm.deleteEnrollment.body', {
                student: studentName(enrollment),
                class: className(enrollment),
            }),
            confirmLabel: t('confirm.deleteEnrollment.action'),
            onConfirm: () => deleteMutation.mutate(enrollment.id),
        });

    const toggleSort = (key: SortKey) =>
        setSort((s) => {
            setPage(1);
            if (s.by !== key) return { by: key, dir: 'asc' };
            return s.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const studentName = (e: Enrollment) => {
        const s = e.student;
        if (!s) return `${t('academics.student')} #${e.student_id}`;
        return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
    };

    const hasFilters = Boolean(search || classId || status === 'all');
    const clearFilters = () => {
        setSearchInput(''); setSearch(''); setClassId(''); setStatus('active'); setPage(1);
    };

    const className = (e: Enrollment) => e.class_?.name || `#${e.class_id}`;
    const sectionName = (e: Enrollment) =>
        e.section?.name || (e.section_id ? `#${e.section_id}` : null);

    const isEmpty = !isLoading && enrollments.length === 0;

    return (
        <div className="space-y-6">
            {confirmUI}
            <EditEnrollmentModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedEnrollment(null);
                }}
                enrollmentData={selectedEnrollment}
            />

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t('academics.searchEnrollments')}
                            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand/20 outline-none border-none"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                aria-label={t('common.clear')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <SelectMenu
                            value={academicYear}
                            onChange={setAcademicYear}
                            label={t('academics.year')}
                            icon={<Calendar className="w-4 h-4 text-slate-400 shrink-0" />}
                            options={yearOptions.map((y) => ({
                                value: y,
                                label: academicYearLabel(y, df.lang),
                            }))}
                        />

                        <SelectMenu
                            value={classId}
                            onChange={resetTo(setClassId)}
                            label={t('academics.class')}
                            options={[
                                { value: '', label: t('academics.allClasses') },
                                ...(classData?.classes || []).map((c) => ({
                                    value: String(c.id),
                                    label: c.name,
                                })),
                            ]}
                        />

                        <SelectMenu
                            value={status}
                            onChange={(v) => resetTo(setStatus)(v as 'active' | 'all')}
                            label={t('academics.status')}
                            options={[
                                { value: 'active', label: t('academics.activeOnly') },
                                { value: 'all', label: t('academics.allStatuses') },
                            ]}
                        />

                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="font-bold text-slate-400">
                        {t('academics.activeEnrollments')}{' '}
                        <span className="text-slate-900">{enrollmentData?.total_count ?? 0}</span>
                    </p>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-brand transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            {t('common.clearFilters')}
                        </button>
                    )}
                </div>
            </div>

            {isEmpty ? (
                <EmptyEnrollments />
            ) : view === 'table' ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <SortTh k="student" sort={sort} onSort={toggleSort}>{t('academics.student')}</SortTh>
                                    <SortTh k="class" sort={sort} onSort={toggleSort}>{t('academics.class')}</SortTh>
                                    <SortTh k="section" sort={sort} onSort={toggleSort}>{t('academics.section')}</SortTh>
                                    <SortTh k="year" sort={sort} onSort={toggleSort}>{t('academics.year')}</SortTh>
                                    <SortTh k="status" sort={sort} onSort={toggleSort}>{t('academics.status')}</SortTh>
                                    <Th className="text-right">{t('common.actions')}</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading
                                    ? [1, 2, 3, 4, 5].map((i) => (
                                          <tr key={i} className="animate-pulse">
                                              <td colSpan={6} className="px-6 py-6 bg-slate-50/20" />
                                          </tr>
                                      ))
                                    : enrollments.map((enrollment) => (
                                          <tr
                                              key={enrollment.id}
                                              className="group hover:bg-slate-50/60 focus-within:bg-slate-50/60 transition-colors"
                                          >
                                              <td className="px-6 py-3.5">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                                          <User className="w-4 h-4" />
                                                      </div>
                                                      <span className="min-w-0">
                                                          <span className="block font-bold text-slate-900 truncate">
                                                              {studentName(enrollment)}
                                                          </span>
                                                          {enrollment.student && (
                                                              <span className="block text-xs font-medium text-slate-400">
                                                                  {enrollment.student.admission_no}
                                                              </span>
                                                          )}
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                                                  {className(enrollment)}
                                              </td>
                                              <td className="px-6 py-3.5">
                                                  {sectionName(enrollment) ? (
                                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                                                          {sectionName(enrollment)}
                                                      </span>
                                                  ) : (
                                                      <span className="text-slate-300 font-medium">—</span>
                                                  )}
                                              </td>
                                              <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">
                                                  {academicYearLabel(enrollment.academic_year, df.lang)}
                                              </td>
                                              <td className="px-6 py-3.5">
                                                  <StatusPill active={enrollment.is_active} />
                                              </td>
                                              <td className="px-6 py-3.5">
                                                  {/* Revealed on hover so 401 rows aren't a wall of icons,
                                                      and on focus-within so they stay keyboard reachable. */}
                                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                      <AccessControl id="enrollments_update">
                                                          <IconButton
                                                              onClick={() => openEdit(enrollment)}
                                                              label={t('common.edit')}
                                                              tone="blue"
                                                          >
                                                              <Edit2 className="w-4 h-4" />
                                                          </IconButton>
                                                      </AccessControl>
                                                      <AccessControl id="enrollments_delete">
                                                          <IconButton
                                                              onClick={() => confirmDelete(enrollment)}
                                                              label={t('common.delete')}
                                                              tone="red"
                                                          >
                                                              <Trash2 className="w-4 h-4" />
                                                          </IconButton>
                                                      </AccessControl>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isLoading
                        ? [1, 2, 3, 4].map((i) => (
                              <div
                                  key={i}
                                  className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm"
                              />
                          ))
                        : enrollments.map((enrollment) => (
                              <motion.div
                                  key={enrollment.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand/30 transition-all hover:shadow-lg hover:shadow-slate-200/50 relative group"
                              >
                                  <div className="flex items-center gap-4 mb-4">
                                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                          <User className="w-6 h-6" />
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-slate-900 line-clamp-1">
                                              {studentName(enrollment)}
                                          </h3>
                                          <p className="text-xs font-bold text-slate-400 tracking-wider">
                                              {enrollment.student?.admission_no ||
                                                  academicYearLabel(enrollment.academic_year, df.lang)}
                                          </p>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                      <div className="bg-slate-50 p-3 rounded-2xl">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                                              {t('academics.class')}
                                          </p>
                                          <p className="text-sm font-bold text-slate-800">{className(enrollment)}</p>
                                      </div>
                                      <div className="bg-slate-50 p-3 rounded-2xl">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                                              {t('academics.section')}
                                          </p>
                                          <p className="text-sm font-bold text-slate-800">
                                              {sectionName(enrollment) || '—'}
                                          </p>
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2">
                                      <StatusPill active={enrollment.is_active} />
                                      <div className="flex gap-1">
                                          <AccessControl id="enrollments_update">
                                              <IconButton
                                                  onClick={() => openEdit(enrollment)}
                                                  label={t('common.edit')}
                                                  tone="blue"
                                              >
                                                  <Edit2 className="w-4 h-4" />
                                              </IconButton>
                                          </AccessControl>
                                          <AccessControl id="enrollments_delete">
                                              <IconButton
                                                  onClick={() => confirmDelete(enrollment)}
                                                  label={t('common.delete')}
                                                  tone="red"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </IconButton>
                                          </AccessControl>
                                      </div>
                                  </div>
                              </motion.div>
                          ))}
                </div>
            )}

            {enrollmentData && (
                <Pagination
                    page={enrollmentData.page}
                    totalPages={enrollmentData.total_pages}
                    totalCount={enrollmentData.total_count}
                    pageSize={enrollmentData.limit}
                    onChange={setPage}
                />
            )}
        </div>
    );
};

// ── Shared bits ───────────────────────────────────────────────────────────────

export type SortKey = 'student' | 'class' | 'section' | 'year' | 'status';

/**
 * A sortable column header. Cycles ascending -> descending -> unsorted, so a
 * sort can be undone without reloading; the arrow shows which state you are in
 * rather than leaving it to be inferred from the rows.
 */
const SortTh: React.FC<{
    k: SortKey;
    sort: { by: SortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: SortKey) => void;
    children: React.ReactNode;
}> = ({ k, sort, onSort, children }) => {
    const active = sort.by === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    return (
        <th scope="col" className="px-6 py-4 whitespace-nowrap">
            <button
                type="button"
                onClick={() => onSort(k)}
                aria-label={String(children)}
                className={cn(
                    'group inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded',
                    active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600',
                )}
            >
                {children}
                <Icon
                    className={cn(
                        'w-3.5 h-3.5 transition-opacity',
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                    )}
                />
            </button>
        </th>
    );
};

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <th
        scope="col"
        className={cn(
            'px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap',
            className,
        )}
    >
        {children}
    </th>
);

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => {
    const { t } = useTranslation();
    return (
        <span
            className={cn(
                'inline-flex text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider',
                active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
            )}
        >
            {active ? t('academics.active') : t('academics.inactive')}
        </span>
    );
};

const IconButton: React.FC<{
    onClick: () => void;
    label: string;
    tone: 'blue' | 'red';
    children: React.ReactNode;
}> = ({ onClick, label, tone, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={cn(
            'p-2 text-slate-300 rounded-xl transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            tone === 'blue' ? 'hover:text-blue-500 hover:bg-blue-50' : 'hover:text-red-500 hover:bg-red-50',
        )}
    >
        {children}
    </button>
);

const EmptyEnrollments: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t('academics.noEnrollmentsFound')}</h3>
            <p className="text-slate-500 max-w-sm mx-auto">{t('academics.noEnrollmentsDesc')}</p>
        </div>
    );
};
