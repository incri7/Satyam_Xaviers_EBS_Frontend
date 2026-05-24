import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { attendanceService, type AttendanceStatus } from '../../api/services/attendance.service';
import { enqueueAttendance } from '../../lib/offlineQueue';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { CheckCircle2, XCircle, Clock, ChevronDown, Save, Users, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; icon: React.ReactNode }[] = [
    { value: 'P', label: 'Present', color: 'bg-emerald-100 text-emerald-700 ring-emerald-200', icon: <CheckCircle2 className="w-4 h-4" /> },
    { value: 'A', label: 'Absent', color: 'bg-red-100 text-red-700 ring-red-200', icon: <XCircle className="w-4 h-4" /> },
    { value: 'L', label: 'Late', color: 'bg-amber-100 text-amber-700 ring-amber-200', icon: <Clock className="w-4 h-4" /> },
    { value: 'HD', label: 'Half Day', color: 'bg-blue-100 text-blue-700 ring-blue-200', icon: <Clock className="w-4 h-4" /> },
];

const AttendancePage: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(today);
    const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const { pendingCount } = useOfflineSync();
    const isOnline = navigator.onLine;

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', selectedClassId],
        queryFn: () => academicsService.getSections({ class_id: Number(selectedClassId), limit: 100 }),
        enabled: !!selectedClassId,
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', 'enrollment', selectedSectionId || selectedClassId],
        queryFn: () => peopleService.getStudents({ limit: 100 }),
        enabled: !!selectedClassId,
    });

    const students = studentsData?.students || [];

    const setAllStatus = useCallback((status: AttendanceStatus) => {
        const all: Record<number, AttendanceStatus> = {};
        students.forEach((s: any) => { all[s.id] = status; });
        setStatusMap(all);
    }, [students]);

    const submitMutation = useMutation({
        mutationFn: attendanceService.bulkCreateAttendance,
        onSuccess: () => {
            setSuccessMessage(`Attendance saved for ${Object.keys(statusMap).length} students`);
            setErrorMessage('');
            setTimeout(() => setSuccessMessage(''), 4000);
        },
        onError: (err: any) => {
            setErrorMessage(err.response?.data?.detail || 'Failed to save attendance');
        },
    });

    const handleSubmit = async () => {
        if (!selectedClassId) return setErrorMessage('Please select a class');
        if (Object.keys(statusMap).length === 0) return setErrorMessage('Please mark at least one student');

        const records = Object.entries(statusMap).map(([student_id, status]) => ({
            student_id: Number(student_id),
            date: attendanceDate,
            status,
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
        }));

        if (!isOnline) {
            await enqueueAttendance(records);
            setSuccessMessage('Saved offline. Will sync when connected.');
            setErrorMessage('');
            setTimeout(() => setSuccessMessage(''), 4000);
            return;
        }

        submitMutation.mutate(records);
    };

    const markedCount = Object.keys(statusMap).length;
    const absentCount = Object.values(statusMap).filter(s => s === 'A').length;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Offline / pending sync banner */}
                    {(!isOnline || pendingCount > 0) && (
                        <div className={cn(
                            "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border",
                            !isOnline
                                ? "bg-amber-50 border-amber-100 text-amber-700"
                                : "bg-blue-50 border-blue-100 text-blue-700"
                        )}>
                            <WifiOff className="w-5 h-5 shrink-0" />
                            {!isOnline
                                ? "You're offline. Attendance will be saved locally and synced when you reconnect."
                                : `${pendingCount} attendance record${pendingCount > 1 ? 's' : ''} pending sync.`}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>
                            <p className="text-slate-500 text-sm font-medium">
                                {markedCount} / {students.length} marked
                                {absentCount > 0 && ` · ${absentCount} absent`}
                            </p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending || markedCount === 0}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all disabled:opacity-50"
                        >
                            {submitMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            <span>Save Attendance</span>
                        </button>
                    </div>

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {errorMessage}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Class</label>
                                <div className="relative">
                                    <select
                                        value={selectedClassId}
                                        onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); setStatusMap({}); }}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                    >
                                        <option value="">Select class</option>
                                        {classesData?.classes.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Section</label>
                                <div className="relative">
                                    <select
                                        value={selectedSectionId}
                                        onChange={e => { setSelectedSectionId(e.target.value); setStatusMap({}); }}
                                        disabled={!selectedClassId}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                    >
                                        <option value="">All sections</option>
                                        {sectionsData?.sections.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
                                <input
                                    type="date"
                                    value={attendanceDate}
                                    max={today}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                />
                            </div>
                        </div>

                        {students.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-2">Mark all:</span>
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setAllStatus(opt.value)}
                                        className={cn('px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all', opt.color)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {students.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between text-sm font-bold mb-2">
                                <span className="text-slate-700">Progress</span>
                                <span className="text-brand">{markedCount} / {students.length}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand rounded-full transition-all duration-300"
                                    style={{ width: students.length ? `${(markedCount / students.length) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Student list */}
                    {loadingStudents ? (
                        <div className="grid grid-cols-1 gap-2">
                            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                        </div>
                    ) : !selectedClassId ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">Select a class to load students</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">No students found for this class</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {students.map((student: any, index: number) => {
                                const currentStatus = statusMap[student.id];
                                return (
                                    <div
                                        key={student.id}
                                        className={cn(
                                            "bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm flex items-center justify-between gap-4 transition-all",
                                            currentStatus === 'A' && 'border-red-200 bg-red-50/30',
                                            currentStatus === 'P' && 'border-emerald-200 bg-emerald-50/20',
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">
                                                    {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                                                </p>
                                                <p className="text-[11px] font-medium text-slate-400">{student.admission_no}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-1.5 shrink-0">
                                            {STATUS_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setStatusMap(prev => ({ ...prev, [student.id]: opt.value }))}
                                                    className={cn(
                                                        'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ring-1 ring-transparent',
                                                        currentStatus === opt.value
                                                            ? opt.color + ' ring-offset-0 scale-[1.05]'
                                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                    )}
                                                >
                                                    {opt.icon}
                                                    <span className="hidden sm:inline">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AttendancePage;
