import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { registrationService } from '../../api/services/registration.service';
import { academicsService } from '../../api/services/academics.service';
import { Search, Edit2, Trash2, GraduationCap, MapPin, Link2, Check, ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { cn } from '../../utils/cn';
import { EditStudentModal } from './EditStudentModal';
import type { Student } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { Pagination } from '../common/Pagination';

type StudentSortKey = 'name' | 'admission_no' | 'dob' | 'gender' | 'status' | 'admission_date';

/** Sortable column header: ascending -> descending -> unsorted. */
const StudentSortTh: React.FC<{
    k: StudentSortKey;
    sort: { by: StudentSortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: StudentSortKey) => void;
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

export const StudentManagement: React.FC = () => {
    const { t } = useTranslation();
    const [confirmUI, confirm] = useConfirmDialog();
    const df = useDateFormat();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [view, setView] = useViewMode('people_students_view');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [sort, setSort] = useState<{ by: StudentSortKey | null; dir: 'asc' | 'desc' }>({
        by: null,
        dir: 'asc',
    });
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [copiedLinkFor, setCopiedLinkFor] = useState<number | null>(null);
    const [filterClassId, setFilterClassId] = useState('');
    const [filterSectionId, setFilterSectionId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    React.useEffect(() => {
        const id = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const toggleSort = (key: StudentSortKey) =>
        setSort((prev) => {
            setPage(1);
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const hasFilters = Boolean(searchQuery || filterClassId || filterSectionId || filterStatus || filterGender);
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setFilterClassId('');
        setFilterSectionId('');
        setFilterStatus('');
        setFilterGender('');
        setPage(1);
    };

    const studentName = (st: Student) =>
        [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', filterClassId],
        queryFn: () => academicsService.getSections({ class_id: Number(filterClassId), limit: 100 }),
        enabled: !!filterClassId,
    });

    const generateLinkMutation = useMutation({
        mutationFn: registrationService.generateToken,
        onSuccess: async (data) => {
            const url = `${window.location.origin}${data.registration_url}`;
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                window.prompt('Copy the parent registration link:', url);
            }
            setCopiedLinkFor(data.student_id);
            setTimeout(() => setCopiedLinkFor(null), 3000);
        },
        onError: (err: any) => {
            alert(err.response?.data?.detail || 'Failed to generate registration link');
        }
    });

    const { data: studentData, isLoading } = useQuery({
        queryKey: ['students', searchQuery, page, limit, filterClassId, filterSectionId, filterStatus, filterGender, sort.by, sort.dir],
        queryFn: () => peopleService.getStudents({
            search: searchQuery,
            page,
            limit,
            class_id: filterClassId ? Number(filterClassId) : undefined,
            section_id: filterSectionId ? Number(filterSectionId) : undefined,
            filter_by_status: filterStatus || undefined,
            gender: filterGender || undefined,
            sort_by: sort.by ?? undefined,
            sort_dir: sort.dir,
        }),
        placeholderData: (prev: any) => prev,
    });

    const deleteMutation = useMutation({
        mutationFn: peopleService.deleteStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete student');
        }
    });

    const students = studentData?.students || [];

    return (
        <div className="space-y-6">
            {confirmUI}
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, admission ID..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SelectMenu
                        value={filterClassId}
                        onChange={(v) => { setFilterClassId(v); setFilterSectionId(''); setPage(1); }}
                        label="Class"
                        options={[
                            { value: '', label: 'All classes' },
                            ...((classesData?.classes || []) as any[]).map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                    <SelectMenu
                        value={filterSectionId}
                        onChange={(v) => { setFilterSectionId(v); setPage(1); }}
                        label="Section"
                        options={[
                            { value: '', label: 'All sections' },
                            ...((sectionsData?.sections || []) as any[]).map((sec) => ({ value: String(sec.id), label: sec.name })),
                        ]}
                    />
                    <SelectMenu
                        value={filterStatus}
                        onChange={(v) => { setFilterStatus(v); setPage(1); }}
                        label="Status"
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'active', label: 'Active' },
                            { value: 'passed_out', label: 'Passed out' },
                            { value: 'transferred', label: 'Transferred' },
                            { value: 'discontinued', label: 'Discontinued' },
                        ]}
                    />
                    <SelectMenu
                        value={filterGender}
                        onChange={(v) => { setFilterGender(v); setPage(1); }}
                        label="Gender"
                        options={[
                            { value: '', label: 'All genders' },
                            { value: 'M', label: 'Male' },
                            { value: 'F', label: 'Female' },
                            { value: 'O', label: 'Other' },
                        ]}
                    />
                    <ViewToggle value={view} onChange={setView} />
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm px-1">
                <p className="font-bold text-slate-400">
                    Students <span className="text-slate-900">{studentData?.total_count ?? 0}</span>
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
                                    <StudentSortTh k="name" sort={sort} onSort={toggleSort}>Student</StudentSortTh>
                                    <StudentSortTh k="admission_no" sort={sort} onSort={toggleSort}>Admission No</StudentSortTh>
                                    <StudentSortTh k="dob" sort={sort} onSort={toggleSort}>Date of Birth</StudentSortTh>
                                    <StudentSortTh k="gender" sort={sort} onSort={toggleSort}>Gender</StudentSortTh>
                                    <StudentSortTh k="admission_date" sort={sort} onSort={toggleSort}>Admitted</StudentSortTh>
                                    <StudentSortTh k="status" sort={sort} onSort={toggleSort}>Status</StudentSortTh>
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
                                    : students.map((st: Student) => (
                                        <tr key={st.id} className="group hover:bg-slate-50/60 focus-within:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                                        <GraduationCap className="w-4 h-4" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/people/students/${st.id}`)}
                                                        className="font-bold text-slate-900 hover:text-brand transition-colors text-left whitespace-nowrap"
                                                    >
                                                        {studentName(st)}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{st.admission_no || '—'}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{df.date(st.dob)}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-600">{st.gender || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">{df.date(st.admission_date)}</td>
                                            <td className="px-6 py-3.5">
                                                <span className={cn(
                                                    'inline-flex text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap',
                                                    st.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                                                )}>
                                                    {st.status || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <AccessControl id="students_update">
                                                        <button
                                                            onClick={() => setEditingStudent(st)}
                                                            aria-label="Edit student"
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
                    {students.length === 0 && !isLoading && (
                        <div className="py-16 text-center space-y-2">
                            <p className="font-bold text-slate-900">No students found</p>
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
                ) : students.map((student: Student) => (
                    <motion.div
                        key={student.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                                    <GraduationCap className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="students_update">
                                        <button
                                            onClick={() => generateLinkMutation.mutate(student.id)}
                                            title="Generate parent registration link (copied to clipboard)"
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                            {copiedLinkFor === student.id
                                                ? <Check className="w-4 h-4 text-emerald-600" />
                                                : <Link2 className="w-4 h-4" />}
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="students_update">
                                        <button
                                            onClick={() => setEditingStudent(student)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="students_delete">
                                        <button
                                            onClick={() => {
                                                confirm({
                                                    title: t('confirm.deleteStudent.title'),
                                                    body: t('confirm.deleteStudent.body', {
                                                        name: `${student.first_name} ${student.last_name || ''}`.trim(),
                                                    }),
                                                    confirmLabel: t('confirm.deleteStudent.action'),
                                                    onConfirm: () => deleteMutation.mutate(student.id),
                                                });
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{student.first_name} {student.last_name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adm No: {student.admission_no}</p>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        student.status === 'active' ? "bg-emerald-500" : "bg-red-500"
                                    )} />
                                    <span className="capitalize">{student.status}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{student.city || 'N/A'}, {student.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-brand/5 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">DOB: {df.date(student.dob)}</span>
                            <button
                                onClick={() => navigate(`/people/students/${student.id}`)}
                                className="text-xs font-bold text-brand hover:underline"
                            >
                                Details →
                            </button>
                        </div>
                    </motion.div>
                ))}

                {students.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <GraduationCap className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No students found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search query or add a new student.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls (Simple) */}
            {studentData && (
                <Pagination
                    page={studentData.page}
                    totalPages={studentData.total_pages}
                    totalCount={studentData.total_count}
                    pageSize={studentData.limit}
                    onChange={setPage}
                />
            )}

            {editingStudent && (
                <EditStudentModal
                    student={editingStudent}
                    isOpen={!!editingStudent}
                    onClose={() => setEditingStudent(null)}
                />
            )}
        </div>
    );
};
