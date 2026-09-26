import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, ClipboardCheck, History, Layers, MessageSquare, Save, Users, WifiOff } from 'lucide-react';

import { Banner, Button, Card, CardHeader, EmptyState, FilterChips, Meter, SegmentedControl, Skeleton, Tabs, TextField } from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { SelectMenu } from '../../components/common/SelectMenu';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { attendanceService, type AttendanceStatus } from '../../api/services/attendance.service';
import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { enqueueAttendance } from '../../lib/offlineQueue';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useUrlState, useUrlStateBatch } from '../../hooks/useUrlState';
import { bsMonthStart, weekStart, isoLocal } from '../../utils/nepaliDate';
import { formatCount } from '../../utils/money';
import { errorText } from '../../features/people/format';
import { RosterRow } from '../../features/attendance/RosterRow';
import { HistoryDays, HistoryTotals } from '../../features/attendance/HistoryDays';
import { STATUSES, STATUS_KEY } from '../../features/attendance/status';
import type { Student } from '../../types/people';

type Period = 'day' | 'week' | 'month' | 'term' | 'custom';
type Filter = 'all' | AttendanceStatus | 'none';

/**
 * Figma C02 Attendance register and C03 Attendance history.
 *
 * Marking is for today only; history is where earlier days are read. Only
 * marks that changed are sent, so an absence saved this morning does not
 * text the parent a second time. With no connection the marks go to the
 * offline queue and the page says "Saved" (tier3_pwa_offline.md).
 */
