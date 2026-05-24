import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { assignmentsService, type Assignment, type SubmissionStatus } from '../../api/services/assignments.service';
import { academicsService } from '../../api/services/academics.service';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Plus, BookOpen, Calendar, ChevronDown, X, CheckCircle2,
    AlertCircle, Loader2, Users, ClipboardList
} from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-slate-100 text-slate-500' },
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    graded: { label: 'Graded', color: 'bg-emerald-100 text-emerald-700' },
    missing: { label: 'Missing', color: 'bg-red-100 text-red-600' },
};

const CreateAssignmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        title: '', description: '', class_id: '', section_id: '',
        subject_id: '', due_date: '', teacher_id: '',
    });
    const [error, setError] = useState('');

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', form.class_id],
        queryFn: () => academicsService.getSections({ class_id: Number(form.class_id), limit: 100 }),
        enabled: !!form.class_id,
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
        if (!form.subject_id) return setError('Subject ID is required');
        if (!form.due_date) return setError('Due date is required');
        if (!form.teacher_id) return setError('Teacher ID is required');
        mutation.mutate({
            title: form.title,
            description: form.description || undefined,
            class_id: Number(form.class_id),
            section_id: Number(form.section_id),
            subject_id: Number(form.subject_id),
            due_date: form.due_date,
            teacher_id: Number(form.teacher_id),
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
                        <h2 className="text-xl font-bold text-slate-900">New Assignment</h2>
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
                        <label className="text-sm font-bold text-slate-700">Title</label>
                        <input
                            type="text" value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="Assignment title"
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Description (optional)</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            placeholder="Instructions for students..."
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Class</label>
                            <div className="relative">
                                <select
                                    value={form.class_id}
                                    onChange={e => setForm(p => ({ ...p, class_id: e.target.value, section_id: '' }))}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">Select</option>
                                    {classesData?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Section</label>
                            <div className="relative">
                                <select
                                    value={form.section_id}
                                    onChange={e => setForm(p => ({ ...p, section_id: e.target.value }))}
                                    disabled={!form.class_id}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                >
                                    <option value="">Select</option>
                                    {sectionsData?.sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Subject ID</label>
                            <input
                                type="number" value={form.subject_id}
                                onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                                placeholder="e.g. 3"
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Teacher ID</label>
                            <input
                                type="number" value={form.teacher_id}
                                onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))}
                                placeholder="e.g. 1"
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Due Date</label>
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
                        Create Assignment
                    </button>
                </form>
            </div>
        </div>
    );
};

const AssignmentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

    const canCreate = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'principal';

    const { data: assignmentsData, isLoading } = useQuery({
        queryKey: ['assignments'],
        queryFn: () => assignmentsService.listAssignments(),
    });

    const { data: submissionsData } = useQuery({
        queryKey: ['submissions', selectedAssignment?.id],
        queryFn: () => assignmentsService.listSubmissions(selectedAssignment!.id),
        enabled: !!selectedAssignment,
    });

    const assignments = assignmentsData?.assignments || [];

    const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                {isCreateOpen && <CreateAssignmentModal onClose={() => setIsCreateOpen(false)} />}

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
                            <p className="text-slate-500 text-sm font-medium">{assignments.length} total</p>
                        </div>
                        {canCreate && (
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                New Assignment
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assignment list */}
                        <div className="space-y-3">
                            {isLoading ? (
                                [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />)
                            ) : assignments.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="font-bold text-slate-400">No assignments yet</p>
                                </div>
                            ) : (
                                assignments.map(assignment => (
                                    <button
                                        key={assignment.id}
                                        onClick={() => setSelectedAssignment(
                                            selectedAssignment?.id === assignment.id ? null : assignment
                                        )}
                                        className={cn(
                                            'w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-left hover:shadow-md transition-all',
                                            selectedAssignment?.id === assignment.id && 'border-brand/30 ring-2 ring-brand/10'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center text-brand shrink-0">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{assignment.title}</p>
                                                    {assignment.description && (
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{assignment.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={cn(
                                                'text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0',
                                                isOverdue(assignment.due_date) ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                                            )}>
                                                {isOverdue(assignment.due_date) ? 'Overdue' : 'Due'}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span>Class {assignment.class_id} · Section {assignment.section_id}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Submissions panel */}
                        {selectedAssignment && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900">{selectedAssignment.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium">Submissions</p>
                                </div>
                                {submissionsData?.submissions.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-slate-400">No submissions yet</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {(submissionsData?.submissions || []).map(sub => (
                                            <div key={sub.id} className="flex items-center justify-between px-5 py-3">
                                                <span className="text-sm font-bold text-slate-700">Student #{sub.student_id}</span>
                                                <div className="flex items-center gap-2">
                                                    {sub.grade && (
                                                        <span className="text-xs font-black text-brand">{sub.grade}</span>
                                                    )}
                                                    <span className={cn(
                                                        'text-xs font-bold px-2.5 py-1 rounded-lg',
                                                        STATUS_CONFIG[sub.status].color
                                                    )}>
                                                        {STATUS_CONFIG[sub.status].label}
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
