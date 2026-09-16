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
import { useDateFormat } from '../../hooks/useDateFormat';
import { useUrlState, useUrlStateBatch } from '../../hooks/useUrlState';
import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { bsMonthStart, weekStart, isoLocal } from '../../utils/nepaliDate';

const AttendancePage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    // Local calendar day, not UTC. toISOString() rolls back a day for any
    // marking done before 05:45 in Nepal, filing it against yesterday.
    const localDay = (d: Date) => {
        const p = (n: number) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    };
    const today = localDay(new Date());

    type Period = 'day' | 'week' | 'month' | 'term' | 'custom';

    const STATUS_OPTIONS: { value: AttendanceStatus; labelKey: string; color: string; icon: React.ReactNode }[] = [
        { value: 'P', labelKey: 'attendance.present', color: 'bg-emerald-100 text-emerald-700 ring-emerald-200', icon: <CheckCircle2 className="w-4 h-4" /> },
        { value: 'A', labelKey: 'attendance.absent', color: 'bg-red-100 text-red-700 ring-red-200', icon: <XCircle className="w-4 h-4" /> },
        { value: 'L', labelKey: 'attendance.late', color: 'bg-amber-100 text-amber-700 ring-amber-200', icon: <Clock className="w-4 h-4" /> },
        { value: 'HD', labelKey: 'attendance.halfDay', color: 'bg-blue-100 text-blue-700 ring-blue-200', icon: <Clock className="w-4 h-4" /> },
    ];

    const weekAgo = localDay(new Date(Date.now() - 6 * 24 * 3600 * 1000));

    // Which class, which section, which tab — in the URL, so a reload lands
    // back on the same roster instead of an empty form.
    const [selectedClassId, setSelectedClassId] = useUrlState('class', '');
    const [selectedSectionId, setSelectedSectionId] = useUrlState('section', '');
    const [viewMode, setViewMode] = useUrlState<'mark' | 'history'>(
        'tab', 'mark', { allowed: ['mark', 'history'] },
    );
    const [period] = useUrlState<Period>(
        'period', 'week', { allowed: ['day', 'week', 'month', 'term', 'custom'] },
    );
    const [customStart, setCustomStart] = useUrlState('from', weekAgo);
    const [customEnd, setCustomEnd] = useUrlState('to', today);
    const [historyStudentId] = useUrlState('student', '');
    const setUrlState = useUrlStateBatch();

    // Marks themselves stay local: they are unsaved edits, not a view, and
    // putting 30 students' statuses in the address bar helps nobody.
    const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
    // What the server holds right now. The diff against statusMap is what
    // makes "unsaved" a real state rather than a guess.
    const [savedMap, setSavedMap] = useState<Record<number, AttendanceStatus>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Terms come from the school's calendar, so "this term" is the term the
    // report cards are written against.
    const { data: terms } = useQuery({
        queryKey: ['academic-terms'],
        queryFn: () => academicCalendarService.getTerms(),
        staleTime: 60 * 60 * 1000,
        enabled: viewMode === 'history',
    });
    const currentTerm = (terms ?? []).find((tm) => tm.is_current) ?? (terms ?? [])[0];

    const { historyStart, historyEnd } = React.useMemo(() => {
        // Ranges never run past today: a term has months left in it and empty
        // future days would read as missing attendance.
        const clamp = (d: Date | null, fallback: string) =>
            d ? (isoLocal(d) > today ? today : isoLocal(d)) : fallback;

        switch (period) {
            case 'day':
                return { historyStart: today, historyEnd: today };
            case 'month':
                return { historyStart: clamp(bsMonthStart(), weekAgo), historyEnd: today };
            case 'term':
                return currentTerm
                    ? {
                        historyStart: currentTerm.start_date,
                        historyEnd: currentTerm.end_date > today ? today : currentTerm.end_date,
                    }
                    : { historyStart: weekAgo, historyEnd: today };
            case 'custom':
                return { historyStart: customStart, historyEnd: customEnd };
            case 'week':
            default:
                return { historyStart: clamp(weekStart(), weekAgo), historyEnd: today };
        }
    }, [period, currentTerm, customStart, customEnd, today, weekAgo]);

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
            // One write, or the section lands a render after the class and the
            // roster query fires for a class/section pair that never existed.
            setUrlState({
                class: String(mySections![0].class_id),
                section: String(mySections![0].section_id),
            });
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

    // What the server already holds for today. Without this the page opened
    // blank over an already-marked class, and the count read 0 / 30.
    const { data: todayData, isFetching: loadingToday } = useQuery({
        queryKey: ['attendance-today', selectedClassId, selectedSectionId, today],
        queryFn: () => attendanceService.getAttendances({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            start_date: today,
            end_date: today,
            // 100 is the endpoint's ceiling; anything larger is a 422.
            limit: 100,
        }),
        enabled: !!selectedClassId,
    });

    // Seed the marks from the server, then leave them alone — re-running this
    // on every fetch would discard edits made since the page loaded.
    const seededFor = React.useRef<string>('');
    useEffect(() => {
        if (!todayData) return;
        const key = `${selectedClassId}:${selectedSectionId}:${today}`;
        if (seededFor.current === key) return;
        seededFor.current = key;
        const saved: Record<number, AttendanceStatus> = {};
        (todayData.attendances || []).forEach((rec: any) => {
            saved[rec.student_id] = rec.status as AttendanceStatus;
        });
        setStatusMap(saved);
        setSavedMap(saved);
    }, [todayData, selectedClassId, selectedSectionId, today]);

    const alreadySaved = (todayData?.attendances || []).length;

    // One row per day for the whole range — cheap, and complete, which the
    // old all-records fetch was not once a range exceeded 100 records.
    const { data: summaryData, isLoading: loadingHistory } = useQuery({
        queryKey: ['attendance-days', selectedClassId, selectedSectionId,
                   historyStudentId, historyStart, historyEnd],
        queryFn: () => attendanceService.getDailySummary({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            student_id: historyStudentId ? Number(historyStudentId) : undefined,
            start_date: historyStart,
            end_date: historyEnd,
        }),
        enabled: viewMode === 'history' && !!selectedClassId,
    });
    const historyDays = summaryData?.days ?? [];
    const historyTotals = summaryData?.totals;
    const onOneStudent = !!historyStudentId;

    // Which day is open, in the URL so a reload comes back to it.
    const [openDay, setOpenDay] = useUrlState('day', '');

    // Detail for the open day only.
    const { data: dayDetail, isFetching: loadingDay } = useQuery({
        queryKey: ['attendance-day', selectedClassId, selectedSectionId, openDay],
        queryFn: () => attendanceService.getAttendances({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            start_date: openDay,
            end_date: openDay,
            limit: 100,
        }),
        // One student's day holds a single mark, already on the row — nothing
        // to open, so nothing to fetch.
        enabled: viewMode === 'history' && !!selectedClassId && !!openDay && !onOneStudent,
    });

    const studentNameById: Record<number, string> = {};
    students.forEach((s: any) => {
        studentNameById[s.id] = `${s.first_name} ${s.last_name || ''}`.trim();
    });


    // Only what actually moved. Re-sending an unchanged absence would fire a
    // second SMS to a parent who was already told this morning.
    const changedIds = Object.keys(statusMap)
        .map(Number)
        .filter((id) => statusMap[id] !== savedMap[id]);
    const isDirty = changedIds.length > 0;

    const setAllStatus = useCallback((status: AttendanceStatus) => {
        const all: Record<number, AttendanceStatus> = {};
        students.forEach((s: any) => { all[s.id] = status; });
        setStatusMap(all);
    }, [students]);

    const submitMutation = useMutation({
        mutationFn: attendanceService.bulkCreateAttendance,
        onSuccess: (_data, sent) => {
            // The baseline moves to what was actually accepted, so the button
            // settles back to "saved" rather than staying armed.
            setSavedMap((prev) => {
                const next = { ...prev };
                sent.forEach((r: any) => { next[r.student_id] = r.status; });
                return next;
            });
            setSuccessMessage(t('attendance.savedCount', { count: sent.length }));
            setErrorMessage('');
            setTimeout(() => setSuccessMessage(''), 4000);
        },
        onError: (err: any) => {
            setErrorMessage(err.response?.data?.detail || 'Failed to save attendance');
        },
    });

    const handleSubmit = async () => {
        if (!selectedClassId) return setErrorMessage(t('attendance.selectClassFirst'));
        if (!isDirty) return;

        const records = changedIds.map((student_id) => ({
            student_id,
            date: today,
            status: statusMap[student_id],
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
        }));

        if (!isOnline) {
            await enqueueAttendance(records);
            // Queued is as good as saved from here — the sync worker owns it
            // now, and leaving the button armed invites a duplicate queue entry.
            setSavedMap({ ...savedMap, ...statusMap });
            setSuccessMessage(t('attendance.savedOffline'));
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
                                    {loadingToday ? (
                                        t('common.loading')
                                    ) : (
                                        <>
                                            {markedCount} / {students.length} {t('attendance.marked')}
                                            {absentCount > 0 && ` · ${absentCount} ${t('attendance.absent')}`}
                                            {/* Says the day is on record, so re-saving reads as a
                                                correction rather than a first entry. */}
                                            {alreadySaved > 0 && (
                                                <span className="text-emerald-600">
                                                    {' · '}{t('attendance.alreadySaved')}
                                                </span>
                                            )}
                                        </>
                                    )}
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
                            {viewMode === 'mark' && isDirty && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitMutation.isPending}
                                    className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-brand text-white font-bold text-sm rounded-xl md:rounded-2xl shrink-0 shadow-lg shadow-brand/20 hover:opacity-95 transition-all disabled:opacity-50"
                                >
                                    {submitMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    <span>{t('attendance.saveChanges', { count: changedIds.length })}</span>
                                </button>
                            )}
                            {/* Not an empty gap where the button was: say the work is
                                done, so nothing-to-save reads as reassurance. */}
                            {viewMode === 'mark' && !isDirty && alreadySaved > 0 && (
                                <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-600 shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t('attendance.allSaved')}
                                </span>
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
                                                onChange={e => { setUrlState({ class: e.target.value, section: null }); setStatusMap({}); setSavedMap({}); seededFor.current = ''; }}
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
                                                onChange={e => { setSelectedSectionId(e.target.value); setStatusMap({}); setSavedMap({}); seededFor.current = ''; }}
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
                                    {/* Stated, not chosen: marking is a today activity, and the
                                        History tab is where earlier days are read. */}
                                    <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700">
                                        {df.date(today, 'long')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.student')}</label>
                                    <div className="relative">
                                        <select
                                            value={historyStudentId}
                                            onChange={e => setUrlState({ student: e.target.value, day: null })}
                                            disabled={!selectedClassId}
                                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                        >
                                            <option value="">{t('attendance.wholeClass')}</option>
                                            {students.map((st: any) => (
                                                <option key={st.id} value={st.id}>
                                                    {st.first_name} {st.last_name || ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode === 'history' && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">
                                    {t('attendance.period')}
                                </span>
                                {(['day', 'week', 'month', 'term', 'custom'] as Period[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setUrlState({ period: p === 'week' ? null : p, day: null })}
                                        className={cn(
                                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                                            period === p
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-500 hover:bg-slate-100',
                                        )}
                                    >
                                        {t('attendance.period_' + p)}
                                    </button>
                                ))}

                                {period === 'custom' && (
                                    <span className="flex items-center gap-2 ml-1">
                                        <input
                                            type="date"
                                            value={customStart}
                                            max={customEnd}
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                        />
                                        <span className="text-slate-300 font-bold">→</span>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            min={customStart}
                                            max={today}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                        />
                                    </span>
                                )}

                                {/* The resolved window, so a named period is never a mystery. */}
                                <span className="ml-auto text-xs font-bold text-slate-500">
                                    {period === 'term' && currentTerm
                                        ? currentTerm.name + ' · '
                                        : ''}
                                    {df.date(historyStart)} – {df.date(historyEnd)}
                                </span>
                            </div>
                        )}

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
                        ) : historyDays.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">{t('attendance.noHistory')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* The period answered in one line, before the days. */}
                                {historyTotals && historyTotals.total > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('attendance.attendancePct')}
                                            </p>
                                            <p className={cn(
                                                'text-2xl font-black tabular-nums',
                                                historyTotals.attendance_pct == null ? 'text-slate-300'
                                                    : historyTotals.attendance_pct < 85 ? 'text-red-500'
                                                        : historyTotals.attendance_pct < 95 ? 'text-amber-600'
                                                            : 'text-emerald-600',
                                            )}>
                                                {historyTotals.attendance_pct != null
                                                    ? historyTotals.attendance_pct + '%' : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('attendance.daysCounted')}
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 tabular-nums">
                                                {historyTotals.days_counted}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-5 ml-auto">
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                    {t('attendance.absent')}
                                                </p>
                                                <p className="text-lg font-black text-red-500 tabular-nums">
                                                    {historyTotals.absent}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                    {t('attendance.late')}
                                                </p>
                                                <p className="text-lg font-black text-amber-600 tabular-nums">
                                                    {historyTotals.late}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                    {t('attendance.halfDay')}
                                                </p>
                                                <p className="text-lg font-black text-blue-600 tabular-nums">
                                                    {historyTotals.half_day}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {historyDays.map((day) => {
                                    // One student per day is a single mark — already on the
                                    // row, so there is nothing to expand into.
                                    const isOpen = !onOneStudent && openDay === day.date;
                                    const soleStatus = onOneStudent
                                        ? (day.absent ? 'A' : day.late ? 'L' : day.half_day ? 'HD' : 'P')
                                        : null;
                                    const soleOpt = soleStatus
                                        ? STATUS_OPTIONS.find(o => o.value === soleStatus) : null;
                                    const records = dayDetail?.attendances ?? [];
                                    return (
                                        <div key={day.date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => { if (!onOneStudent) setOpenDay(isOpen ? '' : day.date); }}
                                                aria-expanded={onOneStudent ? undefined : isOpen}
                                                disabled={onOneStudent}
                                                className={cn(
                                                    'w-full px-5 py-4 flex items-center gap-4 text-left transition-colors',
                                                    !onOneStudent && 'hover:bg-slate-50/70',
                                                )}
                                            >
                                                {onOneStudent ? (
                                                    <span className="w-4 shrink-0" />
                                                ) : (
                                                    <ChevronDown className={cn(
                                                        'w-4 h-4 text-slate-400 shrink-0 transition-transform',
                                                        isOpen && 'rotate-180',
                                                    )} />
                                                )}
                                                <span className="font-bold text-slate-900 text-sm min-w-0 flex-1 truncate">
                                                    {df.date(day.date, 'long')}
                                                </span>

                                                {onOneStudent && soleOpt && (
                                                    <span className={cn(
                                                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ml-auto',
                                                        soleOpt.color,
                                                    )}>
                                                        {soleOpt.icon}
                                                        {t(soleOpt.labelKey)}
                                                    </span>
                                                )}

                                                {/* The day at a glance, so most days need no opening. */}
                                                <span className={cn('hidden sm:flex items-center gap-1.5 shrink-0', onOneStudent && 'sm:hidden')}>
                                                    {day.absent > 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                                                            {day.absent} {t('attendance.absent')}
                                                        </span>
                                                    )}
                                                    {day.late > 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                                                            {day.late} {t('attendance.late')}
                                                        </span>
                                                    )}
                                                    {day.half_day > 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                                                            {day.half_day} {t('attendance.halfDay')}
                                                        </span>
                                                    )}
                                                    {day.absent === 0 && day.late === 0 && day.half_day === 0 && (
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold">
                                                            {t('attendance.fullAttendance')}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className={cn(
                                                    'text-xs font-bold text-slate-400 shrink-0 tabular-nums w-20 text-right',
                                                    onOneStudent && 'hidden',
                                                )}>
                                                    {day.total} {t('attendance.studentsShort')}
                                                </span>
                                                <span className={cn(
                                                    'text-sm font-black tabular-nums shrink-0 w-14 text-right',
                                                    onOneStudent && 'hidden',
                                                    day.attendance_pct == null ? 'text-slate-300'
                                                        : day.attendance_pct < 85 ? 'text-red-500'
                                                            : day.attendance_pct < 95 ? 'text-amber-600'
                                                                : 'text-emerald-600',
                                                )}>
                                                    {day.attendance_pct != null ? day.attendance_pct + '%' : '—'}
                                                </span>
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-slate-100">
                                                    {loadingDay ? (
                                                        <div className="px-5 py-8 flex justify-center">
                                                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                                        </div>
                                                    ) : records.length === 0 ? (
                                                        <p className="px-5 py-6 text-sm font-medium text-slate-400 text-center">
                                                            {t('attendance.noHistory')}
                                                        </p>
                                                    ) : (
                                                        <div className="divide-y divide-slate-50">
                                                            {records.map((rec: any) => {
                                                                const opt = STATUS_OPTIONS.find(o => o.value === rec.status);
                                                                return (
                                                                    <div key={rec.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                                                                        <span className="text-sm font-medium text-slate-700 truncate">
                                                                            {studentNameById[rec.student_id] || t('profile.unnamedStudent')}
                                                                        </span>
                                                                        <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-transparent shrink-0', opt?.color)}>
                                                                            {opt?.icon}
                                                                            {opt ? t(opt.labelKey) : rec.status}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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