const AttendancePage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const today = isoLocal(new Date());
    const weekAgo = isoLocal(new Date(Date.now() - 6 * 24 * 3600 * 1000));

    // Which class, which section, which tab — in the URL, so a reload lands
    // back on the same roster instead of an empty form.
    const [selectedClassId] = useUrlState('class', '');
    const [selectedSectionId, setSelectedSectionId] = useUrlState('section', '');
    const [viewMode, setViewMode] = useUrlState<'mark' | 'history'>('tab', 'mark', { allowed: ['mark', 'history'] });
    const [period] = useUrlState<Period>('period', 'week', { allowed: ['day', 'week', 'month', 'term', 'custom'] });
    const [customStart, setCustomStart] = useUrlState('from', weekAgo);
    const [customEnd, setCustomEnd] = useUrlState('to', today);
    const [historyStudentId] = useUrlState('student', '');
    const [openDay, setOpenDay] = useUrlState('day', '');
    const setUrlState = useUrlStateBatch();

    // Marks themselves stay local: they are unsaved edits, not a view.
    const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
    // What the server holds right now; the diff against statusMap is "unsaved".
    const [savedMap, setSavedMap] = useState<Record<number, AttendanceStatus>>({});
    const [filter, setFilter] = useState<Filter>('all');
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

    const { historyStart, historyEnd } = useMemo(() => {
        // Ranges never run past today: empty future days would read as missing attendance.
        const clamp = (d: Date | null, fallback: string) => (d ? (isoLocal(d) > today ? today : isoLocal(d)) : fallback);
        switch (period) {
            case 'day':
                return { historyStart: today, historyEnd: today };
            case 'month':
                return { historyStart: clamp(bsMonthStart(), weekAgo), historyEnd: today };
            case 'term':
                return currentTerm
                    ? { historyStart: currentTerm.start_date, historyEnd: currentTerm.end_date > today ? today : currentTerm.end_date }
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

    // Class teachers land directly on their own roster — no dropdowns to fumble.
    const { data: mySections } = useQuery({ queryKey: ['my-sections'], queryFn: academicsService.getMySections, enabled: isTeacher });
    const lockedToOwnSection = isTeacher && (mySections?.length ?? 0) > 0;
    useEffect(() => {
        if (lockedToOwnSection && !selectedClassId && mySections![0]) {
            // One write, or the roster query fires for a pair that never existed.
            setUrlState({ class: String(mySections![0].class_id), section: String(mySections![0].section_id) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mySections, lockedToOwnSection]);

    const { data: classesData } = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: !lockedToOwnSection });
    const { data: sectionsData } = useQuery({
        queryKey: ['sections', Number(selectedClassId)],
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
    const students: Student[] = useMemo(() => studentsData?.students ?? [], [studentsData]);

    // What the server already holds for today, so a marked class opens marked.
    const { data: todayData, isFetching: loadingToday } = useQuery({
        queryKey: ['attendance-today', selectedClassId, selectedSectionId, today],
        queryFn: () => attendanceService.getAttendances({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            start_date: today,
            end_date: today,
            limit: 100, // the endpoint's ceiling
        }),
        enabled: !!selectedClassId,
    });

    // Seed the marks from the server once, then leave them alone — re-running
    // on every fetch would discard edits made since the page loaded.
    const seededFor = React.useRef<string>('');
    useEffect(() => {
        if (!todayData) return;
        const key = `${selectedClassId}:${selectedSectionId}:${today}`;
        if (seededFor.current === key) return;
        seededFor.current = key;
        const saved: Record<number, AttendanceStatus> = {};
        (todayData.attendances || []).forEach((rec) => { saved[rec.student_id] = rec.status as AttendanceStatus; });
        setStatusMap(saved);
        setSavedMap(saved);
    }, [todayData, selectedClassId, selectedSectionId, today]);
    const alreadySaved = (todayData?.attendances || []).length;

    // One row per day for the whole range.
    const { data: summaryData, isLoading: loadingHistory } = useQuery({
        queryKey: ['attendance-days', selectedClassId, selectedSectionId, historyStudentId, historyStart, historyEnd],
        queryFn: () => attendanceService.getDailySummary({
            class_id: Number(selectedClassId),
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            student_id: historyStudentId ? Number(historyStudentId) : undefined,
            start_date: historyStart,
            end_date: historyEnd,
        }),
        enabled: viewMode === 'history' && !!selectedClassId,
    });
    const onOneStudent = !!historyStudentId;

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
        enabled: viewMode === 'history' && !!selectedClassId && !!openDay && !onOneStudent,
    });

    const nameOf = (s: { first_name: string; middle_name?: string; last_name?: string }) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
    const studentNameById = useMemo(() => Object.fromEntries(students.map((s) => [s.id, nameOf(s)])) as Record<number, string>, [students]);

    // Only what actually moved. Re-sending an unchanged absence would text a
    // parent who was already told this morning.
    const changedIds = Object.keys(statusMap).map(Number).filter((id) => statusMap[id] !== savedMap[id]);
    const isDirty = changedIds.length > 0;
    const newlyAbsent = changedIds.filter((id) => statusMap[id] === 'A');

    const mark = useCallback((id: number, status: AttendanceStatus) => setStatusMap((prev) => ({ ...prev, [id]: status })), []);
    const setAllStatus = (status: AttendanceStatus) => setStatusMap(Object.fromEntries(students.map((s) => [s.id, status])));
    // The usual morning: everyone not yet marked is present.
    const markRestPresent = () => setStatusMap((prev) => ({ ...Object.fromEntries(students.map((s) => [s.id, 'P' as AttendanceStatus])), ...prev }));

    const flash = (msg: string) => { setSuccessMessage(msg); setErrorMessage(''); setTimeout(() => setSuccessMessage(''), 4000); };
    const submitMutation = useMutation({
        mutationFn: attendanceService.bulkCreateAttendance,
        onSuccess: (_data, sent) => {
            // The baseline moves to what was accepted, so the button settles.
            setSavedMap((prev) => {
                const next = { ...prev };
                sent.forEach((r) => { next[r.student_id] = r.status as AttendanceStatus; });
                return next;
            });
            flash(t('attendance.savedCount', { count: sent.length }));
        },
        onError: (err) => setErrorMessage(errorText(err, t('peoplePage.error.body'))),
    });

    const handleSubmit = async () => {
        if (!selectedClassId) return setErrorMessage(t('attendancePage.selectClassFirst'));
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
            // Queued is as good as saved from here — the sync worker owns it.
            setSavedMap({ ...savedMap, ...statusMap });
            flash(t('attendance.savedOffline'));
            return;
        }
        submitMutation.mutate(records);
    };

    const resetMarks = () => { setStatusMap({}); setSavedMap({}); seededFor.current = ''; setFilter('all'); };
    const markedCount = students.filter((s) => statusMap[s.id]).length;
    const counts: Record<Filter, number> = {
        all: students.length,
        P: students.filter((s) => statusMap[s.id] === 'P').length,
        A: students.filter((s) => statusMap[s.id] === 'A').length,
        L: students.filter((s) => statusMap[s.id] === 'L').length,
        HD: students.filter((s) => statusMap[s.id] === 'HD').length,
        H: students.filter((s) => statusMap[s.id] === 'H').length,
        none: students.length - markedCount,
    };
    const visible = students.map((s, i) => ({ s, roll: i + 1 })).filter(({ s }) => filter === 'all' || (filter === 'none' ? !statusMap[s.id] : statusMap[s.id] === filter));

    // "Class 10 A" for the roster header and the SMS preview.
    const own = mySections?.find((s) => String(s.section_id) === selectedSectionId);
    const className = own?.class_name ?? classesData?.classes.find((c) => String(c.id) === selectedClassId)?.name ?? '';
    const sectionName = own?.section_name ?? sectionsData?.sections.find((s) => String(s.id) === selectedSectionId)?.name ?? '';
    const classLabel = [className, sectionName].filter(Boolean).join(' ');

    const saveButton = viewMode === 'mark' && (isDirty ? (
        <Button leftIcon={Save} loading={submitMutation.isPending} onClick={() => void handleSubmit()} className="max-md:hidden">
            {t('attendance.saveChanges', { count: changedIds.length })}
        </Button>
    ) : alreadySaved > 0 && counts.none === 0 ? (
        <span className="inline-flex h-11 items-center gap-2 px-2 type-small-semibold text-ok"><CheckCircle2 size={18} aria-hidden />{t('attendance.allSaved')}</span>
    ) : null);

    const selectors = lockedToOwnSection ? (
        mySections!.length === 1 ? (
            <span className="inline-flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-4 type-small-semibold text-ink">
                <Layers size={16} className="text-muted" aria-hidden />{mySections![0].class_name} {mySections![0].section_name}
            </span>
        ) : (
            <SelectMenu value={selectedSectionId} label={t('attendance.myClass')} icon={<Layers />}
                onChange={(v) => { const sec = mySections!.find((s) => String(s.section_id) === v); if (sec) { setUrlState({ class: String(sec.class_id), section: String(sec.section_id) }); resetMarks(); } }}
                options={mySections!.map((s) => ({ value: String(s.section_id), label: `${s.class_name} ${s.section_name}` }))} />
        )
    ) : (
        <>
            <SelectMenu value={selectedClassId} label={t('attendance.class')} icon={<Layers />}
                onChange={(v) => { setUrlState({ class: v, section: null, student: null, day: null }); resetMarks(); }}
                options={[{ value: '', label: t('attendance.selectClass') }, ...(classesData?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} />
            {selectedClassId && (
                <SelectMenu value={selectedSectionId} label={t('attendance.section')}
                    onChange={(v) => { setSelectedSectionId(v); resetMarks(); }}
                    options={[{ value: '', label: t('attendance.allSections') }, ...(sectionsData?.sections ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} />
            )}
        </>
    );

    const pickClass = (
        <Card><EmptyState icon={Users} title={t('attendance.selectClassPrompt')}>{t('attendancePage.pickBody')}</EmptyState></Card>
    );

    return (
        <AppPage title={viewMode === 'mark' ? t('attendancePage.title') : t('attendancePage.historyTitle')}>
            <PageBar actions={saveButton || undefined}>
                <Tabs value={viewMode} onChange={(v) => setViewMode(v)} aria-label={t('attendancePage.tabsLabel')}
                    items={[{ value: 'mark', label: t('attendance.markMode'), icon: ClipboardCheck }, { value: 'history', label: t('attendance.historyMode'), icon: History }]} />
            </PageBar>

            {(!isOnline || pendingCount > 0) && (
                <Banner tone={isOnline ? 'info' : 'warn'} icon={WifiOff} title={isOnline ? t('attendancePage.syncing', { count: pendingCount }) : t('attendancePage.offlineTitle')}>
                    {isOnline ? t('attendancePage.syncingBody') : t('attendancePage.offlineBody')}
                </Banner>
            )}
            {successMessage && <Banner tone="ok" title={successMessage} />}
            {errorMessage && <Banner tone="bad" title={t('attendancePage.saveFailed')}>{errorMessage}</Banner>}

            <Toolbar>
                <div className="flex flex-wrap gap-2 [&>*]:shrink-0">{selectors}</div>
                {viewMode === 'mark' ? (
                    <span className="inline-flex items-center gap-2 type-small-medium text-ink-2 md:ml-auto"><CalendarDays size={16} className="text-muted" aria-hidden />{df.date(today, 'long')}</span>
                ) : selectedClassId ? (
                    <SelectMenu value={historyStudentId} label={t('attendance.student')} icon={<Users />}
                        onChange={(v) => setUrlState({ student: v || null, day: null })}
                        options={[{ value: '', label: t('attendance.wholeClass') }, ...students.map((s) => ({ value: String(s.id), label: nameOf(s) }))]} />
                ) : null}
            </Toolbar>

            {viewMode === 'history' && (
                <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
                    <div className="max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none]">
                        <SegmentedControl size="sm" value={period} aria-label={t('attendance.period')} className="w-max"
                            onChange={(p) => setUrlState({ period: p === 'week' ? null : p, day: null })}
                            options={(['day', 'week', 'month', 'term', 'custom'] as Period[]).map((p) => ({ value: p, label: t(`attendancePage.period.${p}`) }))} />
                    </div>
                    {period === 'custom' && (
                        <div className="flex gap-2">
                            <TextField label={t('attendancePage.from')} type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} containerClassName="w-[170px]" />
                            <TextField label={t('attendancePage.to')} type="date" value={customEnd} min={customStart} max={today} onChange={(e) => setCustomEnd(e.target.value)} containerClassName="w-[170px]" />
                        </div>
                    )}
                    <p className="type-small text-muted md:ml-auto">
                        {period === 'term' && currentTerm ? `${currentTerm.name}, ` : ''}{t('attendancePage.range', { from: df.date(historyStart), to: df.date(historyEnd) })}
                    </p>
                </div>
            )}

            {viewMode === 'history' ? (
                !selectedClassId ? pickClass
                    : loadingHistory ? <div className="flex flex-col gap-2.5"><Skeleton className="h-[120px] rounded-card" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-card" />)}</div>
                        : (summaryData?.days ?? []).length === 0 ? <Card><EmptyState icon={History} title={t('attendance.noHistory')}>{t('attendancePage.noHistoryBody')}</EmptyState></Card>
                            : (
                                <div className="flex flex-col gap-3.5">
                                    {summaryData!.totals.total > 0 && (
                                        <HistoryTotals totals={summaryData!.totals}
                                            title={onOneStudent ? t('attendancePage.studentPct', { name: studentNameById[Number(historyStudentId)] ?? '' }) : t('attendancePage.classPct', { name: classLabel || t('attendance.wholeClass') })} />
                                    )}
                                    <HistoryDays days={summaryData!.days} oneStudent={onOneStudent} openDay={openDay} onToggle={setOpenDay}
                                        records={dayDetail?.attendances ?? []} loadingDay={loadingDay} nameOf={(id) => studentNameById[id] || t('attendancePage.unnamed')} />
                                </div>
                            )
            ) : !selectedClassId ? pickClass : (
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                    <Card className="gap-0 overflow-hidden p-0">
                        <div className="flex flex-col gap-3 p-4 lg:p-5">
                            <CardHeader title={classLabel || t('attendance.wholeClass')}
                                subtitle={loadingToday ? t('common.loading') : t('attendancePage.markedOf', { n: formatCount(markedCount, lang), of: formatCount(students.length, lang) })}
                                action={students.length > 0 && counts.none > 0 && <Button variant="quiet" size="sm" leftIcon={CheckCircle2} onClick={markRestPresent}>{t('attendancePage.restPresent')}</Button>} />
                            <Meter value={students.length ? markedCount / students.length : 0} tone={markedCount === students.length ? 'ok' : 'brand'} label={t('attendance.progress')} />
                            {students.length > 0 && (
                                <FilterChips aria-label={t('attendancePage.filterLabel')} value={filter} onChange={setFilter}
                                    items={(['all', ...STATUSES, 'none'] as Filter[])
                                        .filter((f) => f === 'all' || f === filter || counts[f] > 0)
                                        .map((f) => ({ value: f, label: f === 'all' ? t('financePage.expenses.all') : f === 'none' ? t('attendancePage.notMarked') : t(STATUS_KEY[f]), count: formatCount(counts[f], lang) }))} />
                            )}
                        </div>
                        {loadingStudents ? (
                            <div className="flex flex-col gap-2 p-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}</div>
                        ) : students.length === 0 ? (
                            <EmptyState icon={Users} title={t('attendance.noStudentsFound')}>{t('attendancePage.noStudentsBody')}</EmptyState>
                        ) : (
                            <ul className="flex flex-col divide-y divide-line-subtle border-t border-line-subtle">
                                {visible.map(({ s, roll }) => (
                                    <RosterRow key={s.id} roll={roll} id={s.id} name={nameOf(s)} sub={s.admission_no} status={statusMap[s.id]}
                                        changed={statusMap[s.id] !== savedMap[s.id]} onMark={mark} />
                                ))}
                                {visible.length === 0 && <li className="px-5 py-6 text-center type-small text-muted">{t('peoplePage.empty.filtered')}</li>}
                            </ul>
                        )}
                        {students.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle px-4 py-3 lg:px-5">
                                <span className="type-caption text-muted">{t('attendancePage.markAll')}</span>
                                {STATUSES.map((s) => <Button key={s} variant="ghost" size="sm" onClick={() => setAllStatus(s)}>{t(STATUS_KEY[s])}</Button>)}
                            </div>
                        )}
                    </Card>

                    <Card className="gap-3" aria-label={t('attendancePage.smsTitle')}>
                        <CardHeader title={t('attendancePage.smsTitle')}
                            subtitle={newlyAbsent.length > 0 ? t('attendancePage.smsCount', { count: newlyAbsent.length, n: formatCount(newlyAbsent.length, lang) }) : t('attendancePage.smsNone')} />
                        {newlyAbsent.slice(0, 3).map((id) => (
                            <div key={id} className="flex gap-2.5 rounded-row bg-surface-2 p-3">
                                <MessageSquare size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                                <p className="type-caption text-ink-2">
                                    {/* The server's own wording (app/tasks/notifications.py). */}
                                    Dear Parent, {studentNameById[id]} of {classLabel} was marked absent on {today}. Please contact the school if this is incorrect. - Satyam Xavier's School
                                </p>
                            </div>
                        ))}
                        {newlyAbsent.length > 3 && <p className="type-caption text-muted">{t('attendancePage.smsMore', { n: formatCount(newlyAbsent.length - 3, lang) })}</p>}
                        <p className="type-caption text-muted">{t('attendancePage.smsNote')}</p>
                    </Card>
                </div>
            )}

            {/* Phones: the save button follows the register down the page. */}
            {viewMode === 'mark' && isDirty && (
                <div className="sticky bottom-3 z-10 md:hidden">
                    <Button fullWidth leftIcon={Save} loading={submitMutation.isPending} onClick={() => void handleSubmit()} className="shadow-e3">
                        {t('attendance.saveChanges', { count: changedIds.length })}
                    </Button>
                </div>
            )}
        </AppPage>
    );
};

export default AttendancePage;
