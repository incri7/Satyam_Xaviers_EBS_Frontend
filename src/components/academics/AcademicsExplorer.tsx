import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService, type ClassSubjectRow, type ClassDetail } from '../../api/services/academics.service';
import {
    BookOpen, Layers, BookMarked, Users as UsersIcon, ChevronRight, ArrowLeft,
    Search, Loader2, Microscope, Pencil, X, Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AccessControl } from '../AccessControl';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { useDateFormat } from '../../hooks/useDateFormat';
import { cn } from '../../utils/cn';
import type { Class } from '../../types/academic';

type View =
    | { level: 'classes' }
    | { level: 'class'; classId: number; className: string }
    | { level: 'section'; classId: number; className: string; sectionId: number; sectionName: string };

const capacityTone = (enrolled: number, cap: number | null) => {
    const c = cap || 0;
    const r = c > 0 ? enrolled / c : 0;
    if (c > 0 && enrolled >= c) return { bar: 'bg-red-500', text: 'text-red-600' };
    if (r >= 0.75) return { bar: 'bg-amber-500', text: 'text-amber-600' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
};

export const AcademicsExplorer: React.FC = () => {
    const [view, setView] = useState<View>({ level: 'classes' });

    return (
        <div className="space-y-4">
            {view.level === 'classes' && <ClassList onOpen={(c) => setView({ level: 'class', classId: c.id, className: c.name })} />}
            {view.level === 'class' && (
                <ClassView
                    classId={view.classId}
                    className={view.className}
                    onBack={() => setView({ level: 'classes' })}
                    onOpenSection={(sid, sname) => setView({ level: 'section', classId: view.classId, className: view.className, sectionId: sid, sectionName: sname })}
                />
            )}
            {view.level === 'section' && (
                <SectionView
                    classId={view.classId}
                    className={view.className}
                    sectionId={view.sectionId}
                    sectionName={view.sectionName}
                    onBack={() => setView({ level: 'class', classId: view.classId, className: view.className })}
                    onSwitch={(classId, className, sectionId, sectionName) =>
                        setView({ level: 'section', classId, className, sectionId, sectionName })
                    }
                />
            )}
        </div>
    );
};

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const Crumb: React.FC<{ onBack: () => void; trail: string[] }> = ({ onBack, trail }) => (
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {trail.join('  ›  ')}
    </button>
);

// ── Level 1: classes ────────────────────────────────────────────────────────
const ClassList: React.FC<{ onOpen: (c: Class) => void }> = ({ onOpen }) => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [view, setView] = useViewMode('academics_classes_view');
    const [search, setSearch] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['classes', search],
        queryFn: () => academicsService.getClasses({ search, limit: 100 }),
    });
    const classes = (data?.classes || []) as Class[];

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('academics.searchClasses')}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                    />
                </div>
                <ViewToggle value={view} onChange={setView} />
            </div>

            {classes.length === 0 && !isLoading ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center space-y-2">
                    <p className="font-bold text-slate-900">
                        {search ? t('academics.noClassesMatch') : t('academics.noClassesYet')}
                    </p>
                    <p className="text-slate-500 text-sm">
                        {search ? t('academics.noClassesMatchHint') : t('academics.noClassesYetHint')}
                    </p>
                </div>
            ) : view === 'table' ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('academics.class')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('academics.created')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading
                                    ? [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="px-6 py-6 bg-slate-50/20" />
                                        </tr>
                                    ))
                                    : classes.map(c => (
                                        <tr
                                            key={c.id}
                                            onClick={() => onOpen(c)}
                                            tabIndex={0}
                                            role="button"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onOpen(c);
                                                }
                                            }}
                                            className="group cursor-pointer hover:bg-slate-50/60 focus:bg-slate-50/60 focus:outline-none transition-colors"
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {/* Same brand glyph the cards use, so switching
                                                        views doesn't feel like a different product. */}
                                                    <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                                                        <BookOpen className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900 whitespace-nowrap">{c.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500 whitespace-nowrap">
                                                {df.date(c.created_at)}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-400 group-hover:text-brand transition-colors whitespace-nowrap">
                                                    {t('academics.openClass')}
                                                    <ChevronRight className="w-4 h-4" />
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((c, i) => (
                        <motion.button
                            key={c.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            onClick={() => onOpen(c)}
                            className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:border-brand/20 transition-all text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-900">{c.name}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

type SectionRow = ClassDetail['sections'][number];

// ── Level 2: one class → its sections + subject count ──────────────────────────
const ClassView: React.FC<{
    classId: number; className: string; onBack: () => void;
    onOpenSection: (sectionId: number, sectionName: string) => void;
}> = ({ classId, className, onBack, onOpenSection }) => {
    const queryClient = useQueryClient();
    const [assignCT, setAssignCT] = useState<SectionRow | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['class-detail', classId],
        queryFn: () => academicsService.getClassDetail(classId),
    });
    const classTeachers = data?.teachers || [];

    const setClassTeacher = useMutation({
        mutationFn: ({ sectionId, teacherId }: { sectionId: number; teacherId: number | null }) =>
            academicsService.updateSection(sectionId, { class_teacher_id: teacherId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
            setAssignCT(null);
        },
    });

    return (
        <div className="space-y-4">
            <Crumb onBack={onBack} trail={['Classes', className]} />
            <h2 className="text-xl font-bold text-slate-900">{className}</h2>

            {isLoading ? (
                <div className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ) : (
                <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Sections
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(data?.sections || []).map(s => {
                            const tone = capacityTone(s.enrolled_count, s.capacity);
                            return (
                                <div
                                    key={s.id}
                                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
                                >
                                    <button
                                        onClick={() => onOpenSection(s.id, s.name)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                                                    <Layers className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{s.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        Class teacher: {s.class_teacher_name || 'Not assigned'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span className={cn('text-sm font-bold', tone.text)}>{s.enrolled_count}/{s.capacity || '—'}</span>
                                            {s.capacity ? (
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                    <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min((s.enrolled_count / s.capacity) * 100, 100)}%` }} />
                                                </div>
                                            ) : null}
                                        </div>
                                    </button>
                                    <AccessControl id="sections_update">
                                        <button
                                            onClick={() => setAssignCT(s)}
                                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                                        >
                                            <Microscope className="w-3.5 h-3.5" />
                                            {s.class_teacher_name ? 'Change class teacher' : 'Assign class teacher'}
                                        </button>
                                    </AccessControl>
                                </div>
                            );
                        })}
                        {(data?.sections || []).length === 0 && (
                            <div className="col-span-full py-8 text-center text-slate-400 text-sm font-medium">
                                No sections in this class yet.
                            </div>
                        )}
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 mt-2">
                        <BookMarked className="w-5 h-5 text-indigo-600 shrink-0" />
                        <p className="text-sm font-medium text-indigo-900">
                            {data?.subject_count ?? 0} subjects taught in {className}. Open a section to view them and their teachers.
                        </p>
                    </div>
                </>
            )}

            {/* Assign class teacher modal */}
            {assignCT && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setAssignCT(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Class teacher for {className} — {assignCT.name}</h3>
                            <button onClick={() => setAssignCT(null)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            Only teachers who teach a subject in {className} are shown.
                        </p>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => setClassTeacher.mutate({ sectionId: assignCT.id, teacherId: null })}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-500 hover:bg-slate-100"
                            >
                                — No class teacher —
                            </button>
                            {classTeachers.map(tch => (
                                <button
                                    key={tch.id}
                                    onClick={() => setClassTeacher.mutate({ sectionId: assignCT.id, teacherId: tch.id })}
                                    className={cn(
                                        'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                        assignCT.class_teacher_id === tch.id ? 'bg-brand/5 text-brand' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    )}
                                >
                                    <span>{tch.name}{tch.subjects.length ? <span className="text-xs text-slate-400"> · {tch.subjects.join(', ')}</span> : ''}</span>
                                    {assignCT.class_teacher_id === tch.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                            {classTeachers.length === 0 && (
                                <p className="text-xs text-slate-400 py-2 text-center">No teachers assigned to any subject in this class yet. Assign subject teachers first.</p>
                            )}
                        </div>
                        {setClassTeacher.isPending && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Level 3: one section → subjects (of its class) + teacher each ──────────────
const SectionView: React.FC<{
    classId: number; className: string; sectionId: number; sectionName: string;
    onBack: () => void;
    onSwitch: (classId: number, className: string, sectionId: number, sectionName: string) => void;
}> = ({ classId, className, sectionId, sectionName, onBack, onSwitch }) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [managing, setManaging] = useState(false);
    const [assigningFor, setAssigningFor] = useState<ClassSubjectRow | null>(null);

    const { data: subjects, isLoading } = useQuery({
        queryKey: ['class-subjects', classId],
        queryFn: () => academicsService.getClassSubjects(classId),
    });
    const { data: allClasses } = useQuery({
        queryKey: ['classes', 'all'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: classDetail } = useQuery({
        queryKey: ['class-detail', classId],
        queryFn: () => academicsService.getClassDetail(classId),
    });
    const sections = classDetail?.sections || [];

    // Switching class lands on that class's first section, so the page is
    // never left pointing at a section that belongs to a different class.
    const switchClass = (id: string) => {
        const target = (allClasses?.classes || []).find((c) => String(c.id) === id);
        if (!target || target.id === classId) return;
        academicsService.getClassDetail(target.id).then((d) => {
            const first = d.sections?.[0];
            onSwitch(target.id, target.name, first?.id ?? 0, first?.name ?? '—');
        });
    };

    const switchSection = (id: string) => {
        const target = sections.find((sec) => String(sec.id) === id);
        if (target) onSwitch(classId, className, target.id, target.name);
    };
    const { data: allSubjects } = useQuery({
        queryKey: ['subjects', 'all'],
        queryFn: () => academicsService.getSubjects(),
        enabled: managing,
    });
    const { data: teacherOptions } = useQuery({
        queryKey: ['teacher-options'],
        queryFn: academicsService.getTeacherOptions,
        enabled: !!assigningFor,
    });

    const setSubjectsMut = useMutation({
        mutationFn: (ids: number[]) => academicsService.setClassSubjects(classId, ids),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['class-subjects', classId] }); queryClient.invalidateQueries({ queryKey: ['class-detail', classId] }); setManaging(false); },
    });
    const setTeacherMut = useMutation({
        mutationFn: ({ csId, tId }: { csId: number; tId: number | null }) => academicsService.setClassSubjectTeacher(csId, tId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['class-subjects', classId] }); setAssigningFor(null); },
    });

    const currentIds = new Set((subjects || []).map(s => s.subject_id));

    return (
        <div className="space-y-4">
            <Crumb onBack={onBack} trail={['Classes', className, `Section ${sectionName}`]} />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <SelectMenu
                        value={String(classId)}
                        onChange={switchClass}
                        label={t('academics.class')}
                        icon={<BookOpen className="w-4 h-4 text-slate-400 shrink-0" />}
                        options={(allClasses?.classes || []).map((c) => ({
                            value: String(c.id),
                            label: c.name,
                        }))}
                    />
                    <SelectMenu
                        value={String(sectionId)}
                        onChange={switchSection}
                        label={t('academics.section')}
                        icon={<Layers className="w-4 h-4 text-slate-400 shrink-0" />}
                        options={sections.map((sec) => ({
                            value: String(sec.id),
                            label: sec.name,
                        }))}
                    />
                </div>
                <AccessControl id="classes_update">
                    <button
                        onClick={() => setManaging(v => !v)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                        <Pencil className="w-4 h-4" /> Manage subjects
                    </button>
                </AccessControl>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5" /> Subjects & teachers
            </p>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                </div>
            ) : (subjects || []).length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm font-medium">
                    No subjects set for this class. Use "Manage subjects" to add them.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects!.map(cs => (
                        <div key={cs.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                    <BookMarked className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{cs.subject_name}</p>
                                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1 truncate">
                                        <Microscope className="w-3 h-3 shrink-0" />
                                        {cs.teacher_name || 'No teacher assigned'}
                                    </p>
                                </div>
                            </div>
                            <AccessControl id="classes_update">
                                <button
                                    onClick={() => setAssigningFor(cs)}
                                    className="text-xs font-bold text-brand hover:underline shrink-0"
                                >
                                    {cs.teacher_name ? 'Change' : 'Assign'}
                                </button>
                            </AccessControl>
                        </div>
                    ))}
                </div>
            )}

            {/* Manage subjects modal */}
            {managing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setManaging(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Subjects in {className}</h3>
                            <button onClick={() => setManaging(false)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Tick the subjects this class teaches.</p>
                        <div className="space-y-1.5">
                            {(allSubjects || []).map(s => {
                                const on = currentIds.has(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            const next = new Set(currentIds);
                                            on ? next.delete(s.id) : next.add(s.id);
                                            // optimistic local set via immediate mutation on confirm instead:
                                            setSubjectsMut.mutate(Array.from(next));
                                        }}
                                        className={cn(
                                            'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                            on ? 'bg-brand/5 text-brand' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        )}
                                    >
                                        {s.name}
                                        {on && <Check className="w-4 h-4" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign teacher modal */}
            {assigningFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setAssigningFor(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Teacher for {assigningFor.subject_name}</h3>
                            <button onClick={() => setAssigningFor(null)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => setTeacherMut.mutate({ csId: assigningFor.id, tId: null })}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-500 hover:bg-slate-100"
                            >
                                — No teacher —
                            </button>
                            {(teacherOptions || []).map(tch => (
                                <button
                                    key={tch.id}
                                    onClick={() => setTeacherMut.mutate({ csId: assigningFor.id, tId: tch.id })}
                                    className={cn(
                                        'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                        assigningFor.teacher_id === tch.id ? 'bg-brand/5 text-brand' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    )}
                                >
                                    <span>{tch.name}{tch.subjects.length ? <span className="text-xs text-slate-400"> · {tch.subjects.map(s => s.name).join(', ')}</span> : ''}</span>
                                    {assigningFor.teacher_id === tch.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                            {(teacherOptions || []).length === 0 && (
                                <p className="text-xs text-slate-400 py-2 text-center">No teachers registered yet.</p>
                            )}
                        </div>
                        {setTeacherMut.isPending && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>}
                    </div>
                </div>
            )}
        </div>
    );
};
