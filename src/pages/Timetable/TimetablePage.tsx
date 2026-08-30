import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { academicsService } from '../../api/services/academics.service';
import { timetableService, type TimetableSlot } from '../../api/services/timetable.service';
import { CalendarClock, ChevronDown, Plus, X, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const DAYS = [
    { value: 0, label: 'Mon' },
    { value: 1, label: 'Tue' },
    { value: 2, label: 'Wed' },
    { value: 3, label: 'Thu' },
    { value: 4, label: 'Fri' },
    { value: 5, label: 'Sat' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const SlotEditor: React.FC<{
    classId: number;
    sectionId: number;
    dayOfWeek: number;
    periodNumber: number;
    existing: TimetableSlot | null;
    onClose: () => void;
}> = ({ classId, sectionId, dayOfWeek, periodNumber, existing, onClose }) => {
    const queryClient = useQueryClient();
    const [subjectId, setSubjectId] = useState(existing ? String(existing.subject_id) : '');
    const [teacherId, setTeacherId] = useState(existing?.teacher_id ? String(existing.teacher_id) : '');
    const [error, setError] = useState('');

    const { data: classSubjects } = useQuery({
        queryKey: ['class-subjects', classId],
        queryFn: () => academicsService.getClassSubjects(classId),
    });
    const { data: teacherOptions } = useQuery({
        queryKey: ['teacher-options'],
        queryFn: academicsService.getTeacherOptions,
    });

    // Query key must match the parent's exactly (string sectionId state, not
    // this component's numeric prop) or invalidation silently no-ops.
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['timetable', String(sectionId)] });

    const saveMutation = useMutation({
        mutationFn: () => {
            if (existing) {
                return timetableService.updateSlot(existing.id, {
                    subject_id: Number(subjectId),
                    teacher_id: teacherId ? Number(teacherId) : undefined,
                });
            }
            return timetableService.createSlot({
                class_id: classId, section_id: sectionId,
                day_of_week: dayOfWeek, period_number: periodNumber,
                subject_id: Number(subjectId),
                teacher_id: teacherId ? Number(teacherId) : undefined,
            });
        },
        onSuccess: () => { invalidate(); onClose(); },
        onError: (err: { response?: { data?: { detail?: string } } }) => setError(err.response?.data?.detail || 'Failed to save'),
    });

    const deleteMutation = useMutation({
        mutationFn: () => timetableService.deleteSlot(existing!.id),
        onSuccess: () => { invalidate(); onClose(); },
        onError: (err: { response?: { data?: { detail?: string } } }) => setError(err.response?.data?.detail || 'Failed to delete'),
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                        {DAYS.find(d => d.value === dayOfWeek)?.label} · Period {periodNumber}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </div>
                )}

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Subject</label>
                    <select
                        value={subjectId}
                        onChange={e => {
                            setSubjectId(e.target.value);
                            const cs = (classSubjects || []).find(c => String(c.subject_id) === e.target.value);
                            if (cs?.teacher_id) setTeacherId(String(cs.teacher_id));
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                    >
                        <option value="">Select subject...</option>
                        {(classSubjects || []).map(cs => (
                            <option key={cs.subject_id} value={cs.subject_id}>{cs.subject_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Teacher</label>
                    <select
                        value={teacherId}
                        onChange={e => setTeacherId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                    >
                        <option value="">Unassigned</option>
                        {(teacherOptions || []).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        onClick={() => { setError(''); saveMutation.mutate(); }}
                        disabled={!subjectId || saveMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save
                    </button>
                    {existing && (
                        <button
                            onClick={() => { setError(''); deleteMutation.mutate(); }}
                            disabled={deleteMutation.isPending}
                            className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const TimetablePage: React.FC = () => {
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [editing, setEditing] = useState<{ day: number; period: number; slot: TimetableSlot | null } | null>(null);

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });
    const { data: sectionsData } = useQuery({
        queryKey: ['sections', classId],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: !!classId,
    });
    const { data: slots, isLoading } = useQuery({
        queryKey: ['timetable', sectionId],
        queryFn: () => timetableService.getSlots({ section_id: Number(sectionId) }),
        enabled: !!sectionId,
    });

    const slotAt = (day: number, period: number) =>
        (slots || []).find(s => s.day_of_week === day && s.period_number === period) || null;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <CalendarClock className="w-6 h-6 text-brand" /> Timetable
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">
                            Set which subject and teacher own each period — this is what substitute suggestions check.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Class</label>
                            <div className="relative">
                                <select
                                    value={classId}
                                    onChange={e => { setClassId(e.target.value); setSectionId(''); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">Select class...</option>
                                    {classesData?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Section</label>
                            <div className="relative">
                                <select
                                    value={sectionId}
                                    onChange={e => setSectionId(e.target.value)}
                                    disabled={!classId}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                >
                                    <option value="">Select section...</option>
                                    {sectionsData?.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {!sectionId ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <CalendarClock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">Select a class and section to view its timetable</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                            <table className="w-full text-sm min-w-[720px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Period</th>
                                        {DAYS.map(d => (
                                            <th key={d.value} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{d.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {PERIODS.map(period => (
                                        <tr key={period} className="border-b border-slate-50 last:border-none">
                                            <td className="px-4 py-3 text-xs font-black text-slate-400">{period}</td>
                                            {DAYS.map(d => {
                                                const slot = slotAt(d.value, period);
                                                return (
                                                    <td key={d.value} className="px-2 py-2">
                                                        <button
                                                            onClick={() => setEditing({ day: d.value, period, slot })}
                                                            className={cn(
                                                                'w-full min-h-[52px] rounded-xl px-3 py-2 text-left transition-all',
                                                                slot
                                                                    ? 'bg-brand/5 border border-brand/20 hover:bg-brand/10'
                                                                    : 'border border-dashed border-slate-200 hover:border-brand/40 hover:bg-slate-50 flex items-center justify-center text-slate-300'
                                                            )}
                                                        >
                                                            {slot ? (
                                                                <>
                                                                    <p className="text-xs font-bold text-slate-900 truncate">{slot.subject_name}</p>
                                                                    <p className="text-[11px] text-slate-500 font-medium truncate">{slot.teacher_name || 'Unassigned'}</p>
                                                                </>
                                                            ) : (
                                                                <Plus className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {editing && (
                <SlotEditor
                    classId={Number(classId)}
                    sectionId={Number(sectionId)}
                    dayOfWeek={editing.day}
                    periodNumber={editing.period}
                    existing={editing.slot}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
};

export default TimetablePage;
