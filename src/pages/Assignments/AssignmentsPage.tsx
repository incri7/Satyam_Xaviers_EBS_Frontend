import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    assignmentsService,
    type Assignment,
    type AssignmentSort,
    type SubmissionStatus,
} from '../../api/services/assignments.service';
import { academicsService } from '../../api/services/academics.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Plus, BookOpen, Calendar, ChevronDown, X, CheckCircle2,
    AlertCircle, Loader2, Users, ClipboardList, Search, ArrowUpDown
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../hooks/useDateFormat';
import { ViewToggle, useViewMode } from '../../components/common/ViewToggle';
import { Pagination } from '../../components/common/Pagination';
import { SelectMenu } from '../../components/common/SelectMenu';

const CreateAssignmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [form, setForm] = useState({
        title: '', description: '', class_id: '', section_id: '',
        subject_id: '', due_date: '', teacher_id: '',
    });
    const [error, setError] = useState('');

    const { user } = useAuthStore();
    const isTeacher = user?.role === 'teacher';

    // Teachers only pick among classes/subjects they're actually assigned to
    // teach (ClassSubject.teacher_id) — never the whole school's list.
    const { data: myClassSubjects } = useQuery({
        queryKey: ['class-subjects', 'my'],
        queryFn: () => academicsService.getMyClassSubjects(),
        enabled: isTeacher,
    });
    const { data: allClassesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        enabled: !isTeacher,
    });
    const { data: allSubjects } = useQuery({
        queryKey: ['subjects', 'all'],
        queryFn: () => academicsService.getSubjects(),
        enabled: !isTeacher,
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', form.class_id],
        queryFn: () => academicsService.getSections({ class_id: Number(form.class_id), limit: 100 }),
        enabled: !!form.class_id,
    });

    const myClasses = useMemo(() => {
        const byId = new Map<number, string>();
        (myClassSubjects || []).forEach(cs => byId.set(cs.class_id, cs.class_name));
        return [...byId.entries()].map(([id, name]) => ({ id, name }));
    }, [myClassSubjects]);

    const classes = isTeacher ? myClasses : (allClassesData?.classes || []);

    const subjects = isTeacher
        ? (myClassSubjects || [])
            .filter(cs => String(cs.class_id) === form.class_id)
            .map(cs => ({ id: cs.subject_id, name: cs.subject_name }))
        : (allSubjects || []);

    // Skip the picker when there's exactly one class (or one subject once a
    // class is chosen) to choose from.
    useEffect(() => {
        if (isTeacher && myClasses.length === 1 && form.class_id !== String(myClasses[0].id)) {
            setForm(p => ({ ...p, class_id: String(myClasses[0].id), section_id: '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacher, myClassSubjects]);

    useEffect(() => {
        if (isTeacher && subjects.length === 1 && form.subject_id !== String(subjects[0].id)) {
            setForm(p => ({ ...p, subject_id: String(subjects[0].id) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacher, myClassSubjects, form.class_id]);

    const { data: teacherOptions } = useQuery({
        queryKey: ['teacher-options'],
        queryFn: academicsService.getTeacherOptions,
        enabled: !isTeacher, // teachers assign to themselves automatically
    });

    const mutation = useMutation({
        mutationFn: assignmentsService.createAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            onClose();
        },
        onError: (err: any) => setError(err.response?.data?.detail || 'Failed to create assignment'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return setError('Title is required');
        if (!form.class_id) return setError('Class is required');
        if (!form.section_id) return setError('Section is required');
        if (!form.subject_id) return setError('Subject is required');
        if (!form.due_date) return setError('Due date is required');
        if (!isTeacher && !form.teacher_id) return setError('Teacher is required');
        mutation.mutate({
            title: form.title,
            description: form.description || undefined,
            class_id: Number(form.class_id),
            section_id: Number(form.section_id),
            subject_id: Number(form.subject_id),
            due_date: form.due_date,
            // teachers create as themselves — backend resolves it
            teacher_id: form.teacher_id ? Number(form.teacher_id) : undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{t('assignments.newAssignment')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">{t('assignments.titleField')}</label>
                        <input
                            type="text" value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder={t('assignments.titlePlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">{t('assignments.description')}</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            placeholder={t('assignments.descPlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">{t('assignments.class')}</label>
                            {isTeacher && classes.length === 1 ? (
                                <div className="px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900">
                                    {classes[0].name}
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={form.class_id}
                                        onChange={e => setForm(p => ({ ...p, class_id: e.target.value, section_id: '', subject_id: '' }))}
                                        disabled={isTeacher && classes.length === 0}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                    >
                                        <option value="">{t('assignments.select')}</option>
                                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            )}
                            {isTeacher && classes.length === 0 && (
                                <p className="text-[11px] text-amber-600 font-medium">{t('assignments.noClassesAssigned', 'No classes assigned to you yet — ask the coordinator.')}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">{t('assignments.section')}</label>
                            <div className="relative">
                                <select
                                    value={form.section_id}
                                    onChange={e => setForm(p => ({ ...p, section_id: e.target.value }))}
                                    disabled={!form.class_id}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                >
                                    <option value="">{t('assignments.select')}</option>
                                    {sectionsData?.sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">{t('assignments.subject', 'Subject')}</label>
                            {isTeacher && !form.class_id ? (
                                <div className="px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium text-slate-400">
                                    {t('assignments.selectClassFirst', 'Select a class first')}
                                </div>
                            ) : isTeacher && subjects.length === 1 ? (
                                <div className="px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900">
                                    {subjects[0].name}
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={form.subject_id}
                                        onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                                        disabled={isTeacher && subjects.length === 0}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                    >
                                        <option value="">{t('assignments.select')}</option>
                                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            )}
                            {isTeacher && !!form.class_id && subjects.length === 0 && (
                                <p className="text-[11px] text-amber-600 font-medium">{t('assignments.noSubjectsAssigned', 'No subjects assigned to you in this class — ask the coordinator.')}</p>
                            )}
                        </div>
                        {!isTeacher && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">{t('assignments.teacher', 'Teacher')}</label>
                                <div className="relative">
                                    <select
                                        value={form.teacher_id}
                                        onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                    >
                                        <option value="">{t('assignments.select')}</option>
                                        {(teacherOptions || []).map((tch) => (
                                            <option key={tch.id} value={tch.id}>
                                                {tch.name}{tch.subjects.length ? ` — ${tch.subjects.map(s => s.name).join(', ')}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">{t('assignments.dueDate')}</label>
                        <input
                            type="date" value={form.due_date}
                            onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {t('assignments.createAssignment')}
                    </button>
                </form>
            </div>
        </div>
    );
};

const PAGE_SIZE = 50;

type SortKey = AssignmentSort;

const AssignmentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const df = useDateFormat();
    const [view, setView] = useViewMode('assignments_view');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

    const canCreate = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'principal';
    // Teachers only ever get their own assignments back, so a teacher filter
    // would be a dropdown with one entry.
    const showTeacherFilter = user?.role !== 'teacher';

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [dueStatus, setDueStatus] = useState<'' | 'overdue' | 'upcoming'>('');
    const [sortBy, setSortBy] = useState<SortKey>('due_date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(id);
    }, [searchInput]);

    // Any filter change puts you back on page 1 — page 4 of the old result set
    // is meaningless against the new one.
    const resetTo = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    const { data: options } = useQuery({
        queryKey: ['assignments', 'filter-options', classId],
        queryFn: () => assignmentsService.getFilterOptions(classId ? Number(classId) : undefined),
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['assignments', { search, classId, sectionId, subjectId, teacherId, dueStatus, sortBy, sortDir, page }],
        queryFn: () => assignmentsService.listAssignments({
            sort_by: sortBy,
            sort_dir: sortDir,
            skip: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            ...(search ? { search } : {}),
            ...(classId ? { class_id: Number(classId) } : {}),
            ...(sectionId ? { section_id: Number(sectionId) } : {}),
            ...(subjectId ? { subject_id: Number(subjectId) } : {}),
            ...(teacherId ? { teacher_id: Number(teacherId) } : {}),
            ...(dueStatus ? { status: dueStatus } : {}),
        }),
        placeholderData: keepPreviousData,
    });

    const { data: submissionsData } = useQuery({
        queryKey: ['submissions', selectedAssignment?.id],
        queryFn: () => assignmentsService.listSubmissions(selectedAssignment!.id),
        enabled: !!selectedAssignment,
    });

    const assignments = data?.assignments || [];
    const totalCount = data?.total_count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // Every real class currently has a single section, all named "A", so a
    // section dropdown would be twelve identical options. Show it only once a
    // class is picked and that class genuinely has more than one.
    const sectionOptions = options?.sections ?? [];
    const showSectionFilter = !!classId && sectionOptions.length > 1;

    const hasFilters = !!(search || classId || sectionId || subjectId || teacherId || dueStatus);
    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setClassId('');
        setSectionId('');
        setSubjectId('');
        setTeacherId('');
        setDueStatus('');
        setPage(1);
    };

    const STATUS_CONFIG: Record<SubmissionStatus, { labelKey: string; color: string }> = {
        pending: { labelKey: 'assignments.statusPending', color: 'bg-slate-100 text-slate-500' },
        submitted: { labelKey: 'assignments.statusSubmitted', color: 'bg-blue-100 text-blue-700' },
        graded: { labelKey: 'assignments.statusGraded', color: 'bg-emerald-100 text-emerald-700' },
        missing: { labelKey: 'assignments.statusMissing', color: 'bg-red-100 text-red-600' },
    };

    const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

    const toggleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(key);
            setSortDir(key === 'due_date' ? 'desc' : 'asc');
        }
        setPage(1);
    };

    const Th: React.FC<{ k?: SortKey; align?: 'right'; children: React.ReactNode }> = ({ k, align, children }) => (
        <th className={cn(
            'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500',
            align === 'right' ? 'text-right' : 'text-left',
        )}>
            {k ? (
                <button
                    onClick={() => toggleSort(k)}
                    className={cn(
                        'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
                        sortBy === k && 'text-slate-900',
                    )}
                >
                    {children}
                    <ArrowUpDown className={cn('w-3 h-3', sortBy === k ? 'opacity-100' : 'opacity-30')} />
                </button>
            ) : children}
        </th>
    );

    /** Marking progress as a bar — "17 of 24 handed in, 12 graded". */
    const Progress: React.FC<{ a: Assignment }> = ({ a }) => {
        if (!a.submission_count) {
            return <span className="text-xs font-bold text-slate-300">—</span>;
        }
        const inPct = (a.submitted_count / a.submission_count) * 100;
        const gradedPct = (a.graded_count / a.submission_count) * 100;
        return (
            <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-bold text-slate-500 tabular-nums whitespace-nowrap">
                    {a.submitted_count}/{a.submission_count}
                </span>
                <div
                    className="relative w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0"
                    title={t('assignments.progressHint', {
                        submitted: a.submitted_count,
                        graded: a.graded_count,
                        total: a.submission_count,
                    })}
                >
                    <div className="absolute inset-y-0 left-0 bg-blue-400 rounded-full" style={{ width: inPct + '%' }} />
                    <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: gradedPct + '%' }} />
                </div>
            </div>
        );
    };

    const Meta: React.FC<{ a: Assignment }> = ({ a }) => (
        <span className="text-slate-500">
            {a.class_name ?? t('assignments.unknownClass')}
            {a.section_name && sectionOptions.length > 1 ? ' ' + a.section_name : ''}
        </span>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                {isCreateOpen && <CreateAssignmentModal onClose={() => setIsCreateOpen(false)} />}

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900">{t('assignments.title')}</h1>
                            <p className="text-slate-500 text-sm font-medium">{t('assignments.subtitle')}</p>
                        </div>
                        {canCreate && (
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-brand text-white font-bold text-sm rounded-xl md:rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all shrink-0"
                            >
                                <Plus className="w-5 h-5 shrink-0" />
                                <span className="hidden sm:inline">{t('assignments.newAssignment')}</span>
                                <span className="sm:hidden">{t('assignments.new')}</span>
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder={t('assignments.searchPlaceholder')}
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
                                    value={classId}
                                    onChange={(v) => { setClassId(v); setSectionId(''); setPage(1); }}
                                    label={t('assignments.class')}
                                    options={[
                                        { value: '', label: t('assignments.allClasses') },
                                        ...(options?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name })),
                                    ]}
                                />

                                {showSectionFilter && (
                                    <SelectMenu
                                        value={sectionId}
                                        onChange={resetTo(setSectionId)}
                                        label={t('assignments.section')}
                                        options={[
                                            { value: '', label: t('assignments.allSections') },
                                            ...sectionOptions.map((sc) => ({ value: String(sc.id), label: sc.name })),
                                        ]}
                                    />
                                )}

                                <SelectMenu
                                    value={subjectId}
                                    onChange={resetTo(setSubjectId)}
                                    label={t('assignments.subject')}
                                    options={[
                                        { value: '', label: t('assignments.allSubjects') },
                                        ...(options?.subjects ?? []).map((sb) => ({ value: String(sb.id), label: sb.name })),
                                    ]}
                                />

                                {showTeacherFilter && (
                                    <SelectMenu
                                        value={teacherId}
                                        onChange={resetTo(setTeacherId)}
                                        label={t('assignments.teacher')}
                                        options={[
                                            { value: '', label: t('assignments.allTeachers') },
                                            ...(options?.teachers ?? []).map((tc) => ({ value: String(tc.id), label: tc.name })),
                                        ]}
                                    />
                                )}

                                <SelectMenu
                                    value={dueStatus}
                                    onChange={(v) => resetTo(setDueStatus)(v as '' | 'overdue' | 'upcoming')}
                                    label={t('assignments.due')}
                                    options={[
                                        { value: '', label: t('assignments.allDates') },
                                        { value: 'upcoming', label: t('assignments.upcoming') },
                                        { value: 'overdue', label: t('assignments.overdue') },
                                    ]}
                                />

                                <ViewToggle value={view} onChange={setView} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm px-1">
                        <p className="font-bold text-slate-400">
                            {t('assignments.total')} <span className="text-slate-900">{totalCount}</span>
                            {isFetching && <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin text-slate-300" />}
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

                    <div className={cn('grid gap-6', selectedAssignment ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1')}>
                        <div className="min-w-0 space-y-4">
                            {isLoading ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="font-bold text-slate-400">
                                        {hasFilters ? t('assignments.noMatches') : t('assignments.noAssignments')}
                                    </p>
                                    {hasFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="mt-3 text-sm font-bold text-brand hover:underline"
                                        >
                                            {t('common.clearFilters')}
                                        </button>
                                    )}
                                </div>
                            ) : view === 'table' ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[820px]">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <Th k="title">{t('assignments.assignment')}</Th>
                                                    <Th k="class">{t('assignments.class')}</Th>
                                                    <Th k="subject">{t('assignments.subject')}</Th>
                                                    {showTeacherFilter && <Th k="teacher">{t('assignments.teacher')}</Th>}
                                                    <Th k="due_date">{t('assignments.dueDate')}</Th>
                                                    <Th align="right">{t('assignments.progress')}</Th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {assignments.map((a) => (
                                                    <tr
                                                        key={a.id}
                                                        onClick={() => setSelectedAssignment(selectedAssignment?.id === a.id ? null : a)}
                                                        className={cn(
                                                            'cursor-pointer transition-colors',
                                                            selectedAssignment?.id === a.id ? 'bg-brand/5' : 'hover:bg-slate-50/70',
                                                        )}
                                                    >
                                                        <td className="px-4 py-3 max-w-[280px]">
                                                            <p className="font-bold text-slate-800 truncate">{a.title}</p>
                                                            {a.description && (
                                                                <p className="text-xs text-slate-400 font-medium truncate">{a.description}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap"><Meta a={a} /></td>
                                                        <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                            {a.subject_name ?? '—'}
                                                        </td>
                                                        {showTeacherFilter && (
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap max-w-[160px] truncate">
                                                                {a.teacher_name ?? '—'}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={cn(
                                                                'text-sm font-medium',
                                                                isOverdue(a.due_date) ? 'text-red-500' : 'text-slate-600',
                                                            )}>
                                                                {df.date(a.due_date)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3"><Progress a={a} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {assignments.map((a) => (
                                        <button
                                            key={a.id}
                                            onClick={() => setSelectedAssignment(selectedAssignment?.id === a.id ? null : a)}
                                            className={cn(
                                                'w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-left hover:shadow-md transition-all',
                                                selectedAssignment?.id === a.id && 'border-brand/30 ring-2 ring-brand/10',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center text-brand shrink-0">
                                                        <BookOpen className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 truncate">{a.title}</p>
                                                        <p className="text-xs font-bold text-slate-400 mt-0.5">
                                                            <Meta a={a} />
                                                            {a.subject_name ? ' · ' + a.subject_name : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    'text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0',
                                                    isOverdue(a.due_date) ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600',
                                                )}>
                                                    {isOverdue(a.due_date) ? t('assignments.overdue') : t('assignments.due')}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {df.date(a.due_date)}
                                                </span>
                                                <Progress a={a} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                pageSize={PAGE_SIZE}
                                onChange={setPage}
                            />
                        </div>

                        {/* Submissions panel */}
                        {selectedAssignment && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden self-start xl:sticky xl:top-4">
                                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate">{selectedAssignment.title}</h3>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {selectedAssignment.class_name}
                                            {selectedAssignment.subject_name ? ' · ' + selectedAssignment.subject_name : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedAssignment(null)}
                                        aria-label={t('common.close')}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {!submissionsData ? (
                                    <div className="p-8 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                                    </div>
                                ) : submissionsData.submissions.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-slate-400">{t('assignments.noSubmissions')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto">
                                        {submissionsData.submissions.map((sub) => (
                                            <div key={sub.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 truncate">
                                                        {sub.student_name || t('assignments.unnamedStudent')}
                                                    </p>
                                                    {sub.admission_no && (
                                                        <p className="text-[11px] font-mono text-slate-400">{sub.admission_no}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {sub.grade && (
                                                        <span className="text-xs font-black text-brand">{sub.grade}</span>
                                                    )}
                                                    <span className={cn(
                                                        'text-xs font-bold px-2.5 py-1 rounded-lg',
                                                        STATUS_CONFIG[sub.status].color,
                                                    )}>
                                                        {t(STATUS_CONFIG[sub.status].labelKey)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AssignmentsPage;
