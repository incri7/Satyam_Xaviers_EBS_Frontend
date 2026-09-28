import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BookMarked, CheckCircle2, CircleDashed, FileSpreadsheet, FileText, GraduationCap, Layers, NotebookPen, Save } from 'lucide-react';

import { Banner, Button, Card, CardHeader, EmptyState, Meter, SearchField, Skeleton, Tabs } from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { SelectMenu } from '../../components/common/SelectMenu';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { examsService, type MarkEntry } from '../../api/services/exams.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useUrlState, useUrlStateBatch } from '../../hooks/useUrlState';
import { useDateFormat } from '../../hooks/useDateFormat';
import { currentAcademicYear } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { errorText, fullName } from '../../features/people/format';
import { EntryRow } from '../../features/marks/EntryRow';
import { markProblem, type MarkDraft } from '../../features/marks/draft';
import { Marksheet } from './Marksheet';
import { ClassMarksheets } from './ClassMarksheets';
import type { Student } from '../../types/people';

const EMPTY: MarkDraft = { obtained: '', is_absent: false };
/** A draft as the server would store it: absent, blank, or the number ("45" and "45.0" are one mark). */
const norm = (d: MarkDraft = EMPTY) => {
    if (d.is_absent) return 'absent';
    const raw = d.obtained.trim();
    return raw === '' || !Number.isFinite(Number(raw)) ? raw : String(Number(raw));
};
const same = (a?: MarkDraft, b?: MarkDraft) => norm(a) === norm(b);

/**
 * Figma C04 Marks entry, C05 Class marksheets and C06 Report card.
 *
 * Entry is one subject's paper for one class. Only rows that changed are
 * sent: the server writes whatever it is given, so re-sending an untouched
 * blank row would wipe a mark another session saved.
 */
const MarksPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    // A marksheet is something someone sends or comes back to, so it lives in the URL.
    const [mode] = useUrlState<'entry' | 'sheet'>('mode', 'entry', { allowed: ['entry', 'sheet'] });
    const [sheetStudentId] = useUrlState('student', '');
    const setUrlState = useUrlStateBatch();
    const isSheet = mode === 'sheet';
    const [marksMap, setMarksMap] = useState<Record<number, MarkDraft>>({});
    const [savedMap, setSavedMap] = useState<Record<number, MarkDraft>>({});
    const [search, setSearch] = useState('');
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad' | 'info'; title: string; body?: string } | null>(null);
    const academicYear = currentAcademicYear();

    const { user } = useAuthStore();
    const navigate = useNavigate();
    const isTeacher = user?.role === 'teacher';

    const { data: examsData } = useQuery({ queryKey: ['exams', academicYear], queryFn: () => examsService.listExams({ academic_year: academicYear }) });

    // Teachers pick only among the classes and subjects they teach
    // (ClassSubject.teacher_id); everyone else sees the whole school.
    const { data: myClassSubjects } = useQuery({ queryKey: ['class-subjects', 'my'], queryFn: () => academicsService.getMyClassSubjects(), enabled: isTeacher });
    const { data: allSubjects } = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => academicsService.getSubjects(), enabled: !isTeacher });
    const { data: allClassesData } = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: !isTeacher });

    const myClasses = useMemo(() => {
        const byId = new Map<number, string>();
        (myClassSubjects || []).forEach((cs) => byId.set(cs.class_id, cs.class_name));
        return [...byId.entries()].map(([id, name]) => ({ id, name }));
    }, [myClassSubjects]);
    const classes = isTeacher ? myClasses : (allClassesData?.classes || []);
    const subjects = isTeacher
        ? (myClassSubjects || []).filter((cs) => String(cs.class_id) === selectedClassId).map((cs) => ({ id: cs.subject_id, name: cs.subject_name }))
        : (allSubjects || []);

    // Skip the picker when there is exactly one class, or one subject in it.
    useEffect(() => {
        if (isTeacher && myClasses.length === 1 && selectedClassId !== String(myClasses[0].id)) setSelectedClassId(String(myClasses[0].id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacher, myClassSubjects]);
    useEffect(() => {
        if (isTeacher && subjects.length === 1 && selectedSubjectId !== String(subjects[0].id)) setSelectedSubjectId(String(subjects[0].id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTeacher, myClassSubjects, selectedClassId]);
    // The newest exam is the one being marked, nearly always.
    useEffect(() => {
        if (!selectedExamId && examsData?.exams.length) setSelectedExamId(String(Math.max(...examsData.exams.map((e) => e.id))));
    }, [examsData, selectedExamId]);

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', Number(selectedClassId)],
        queryFn: () => academicsService.getSections({ class_id: Number(selectedClassId), limit: 100 }),
        enabled: !!selectedClassId,
    });
    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', 'enrollment', selectedClassId, selectedSectionId],
        queryFn: () => peopleService.getStudents({ limit: 100, class_id: Number(selectedClassId), section_id: selectedSectionId ? Number(selectedSectionId) : undefined }),
        enabled: !!selectedClassId,
    });
    const students: Student[] = useMemo(() => studentsData?.students ?? [], [studentsData]);

    // A student id left in the URL from another class would render that
    // child's sheet while the class shows someone else. Honour it only once
    // the roster it must belong to has loaded.
    const sheetStudentOnRoster = !!sheetStudentId && students.some((st) => String(st.id) === sheetStudentId);
    const activeSheetStudentId = studentsData && !sheetStudentOnRoster ? '' : sheetStudentId;

    const marksKey = ['marks', selectedExamId, selectedClassId, selectedSectionId, selectedSubjectId];
    const { data: existingMarks, isFetching: loadingMarks, isError: marksError } = useQuery({
        queryKey: marksKey,
        queryFn: () => examsService.getMarksForClass(Number(selectedExamId), Number(selectedClassId), {
            section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
            subject_id: Number(selectedSubjectId),
        }),
        // A grid is one subject's paper; without a subject the server picked one at random.
        enabled: !isSheet && !!(selectedExamId && selectedClassId && selectedSubjectId),
        retry: false,
    });

    // Seed the grid from the server once per paper, then leave it alone so a
    // refetch cannot throw away typing.
    const seededFor = useRef('');
    useEffect(() => {
        if (!existingMarks) return;
        const key = marksKey.join(':');
        if (seededFor.current === key) return;
        seededFor.current = key;
        const map: Record<number, MarkDraft> = {};
        existingMarks.marks.forEach((m) => { map[m.student_id] = { obtained: m.obtained != null ? String(Number(m.obtained)) : '', is_absent: m.is_absent }; });
        setMarksMap(map);
        setSavedMap(map);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingMarks]);

    const resetPaper = () => { setMarksMap({}); setSavedMap({}); seededFor.current = ''; setNotice(null); };

    const scheduleId = existingMarks?.schedule_id;
    // Echoed by the server, so the ceiling here is the one the save is checked against.
    const paperMax = Number(existingMarks?.max_marks ?? 100);
    const paperSubject = existingMarks?.subject_name ?? subjects.find((s) => String(s.id) === selectedSubjectId)?.name;

    const changedIds = students.map((s) => s.id).filter((id) => !same(marksMap[id], savedMap[id]));
    const problems = students.filter((s) => markProblem(marksMap[s.id], paperMax));
    const entered = students.filter((s) => marksMap[s.id]?.is_absent || (marksMap[s.id]?.obtained ?? '') !== '').length;
    const numbers = students.map((s) => marksMap[s.id]).filter((d) => d && !d.is_absent && d.obtained !== '' && !markProblem(d, paperMax)).map((d) => Number(d!.obtained));
    const average = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;

    const change = useCallback((id: number, next: MarkDraft) => setMarksMap((prev) => ({ ...prev, [id]: next })), []);
    const listRef = useRef<HTMLUListElement>(null);
    const focusNext = useCallback((roll: number) => {
        const next = listRef.current?.querySelector<HTMLInputElement>(`input[data-roll="${roll + 1}"]`);
        next?.focus();
        next?.select();
    }, []);

    // ── Excel import: fills the grid from a spreadsheet; the teacher reviews, then saves ──
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleExcelFile = async (file: File) => {
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            if (rows.length === 0) return setNotice({ tone: 'bad', title: t('marksPage.import.empty') });
            // "Admission No" / "admission_no" / "Adm No", "Marks" / "Obtained", optional "Absent".
            const normalize = (k: string) => k.toLowerCase().replace(/[^a-z]/g, '');
            const keys = Object.keys(rows[0]);
            const admKey = keys.find((k) => normalize(k).includes('admission') || normalize(k) === 'admno');
            const marksKeyCol = keys.find((k) => ['marks', 'obtained', 'mark', 'score'].includes(normalize(k)));
            const absentKey = keys.find((k) => normalize(k) === 'absent');
            if (!admKey || !marksKeyCol) return setNotice({ tone: 'bad', title: t('marksPage.import.noColumns') });

            const byAdmission: Record<string, number> = {};
            students.forEach((s) => { if (s.admission_no) byAdmission[String(s.admission_no).trim().toLowerCase()] = s.id; });
            let matched = 0;
            const unmatched: string[] = [];
            const next = { ...marksMap };
            for (const row of rows) {
                const adm = String(row[admKey] ?? '').trim().toLowerCase();
                if (!adm) continue;
                const studentId = byAdmission[adm];
                if (!studentId) { unmatched.push(String(row[admKey])); continue; }
                const rawAbsent = absentKey ? String(row[absentKey] ?? '').trim().toLowerCase() : '';
                const isAbsent = ['yes', 'true', 'a', 'absent', '1'].includes(rawAbsent);
                const raw = row[marksKeyCol];
                next[studentId] = { obtained: isAbsent || raw == null || raw === '' ? '' : String(raw), is_absent: isAbsent };
                matched++;
            }
            setMarksMap(next);
            setNotice({
                tone: 'info',
                title: t('marksPage.import.done', { n: formatCount(matched, lang), of: formatCount(rows.length, lang) }),
                body: (unmatched.length ? t('marksPage.import.unmatched', { list: unmatched.slice(0, 5).join(', ') + (unmatched.length > 5 ? '…' : '') }) + ' ' : '') + t('marksPage.import.review'),
            });
        } catch {
            setNotice({ tone: 'bad', title: t('marksPage.import.unreadable') });
        }
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const marks: MarkEntry[] = changedIds.map((id) => {
                const d = marksMap[id] ?? EMPTY;
                return { student_id: id, obtained: d.is_absent || d.obtained === '' ? null : Number(d.obtained), is_absent: d.is_absent };
            });
            return examsService.batchSaveMarks(Number(selectedExamId), { schedule_id: scheduleId!, marks });
        },
        onSuccess: () => {
            setSavedMap({ ...savedMap, ...Object.fromEntries(changedIds.map((id) => [id, marksMap[id] ?? EMPTY])) });
            setNotice({ tone: 'ok', title: t('marksPage.saved', { count: changedIds.length, n: formatCount(changedIds.length, lang) }) });
            queryClient.invalidateQueries({ queryKey: ['report-cards'] });
            queryClient.invalidateQueries({ queryKey: ['report-card'] });
        },
        onError: (err) => setNotice({ tone: 'bad', title: t('marksPage.saveFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const canSave = changedIds.length > 0 && problems.length === 0 && !!scheduleId && !saveMutation.isPending;

    const { data: reportCard, isLoading: loadingSheet, isError: sheetError } = useQuery({
        queryKey: ['report-card', selectedExamId, activeSheetStudentId],
        queryFn: () => examsService.getReportCard(Number(selectedExamId), Number(activeSheetStudentId)),
        enabled: isSheet && !!selectedExamId && !!activeSheetStudentId,
    });
    // No student chosen means the whole class — the natural bulk-print unit.
    const { data: classCards, isLoading: loadingClassCards, isError: classCardsError } = useQuery({
        queryKey: ['report-cards', selectedExamId, selectedClassId, selectedSectionId],
        queryFn: () => examsService.getClassReportCards(Number(selectedExamId), { class_id: Number(selectedClassId), section_id: selectedSectionId ? Number(selectedSectionId) : undefined }),
        enabled: isSheet && !activeSheetStudentId && !!selectedExamId && !!selectedClassId,
    });

    const needsSubject = !isSheet && !!selectedExamId && !!selectedClassId && !selectedSubjectId;
    const q = search.trim().toLowerCase();
    const rows = students.map((s, i) => ({ s, roll: i + 1 })).filter(({ s }) => !q || fullName(s).toLowerCase().includes(q) || (s.admission_no ?? '').toLowerCase().includes(q));
    const className = classes.find((c) => String(c.id) === selectedClassId)?.name ?? '';
    const sectionName = sectionsData?.sections.find((s) => String(s.id) === selectedSectionId)?.name ?? '';
    const classLabel = [className, sectionName].filter(Boolean).join(' ');

    const saveLabel = changedIds.length ? t('marksPage.saveN', { count: changedIds.length, n: formatCount(changedIds.length, lang) }) : t('marksPage.allSaved');
    const actions = !isSheet ? (
        <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleExcelFile(f); e.target.value = ''; }} />
            <Button variant="quiet" leftIcon={FileSpreadsheet} disabled={students.length === 0 || !scheduleId} onClick={() => fileInputRef.current?.click()} title={t('marksPage.import.hint')}>
                {t('marksPage.import.button')}
            </Button>
            <Button leftIcon={Save} loading={saveMutation.isPending} disabled={!canSave} onClick={() => saveMutation.mutate()} className="max-md:hidden">{saveLabel}</Button>
        </>
    ) : undefined;

    const exams = examsData?.exams ?? [];
    return (
        <AppPage title={isSheet ? t('marksPage.sheetTitle') : t('marksPage.title')}>
            <PageBar actions={actions}>
                <Tabs value={mode} aria-label={t('marksPage.tabsLabel')}
                    onChange={(m) => setUrlState(m === 'entry' ? { mode: null, student: null } : { mode: 'sheet' })}
                    items={[{ value: 'entry', label: t('marksPage.entry'), icon: NotebookPen }, { value: 'sheet', label: t('marksPage.sheets'), icon: FileText }]} />
            </PageBar>

            {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}

            <Toolbar>
                <div className="flex flex-wrap gap-2 [&>*]:shrink-0">
                    <SelectMenu value={selectedExamId} label={t('marks.exam')} icon={<GraduationCap />}
                        onChange={(v) => { setSelectedExamId(v); resetPaper(); }}
                        options={[{ value: '', label: exams.length ? t('marks.selectExam') : t('marksPage.noExams') }, ...exams.map((e) => ({ value: String(e.id), label: e.name }))]} />
                    {isTeacher && classes.length === 1 ? (
                        <span className="inline-flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-4 type-small-semibold text-ink"><Layers size={16} className="text-muted" aria-hidden />{classes[0].name}</span>
                    ) : (
                        <SelectMenu value={selectedClassId} label={t('attendance.class')} icon={<Layers />}
                            onChange={(v) => { setSelectedClassId(v); setSelectedSectionId(''); setSelectedSubjectId(''); resetPaper(); setUrlState({ student: null }); }}
                            options={[{ value: '', label: t('attendance.selectClass') }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
                    )}
                    {selectedClassId && (
                        <SelectMenu value={selectedSectionId} label={t('attendance.section')}
                            onChange={(v) => { setSelectedSectionId(v); resetPaper(); setUrlState({ student: null }); }}
                            options={[{ value: '', label: t('attendance.allSections') }, ...(sectionsData?.sections ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} />
                    )}
                    {!isSheet && selectedClassId && (isTeacher && subjects.length === 1 ? (
                        <span className="inline-flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-4 type-small-semibold text-ink"><BookMarked size={16} className="text-muted" aria-hidden />{subjects[0].name}</span>
                    ) : (
                        <SelectMenu value={selectedSubjectId} label={t('marks.subject')} icon={<BookMarked />}
                            onChange={(v) => { setSelectedSubjectId(v); resetPaper(); }}
                            options={[{ value: '', label: t('marks.selectSubject') }, ...subjects.map((s) => ({ value: String(s.id), label: s.name }))]} />
                    ))}
                </div>
            </Toolbar>
            {isTeacher && classes.length === 0 && <Banner tone="warn" title={t('marks.noClassesAssigned')} />}
            {isTeacher && !!selectedClassId && subjects.length === 0 && <Banner tone="warn" title={t('marks.noSubjectsAssigned')} />}

            {!selectedClassId || !selectedExamId ? (
                <Card><EmptyState icon={GraduationCap} title={t('marksPage.pickTitle')}>{t('marksPage.pickBody')}</EmptyState></Card>
            ) : isSheet ? (
                !activeSheetStudentId
                    ? <ClassMarksheets data={classCards} isLoading={loadingClassCards} isError={classCardsError} onOpenStudent={(id) => setUrlState({ student: String(id) })} onOpenEntry={() => setUrlState({ mode: null, student: null })} />
                    : <Marksheet data={reportCard} isLoading={loadingSheet} isError={sheetError} onBack={() => setUrlState({ student: null })} />
            ) : needsSubject ? (
                <Card><EmptyState icon={BookMarked} title={t('marks.chooseSubject')}>{t('marks.chooseSubjectWhy')}</EmptyState></Card>
            ) : marksError ? (
                <Card><EmptyState icon={AlertTriangle} tone="bad" title={t('marksPage.noPaper')}
                    action={['admin', 'principal', 'coordinator'].includes(user?.role ?? '') && <Button variant="quiet" size="sm" onClick={() => navigate('/exams')}>{t('marksPage.openExams')}</Button>}>
                    {t('marksPage.noPaperBody')}
                </EmptyState></Card>
            ) : (
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                    <Card className="gap-0 overflow-hidden p-0">
                        <div className="flex flex-col gap-3 p-4 lg:p-5">
                            <CardHeader title={[classLabel, paperSubject].filter(Boolean).join(', ')}
                                subtitle={loadingMarks ? t('common.loading') : t('marksPage.enteredOf', { n: formatCount(entered, lang), of: formatCount(students.length, lang), max: formatCount(paperMax, lang) })} />
                            <Meter value={students.length ? entered / students.length : 0} tone={entered === students.length ? 'ok' : 'brand'} label={t('marksPage.progress')} />
                            <SearchField value={search} onChange={setSearch} placeholder={t('marksPage.find')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
                            <p className="type-caption text-muted max-sm:hidden">{t('marksPage.keysHint')}</p>
                        </div>
                        {loadingStudents || loadingMarks && !existingMarks ? (
                            <div className="flex flex-col gap-2 p-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}</div>
                        ) : students.length === 0 ? (
                            <EmptyState icon={GraduationCap} title={t('attendance.noStudentsFound')}>{t('attendancePage.noStudentsBody')}</EmptyState>
                        ) : (
                            <ul ref={listRef} className="flex flex-col divide-y divide-line-subtle border-t border-line-subtle">
                                {rows.map(({ s, roll }) => (
                                    <EntryRow key={s.id} roll={roll} id={s.id} name={fullName(s)} sub={s.admission_no} draft={marksMap[s.id] ?? EMPTY} max={paperMax}
                                        changed={!same(marksMap[s.id], savedMap[s.id])} onChange={change} onEnter={focusNext} />
                                ))}
                                {rows.length === 0 && <li className="px-5 py-6 text-center type-small text-muted">{t('peoplePage.empty.filtered')}</li>}
                            </ul>
                        )}
                    </Card>

                    <Card className="gap-3">
                        <CardHeader title={t('marksPage.checkTitle')} subtitle={average != null ? t('marksPage.average', { avg: formatCount(Math.round(average * 10) / 10, lang), max: formatCount(paperMax, lang) }) : undefined} />
                        <ul className="flex flex-col gap-2.5">
                            <Check ok={entered === students.length} icon={CircleDashed}
                                text={entered === students.length ? t('marksPage.check.allIn') : t('marksPage.check.missing', { count: students.length - entered, n: formatCount(students.length - entered, lang) })} />
                            <Check ok={problems.length === 0} icon={AlertTriangle}
                                text={problems.length === 0 ? t('marksPage.check.noProblems') : t('marksPage.check.problems', { count: problems.length, n: formatCount(problems.length, lang), names: problems.slice(0, 2).map((s) => fullName(s)).join(', ') })} />
                            <Check ok={changedIds.length === 0} icon={Save}
                                text={changedIds.length === 0 ? t('marksPage.check.saved') : t('marksPage.check.unsaved', { count: changedIds.length, n: formatCount(changedIds.length, lang) })} />
                        </ul>
                        <p className="type-caption text-muted">{t('marksPage.gradesNote')}</p>
                    </Card>
                </div>
            )}

            {!isSheet && changedIds.length > 0 && (
                <div className="sticky bottom-3 z-10 md:hidden">
                    <Button fullWidth leftIcon={Save} loading={saveMutation.isPending} disabled={!canSave} onClick={() => saveMutation.mutate()} className="shadow-e3">{saveLabel}</Button>
                </div>
            )}
        </AppPage>
    );
};

function Check({ ok, icon: Icon, text }: { ok: boolean; icon: typeof Save; text: string }) {
    return (
        <li className="flex items-start gap-2.5">
            {ok ? <CheckCircle2 size={18} className="mt-px shrink-0 text-ok" aria-hidden /> : <Icon size={18} className="mt-px shrink-0 text-warn" aria-hidden />}
            <span className="type-small text-ink-2">{text}</span>
        </li>
    );
}

export default MarksPage;
