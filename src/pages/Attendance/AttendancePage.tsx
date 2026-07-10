import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { attendanceService, type AttendanceStatus } from '../../api/services/attendance.service';
import { enqueueAttendance } from '../../lib/offlineQueue';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../store/useAuthStore';
import { CheckCircle2, XCircle, Clock, ChevronDown, Save, Users, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

const AttendancePage: React.FC = () => {
    const { t } = useTranslation();
    const today = new Date().toISOString().split('T')[0];

    const STATUS_OPTIONS: { value: AttendanceStatus; labelKey: string; color: string; icon: React.ReactNode }[] = [
        { value: 'P', labelKey: 'attendance.present', color: 'bg-emerald-100 text-emerald-700 ring-emerald-200', icon: <CheckCircle2 className="w-4 h-4" /> },
        { value: 'A', labelKey: 'attendance.absent', color: 'bg-red-100 text-red-700 ring-red-200', icon: <XCircle className="w-4 h-4" /> },
        { value: 'L', labelKey: 'attendance.late', color: 'bg-amber-100 text-amber-700 ring-amber-200', icon: <Clock className="w-4 h-4" /> },
        { value: 'HD', labelKey: 'attendance.halfDay', color: 'bg-blue-100 text-blue-700 ring-blue-200', icon: <Clock className="w-4 h-4" /> },
    ];

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(today);
    const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [viewMode, setViewMode] = useState<'mark' | 'history'>('mark');
    const weekAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const [historyStart, setHistoryStart] = useState(weekAgo);
    const [historyEnd, setHistoryEnd] = useState(today);

    const { pendingCount } = useOfflineSync();
    const isOnline = navigator.onLine;

    const { user } = useAuthStore();
    const isTeacher = user?.role === 'teacher';

    // Class teachers land directly on their own roster — no dropdowns to fumble
    const { data: mySections } = useQuery({
        queryKey: ['my-sections'],
        queryFn: academicsService.getMySections,
        enabled: isTeacher,
    });
    const lockedToOwnSection = isTeacher && (mySections?.length ?? 0) > 0;
    useEffect(() => {
        if (lockedToOwnSection && !selectedClassId && mySections![0]) {
            setSelectedClassId(String(mySections![0].class_id));
            setSelectedSectionId(String(mySections![0].section_id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mySections, lockedToOwnSection]);

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        enabled: !lockedToOwnSection,
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', selectedClassId],
        queryFn: () => academicsService.getSections({ class_id: Number(selectedClassId), limit: 100 }),
        enabled: !!selectedClassId && !lockedToOwnSection,
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', 'enrollment', selectedClassId, selectedSectionId],
        queryFn: () => peopleService.getStudents({
            limit: 100,
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
        }),
        enabled: !!selectedClassId,
    });

    const students = studentsData?.students || [];

    // Attendance history (record view) for the selected class/section
    const { data: historyData, isLoading: loadingHistory } = useQuery({
        queryKey: ['attendance-history', selectedClassId, selectedSectionId, historyStart, historyEnd],
        queryFn: () => attendanceService.getAttendances({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            start_date: historyStart,
            end_date: historyEnd,
            limit: 100,
        }),
        enabled: viewMode === 'history' && !!selectedClassId,
    });

    const studentNameById: Record<number, string> = {};
    students.forEach((s: any) => {
        studentNameById[s.id] = `${s.first_name} ${s.last_name || ''}`.trim();
    });

    const historyByDate: Record<string, any[]> = {};
    (historyData?.attendances || []).forEach((rec: any) => {
        const d = String(rec.date);
        (historyByDate[d] = historyByDate[d] || []).push(rec);
    });
    const historyDates = Object.keys(historyByDate).sort().reverse();

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
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
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
                                ? t('attendance.offlineWarning')
                                : `${pendingCount} ${t('attendance.pendingSync')}`}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{t('attendance.title')}</h1>
                            {viewMode === 'mark' && (
                                <p className="text-slate-500 text-sm font-medium">
                                    {markedCount} / {students.length} {t('attendance.marked')}
                                    {absentCount > 0 && ` · ${absentCount} ${t('attendance.absent')}`}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex p-1 bg-slate-100 rounded-2xl">
                                <button
                                    onClick={() => setViewMode('mark')}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                                        viewMode === 'mark' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >
                                    {t('attendance.markMode', 'Mark')}
                                </button>
                                <button
                                    onClick={() => setViewMode('history')}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                                        viewMode === 'history' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >
                                    {t('attendance.historyMode', 'History')}
                                </button>
                            </div>
                            {viewMode === 'mark' && (
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
                                    <span>{t('attendance.saveAttendance')}</span>
                                </button>
                            )}
                        </div>
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
                            {lockedToOwnSection ? (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.myClass', 'My Class')}</label>
                                    {mySections!.length === 1 ? (
                                        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800">
                                            {mySections![0].class_name} — {t('attendance.section')} {mySections![0].section_name}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <select
                                                value={selectedSectionId}
                                                onChange={e => {
                                                    const sec = mySections!.find(s => String(s.section_id) === e.target.value);
                                                    if (sec) {
                                                        setSelectedClassId(String(sec.class_id));
                                                        setSelectedSectionId(String(sec.section_id));
                                                        setStatusMap({});
                                                    }
                                                }}
                                                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                            >
                                                {mySections!.map(s => (
                                                    <option key={s.section_id} value={s.section_id}>{s.class_name} — {s.section_name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.class')}</label>
                                        <div className="relative">
                                            <select
                                                value={selectedClassId}
                                                onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); setStatusMap({}); }}
                                                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                            >
                                                <option value="">{t('attendance.selectClass')}</option>
                                                {classesData?.classes.map((c: any) => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.section')}</label>
                                        <div className="relative">
                                            <select
                                                value={selectedSectionId}
                                                onChange={e => { setSelectedSectionId(e.target.value); setStatusMap({}); }}
                                                disabled={!selectedClassId}
                                                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                            >
                                                <option value="">{t('attendance.allSections')}</option>
                                                {sectionsData?.sections.map((s: any) => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {viewMode === 'mark' ? (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.date')}</label>
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        max={today}
                                        onChange={e => setAttendanceDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.dateRange', 'Date range')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={historyStart}
                                            max={historyEnd}
                                            onChange={e => setHistoryStart(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                        />
                                        <span className="text-slate-300 font-bold">→</span>
                                        <input
                                            type="date"
                                            value={historyEnd}
                                            min={historyStart}
                                            max={today}
                                            onChange={e => setHistoryEnd(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode === 'mark' && students.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-2">{t('attendance.markAll')}</span>
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setAllStatus(opt.value)}
                                        className={cn('px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all', opt.color)}
                                    >
                                        {t(opt.labelKey)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {viewMode === 'mark' && students.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between text-sm font-bold mb-2">
                                <span className="text-slate-700">{t('attendance.progress')}</span>
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

                    {/* History view */}
                    {viewMode === 'history' && (
                        !selectedClassId ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">{t('attendance.selectClassPrompt')}</p>
                            </div>
                        ) : loadingHistory ? (
                            <div className="grid grid-cols-1 gap-2">
                                {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                            </div>
                        ) : historyDates.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">{t('attendance.noHistory', 'No attendance records in this range.')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historyDates.map(d => {
                                    const recs = historyByDate[d];
                                    const present = recs.filter(r => ['P', 'L', 'HD'].includes(r.status)).length;
                                    return (
                                        <div key={d} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">
                                                    {present}/{recs.length} {t('attendance.present')}
                                                </span>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {recs.map((rec: any) => {
                                                    const opt = STATUS_OPTIONS.find(o => o.value === rec.status);
                                                    return (
                                                        <div key={rec.id} className="px-5 py-2.5 flex items-center justify-between">
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {studentNameById[rec.student_id] || `Student #${rec.student_id}`}
                                                            </span>
                                                            <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-transparent', opt?.color)}>
                                                                {opt?.icon}
                                                                {opt ? t(opt.labelKey) : rec.status}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* Student list (mark mode) */}
                    {viewMode === 'history' ? null : loadingStudents ? (
                        <div className="grid grid-cols-1 gap-2">
                            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                        </div>
                    ) : !selectedClassId ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">{t('attendance.selectClassPrompt')}</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">{t('attendance.noStudentsFound')}</p>
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
                                                    <span className="hidden sm:inline">{t(opt.labelKey)}</span>
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
