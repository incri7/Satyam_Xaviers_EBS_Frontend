import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BookMarked, CalendarCheck, CalendarPlus, ChevronRight, Pencil, Plus, RotateCw, Trash2, Wand2 } from 'lucide-react';

import {
    ActionMenu, Badge, Banner, Button, Card, CardHeader, Checkbox, Dialog, EmptyState, FilterChips, FormRow, Meter,
    SegmentedControl, SelectField, Skeleton, TextField,
} from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { academicsService } from '../../api/services/academics.service';
import { examsService, type Exam, type Paper } from '../../api/services/exams.service';
import { errorText } from '../../features/people/format';
import { useNotice } from '../../features/people/useNotice';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { academicYearLabel, currentAcademicYear } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const TYPES = ['unit_test', 'mid_term', 'final', 'other'] as const;
type ExamType = (typeof TYPES)[number];

/** Papers of one subject set for several sections at the same sitting read as one row. */
interface Sitting {
    key: string;
    subject: string;
    date: string;
    start: string | null;
    end: string | null;
    max: number;
    papers: Paper[];
}

function sittings(papers: Paper[]): Sitting[] {
    const map = new Map<string, Sitting>();
    for (const p of papers) {
        const key = [p.subject_id, p.exam_date, p.start_time, p.end_time, p.max_marks].join('|');
        const s = map.get(key) ?? { key, subject: p.subject_name, date: p.exam_date, start: p.start_time, end: p.end_time, max: p.max_marks, papers: [] };
        s.papers.push(p);
        map.set(key, s);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''));
}

/**
 * Exams and their routine. An exam is created once for the year; each class
 * then gets its papers (a subject on a day, for every section), which is what
 * marks entry records against. No Figma frame: built from the design system,
 * in the shape of the fee structures page (list on the left, detail right).
 */
export default function ExamsPage() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const can = usePermissionsStore((s) => s.hasPermission);
    const year = currentAcademicYear();
    const exams = useQuery({ queryKey: ['exams', year], queryFn: () => examsService.listExams({ academic_year: year }) });
    const [picked, setPicked] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const list = exams.data?.exams ?? [];
    const current = list.find((e) => e.id === picked) ?? list[0];

    return (
        <AppPage title={t('examsPage.title')}>
            <PageBar actions={can('exams', 'create') && <Button leftIcon={Plus} onClick={() => setCreating(true)}>{t('examsPage.newExam')}</Button>}>
                <p className="type-small text-muted">{t('examsPage.intro', { year: academicYearLabel(year, lang) })}</p>
            </PageBar>

            {exams.isPending ? (
                <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"><Skeleton className="h-[260px] max-lg:hidden" /><Skeleton className="h-[360px]" /></div>
            ) : exams.isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void exams.refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>
            ) : list.length === 0 ? (
                <Card><EmptyState icon={CalendarCheck} title={t('examsPage.noneTitle')}
                    action={can('exams', 'create') && <Button leftIcon={Plus} onClick={() => setCreating(true)}>{t('examsPage.newExam')}</Button>}>{t('examsPage.noneBody')}</EmptyState></Card>
            ) : (
                <>
                    <div className="lg:hidden">
                        <FilterChips aria-label={t('examsPage.pick')} value={String(current!.id)} onChange={(v) => setPicked(Number(v))}
                            items={list.map((e) => ({ value: String(e.id), label: e.name }))} />
                    </div>
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
                        <nav aria-label={t('examsPage.pick')} className="overflow-hidden rounded-card border border-line bg-surface shadow-e1 max-lg:hidden">
                            <ul className="flex flex-col py-1.5">
                                {list.map((e) => {
                                    const on = e.id === current!.id;
                                    return (
                                        <li key={e.id}>
                                            <button type="button" aria-current={on ? 'true' : undefined} onClick={() => setPicked(e.id)}
                                                className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors focus-visible:bg-surface-2', on ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
                                                <span className="flex min-w-0 flex-1 flex-col">
                                                    <span className={cn('truncate type-small-semibold', on ? 'text-primary-text' : 'text-ink')}>{e.name}</span>
                                                    <span className="type-caption text-muted">{[e.exam_type && t(`examsPage.type.${e.exam_type}`), e.term].filter(Boolean).join(', ') || '—'}</span>
                                                </span>
                                                <ChevronRight size={16} className={on ? 'text-primary-text' : 'text-muted'} aria-hidden />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                        <ExamDetail key={current!.id} exam={current!} onGone={() => setPicked(null)} />
                    </div>
                </>
            )}

            {creating && <ExamDialog onClose={() => setCreating(false)} onSaved={(e) => { setCreating(false); setPicked(e.id); }} />}
        </AppPage>
    );
}

function ExamDetail({ exam, onGone }: { exam: Exam; onGone: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [editing, setEditing] = useState(false);
    const [adding, setAdding] = useState(false);
    const [moving, setMoving] = useState<Sitting | null>(null);
    const papers = useQuery({ queryKey: ['exam-papers', exam.id], queryFn: () => examsService.listPapers(exam.id) });

    const byClass = useMemo(() => {
        const map = new Map<number, { name: string; papers: Paper[] }>();
        for (const p of papers.data ?? []) {
            const g = map.get(p.class_id) ?? { name: p.class_name, papers: [] };
            g.papers.push(p);
            map.set(p.class_id, g);
        }
        return [...map.entries()].sort((a, b) => a[0] - b[0]);
    }, [papers.data]);
    const all = papers.data ?? [];
    const dates = all.map((p) => p.exam_date).sort();
    const entered = all.reduce((s, p) => s + p.marks_entered, 0);
    const needed = all.reduce((s, p) => s + p.enrolled, 0);

    const refresh = () => { qc.invalidateQueries({ queryKey: ['exam-papers', exam.id] }); qc.invalidateQueries({ queryKey: ['exams'] }); };
    const removeExam = useMutation({
        mutationFn: () => examsService.deleteExam(exam.id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); onGone(); },
        onError: (err) => notify({ tone: 'bad', title: t('examsPage.deleteFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const removeSitting = useMutation({
        mutationFn: async (s: Sitting) => { for (const p of s.papers) await examsService.deletePaper(exam.id, p.id); },
        onSettled: refresh,
        onError: (err) => notify({ tone: 'bad', title: t('examsPage.removeFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}
            <Card className="gap-3">
                <CardHeader title={exam.name}
                    subtitle={[exam.exam_type && t(`examsPage.type.${exam.exam_type}`), exam.term,
                        dates.length ? t('examsPage.span', { from: df.date(dates[0], 'dayMonth'), to: df.date(dates[dates.length - 1], 'dayMonth') }) : null].filter(Boolean).join(', ')}
                    action={
                        <ActionMenu label={t('examsPage.more')} items={[
                            { label: t('examsPage.edit'), icon: Pencil, onSelect: () => setEditing(true), hidden: !can('exams', 'update') },
                            { label: t('examsPage.delete'), icon: Trash2, tone: 'bad', hidden: !can('exams', 'delete'), onSelect: () => confirm({
                                title: t('examsPage.deleteTitle', { name: exam.name }), body: t('examsPage.deleteBody'),
                                confirmLabel: t('examsPage.delete'), onConfirm: () => removeExam.mutate(),
                            }) },
                        ]} />
                    } />
                {all.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="type-small text-ink-2">{t('examsPage.progress', { a: formatCount(entered, df.lang), b: formatCount(needed, df.lang) })}</span>
                        <Meter value={needed ? entered / needed : 0} tone="info" height={6} label={t('examsPage.progressLabel')} className="flex-1" />
                    </div>
                )}
                {can('exams', 'create') && (
                    <Button variant="quiet" size="sm" leftIcon={CalendarPlus} className="w-fit" onClick={() => setAdding(true)}>{t('examsPage.addRoutine')}</Button>
                )}
            </Card>

            {papers.isPending ? <Skeleton className="h-[240px]" /> : papers.isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void papers.refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>
            ) : all.length === 0 ? (
                <Card><EmptyState icon={BookMarked} title={t('examsPage.noPapersTitle')}
                    action={can('exams', 'create') && <Button leftIcon={CalendarPlus} onClick={() => setAdding(true)}>{t('examsPage.addRoutine')}</Button>}>{t('examsPage.noPapersBody')}</EmptyState></Card>
            ) : byClass.map(([classId, g]) => {
                const rows = sittings(g.papers);
                return (
                    <Card key={classId} className="gap-1">
                        <CardHeader title={g.name} subtitle={t('examsPage.classSub', { count: rows.length, n: formatCount(rows.length, df.lang) })} />
                        <ul className="flex flex-col divide-y divide-line-subtle">
                            {rows.map((s) => {
                                const e = s.papers.reduce((n, p) => n + p.marks_entered, 0);
                                const need = s.papers.reduce((n, p) => n + p.enrolled, 0);
                                const weekday = t(`parentHome.day.${new Date(`${s.date}T12:00:00`).getDay()}`);
                                return (
                                    <li key={s.key} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3.5">
                                        <div className="flex w-full items-center gap-3 sm:w-[190px] sm:shrink-0">
                                            <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px] bg-primary-soft text-primary-text">
                                                <span className="type-small-semibold">{df.day(s.date)}</span>
                                                <span className="type-micro">{df.monthShort(s.date)}</span>
                                            </span>
                                            <span className="flex min-w-0 flex-col">
                                                <span className="type-small-semibold text-ink">{weekday}</span>
                                                <span className="type-caption text-muted">{s.start ? `${df.time(s.start)}${s.end ? ` – ${df.time(s.end)}` : ''}` : t('examsPage.noTime')}</span>
                                            </span>
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="type-body-semibold text-ink">{s.subject}</span>
                                                <span className="type-caption text-muted">{t('examsPage.outOf', { n: formatCount(s.max, df.lang) })}</span>
                                            </span>
                                            <span className="flex flex-wrap gap-1.5">{s.papers.map((p) => <Badge key={p.id} tone="neutral">{p.section_name}</Badge>)}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 sm:w-[190px] sm:shrink-0">
                                            <Meter value={need ? e / need : 0} tone={need && e >= need ? 'ok' : 'info'} height={6} label={s.subject} className="flex-1" />
                                            <span className="shrink-0 type-caption tabular-nums text-ink-2">{t('home.c.ofN', { a: formatCount(e, df.lang), b: formatCount(need, df.lang) })}</span>
                                            <ActionMenu label={t('examsPage.more')} items={[
                                                { label: t('examsPage.move'), icon: Pencil, onSelect: () => setMoving(s), hidden: !can('exams', 'update') },
                                                { label: t('examsPage.remove'), icon: Trash2, tone: 'bad', hidden: !can('exams', 'delete') || e > 0, onSelect: () => confirm({
                                                    title: t('examsPage.removeTitle', { subject: s.subject, cls: g.name }), body: t('examsPage.removeBody'),
                                                    confirmLabel: t('examsPage.remove'), onConfirm: () => removeSitting.mutate(s),
                                                }) },
                                            ]} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                );
            })}

            {editing && <ExamDialog exam={exam} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
            {adding && <RoutineDialog examId={exam.id} taken={new Set(all.map((p) => `${p.class_id}`))}
                onClose={() => setAdding(false)}
                onDone={(res) => { setAdding(false); refresh(); notify({ tone: 'ok', title: t('examsPage.added', { count: res.created, n: formatCount(res.created, df.lang) }), body: res.skipped ? t('examsPage.skipped', { count: res.skipped, n: formatCount(res.skipped, df.lang) }) : undefined }); }} />}
            {moving && <MoveDialog examId={exam.id} sitting={moving} onClose={() => setMoving(null)} onDone={() => { setMoving(null); refresh(); }} />}
        </div>
    );
}

function ExamDialog({ exam, onClose, onSaved }: { exam?: Exam; onClose: () => void; onSaved: (e: Exam) => void }) {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [name, setName] = useState(exam?.name ?? '');
    const [type, setType] = useState<ExamType>((exam?.exam_type as ExamType) ?? 'unit_test');
    const [term, setTerm] = useState(exam?.term ?? '');
    const [tried, setTried] = useState(false);
    const save = useMutation({
        mutationFn: () => exam
            ? examsService.updateExam(exam.id, { name: name.trim(), exam_type: type, term: term.trim() || null })
            : examsService.createExam({ name: name.trim(), exam_type: type, term: term.trim() || undefined, academic_year: currentAcademicYear() } as Omit<Exam, 'id'>),
        onSuccess: (e) => { qc.invalidateQueries({ queryKey: ['exams'] }); onSaved(e); },
    });
    const submit = () => { setTried(true); if (name.trim()) save.mutate(); };
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={CalendarCheck}
            title={exam ? t('examsPage.editTitle') : t('examsPage.newExam')} subtitle={t('examsPage.dialogSub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} onClick={submit}>{exam ? t('examsPage.save') : t('examsPage.create')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('examsPage.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <TextField label={t('examsPage.name')} placeholder={t('examsPage.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                error={tried && !name.trim() ? t('examsPage.nameError') : undefined} />
            <div className="flex flex-col gap-2">
                <p className="type-small-semibold text-ink">{t('examsPage.kind')}</p>
                <SegmentedControl options={TYPES.map((x) => ({ value: x, label: t(`examsPage.type.${x}`) }))} value={type} onChange={setType}
                    aria-label={t('examsPage.kind')} className="flex w-full [&>*]:flex-1" />
            </div>
            <TextField label={t('examsPage.term')} optional={t('peopleForms.optional')} placeholder={t('examsPage.termPlaceholder')} value={term} onChange={(e) => setTerm(e.target.value)} maxLength={20} />
        </Dialog>
    );
}

interface Row { include: boolean; date: string; start: string; end: string; max: string }

/** One class's papers: a date and time for each subject, for every section or some. */
function RoutineDialog({ examId, taken, onClose, onDone }: {
    examId: number;
    taken: Set<string>;
    onClose: () => void;
    onDone: (res: { created: number; skipped: number }) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });
    const list = classes.data?.classes ?? [];
    const [classId, setClassId] = useState('');
    const cid = Number(classId) || undefined;
    const sections = useQuery({ queryKey: ['sections', cid], queryFn: () => academicsService.getSections({ class_id: cid, limit: 100 }), enabled: !!cid });
    const subjects = useQuery({ queryKey: ['class-subjects', cid], queryFn: () => academicsService.getClassSubjects(cid!), enabled: !!cid });
    const [secIds, setSecIds] = useState<number[] | null>(null);         // null = every section
    const [rows, setRows] = useState<Record<number, Row>>({});
    const [first, setFirst] = useState(isoLocal(new Date()));
    const [start, setStart] = useState('10:00');
    const [end, setEnd] = useState('13:00');
    const [max, setMax] = useState('100');
    const [tried, setTried] = useState(false);

    const subjectList = subjects.data ?? [];
    const rowOf = (id: number): Row => rows[id] ?? { include: true, date: '', start, end, max };
    const setRow = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...rowOf(id), ...patch } }));
    const pickClass = (v: string) => { setClassId(v); setSecIds(null); setRows({}); setTried(false); };

    /** One paper a school day from the first date, in the order listed; Saturdays skipped. */
    const fillDates = () => {
        const d = new Date(`${first}T12:00:00`);
        const next: Record<number, Row> = { ...rows };
        for (const s of subjectList) {
            const r = rowOf(s.subject_id);
            if (!r.include) continue;
            while (d.getDay() === 6) d.setDate(d.getDate() + 1);
            next[s.subject_id] = { ...r, date: isoLocal(d), start, end, max };
            d.setDate(d.getDate() + 1);
        }
        setRows(next);
    };

    const chosen = subjectList.filter((s) => rowOf(s.subject_id).include);
    const bad = chosen.filter((s) => { const r = rowOf(s.subject_id); return !r.date || !(Number(r.max) > 0) || (r.start && r.end && r.end <= r.start); });
    const save = useMutation({
        mutationFn: () => examsService.createRoutine(examId, {
            class_id: cid!,
            section_ids: secIds ?? undefined,
            papers: chosen.map((s) => {
                const r = rowOf(s.subject_id);
                return { subject_id: s.subject_id, exam_date: r.date, start_time: r.start || undefined, end_time: r.end || undefined, max_marks: Number(r.max) };
            }),
        }),
        onSuccess: onDone,
    });
    const submit = () => { setTried(true); if (cid && chosen.length && !bad.length && (secIds === null || secIds.length)) save.mutate(); };
    const secList = sections.data?.sections ?? [];

    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={CalendarPlus} size="lg"
            title={t('examsPage.routineTitle')} subtitle={t('examsPage.routineSub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button leftIcon={CalendarPlus} loading={save.isPending} disabled={!cid} onClick={submit}>
                    {chosen.length ? t('examsPage.addPapers', { count: chosen.length, n: formatCount(chosen.length, df.lang) }) : t('examsPage.addRoutine')}
                </Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('examsPage.routineFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <SelectField label={t('examsPage.class')} value={classId} placeholder={t('examsPage.pickClass')} onChange={(e) => pickClass(e.target.value)}
                options={list.map((c) => ({ value: String(c.id), label: taken.has(String(c.id)) ? t('examsPage.classHas', { name: c.name }) : c.name }))} />
            {cid && (
                <>
                    {secList.length > 1 && (
                        <fieldset className="flex flex-col gap-2">
                            <legend className="pb-2 type-small-semibold text-ink">{t('examsPage.sections')}</legend>
                            <div className="flex flex-wrap gap-3">
                                {secList.map((s) => (
                                    <Checkbox key={s.id} label={s.name} checked={secIds === null || secIds.includes(s.id)}
                                        onChange={() => setSecIds((cur) => {
                                            const now = cur ?? secList.map((x) => x.id);
                                            const next = now.includes(s.id) ? now.filter((x) => x !== s.id) : [...now, s.id];
                                            return next.length === secList.length ? null : next;
                                        })} />
                                ))}
                            </div>
                            {tried && secIds !== null && secIds.length === 0 && <p role="alert" className="type-small text-bad">{t('examsPage.pickSection')}</p>}
                        </fieldset>
                    )}
                    {subjects.isPending ? <Skeleton className="h-40" /> : subjectList.length === 0 ? (
                        <Banner tone="warn" title={t('examsPage.noSubjectsTitle')}>{t('examsPage.noSubjectsBody')}</Banner>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2.5 rounded-row bg-surface-2 p-3">
                                <p className="type-small-semibold text-ink">{t('examsPage.sameForAll')}</p>
                                <FormRow>
                                    <TextField type="date" label={t('examsPage.firstDay')} value={first} onChange={(e) => setFirst(e.target.value)} hint={first ? df.date(first) : undefined} />
                                    <TextField label={t('examsPage.fullMarks')} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ''))} />
                                </FormRow>
                                <FormRow>
                                    <TextField type="time" label={t('examsPage.starts')} value={start} onChange={(e) => setStart(e.target.value)} />
                                    <TextField type="time" label={t('examsPage.ends')} value={end} onChange={(e) => setEnd(e.target.value)} />
                                </FormRow>
                                <Button variant="secondary" size="sm" leftIcon={Wand2} className="w-fit" onClick={fillDates}>{t('examsPage.fill')}</Button>
                            </div>
                            <ul className="flex flex-col divide-y divide-line-subtle rounded-row border border-line">
                                {subjectList.map((s) => {
                                    const r = rowOf(s.subject_id);
                                    const wrong = tried && r.include && (!r.date || !(Number(r.max) > 0) || (r.start && r.end && r.end <= r.start));
                                    return (
                                        <li key={s.subject_id} className={cn('flex flex-col gap-2 px-3 py-2.5', !r.include && 'opacity-60')}>
                                            <Checkbox checked={r.include} onChange={() => setRow(s.subject_id, { include: !r.include })}
                                                label={<span className="type-body-semibold text-ink">{s.subject_name}</span>} />
                                            {r.include && (
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    <TextField type="date" label={t('examsPage.date')} value={r.date} onChange={(e) => setRow(s.subject_id, { date: e.target.value })}
                                                        hint={r.date ? df.date(r.date, 'dayMonth') : undefined} error={wrong && !r.date ? t('examsPage.dateError') : undefined} />
                                                    <TextField type="time" label={t('examsPage.starts')} value={r.start} onChange={(e) => setRow(s.subject_id, { start: e.target.value })} />
                                                    <TextField type="time" label={t('examsPage.ends')} value={r.end} onChange={(e) => setRow(s.subject_id, { end: e.target.value })}
                                                        error={wrong && r.start && r.end && r.end <= r.start ? t('examsPage.endError') : undefined} />
                                                    <TextField label={t('examsPage.fullMarks')} inputMode="numeric" value={r.max} onChange={(e) => setRow(s.subject_id, { max: e.target.value.replace(/[^\d.]/g, '') })}
                                                        error={wrong && !(Number(r.max) > 0) ? t('examsPage.maxError') : undefined} />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            {tried && chosen.length === 0 && <p role="alert" className="type-small text-bad">{t('examsPage.pickSubject')}</p>}
                        </>
                    )}
                </>
            )}
            <p className="type-caption text-muted">{t('examsPage.routineNote')}</p>
        </Dialog>
    );
}

/** Move a sitting (every section's paper together) or change its full marks. */
function MoveDialog({ examId, sitting, onClose, onDone }: { examId: number; sitting: Sitting; onClose: () => void; onDone: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [date, setDate] = useState(sitting.date);
    const [start, setStart] = useState(sitting.start?.slice(0, 5) ?? '');
    const [end, setEnd] = useState(sitting.end?.slice(0, 5) ?? '');
    const [max, setMax] = useState(String(sitting.max));
    const bad = !date || !(Number(max) > 0) || (!!start && !!end && end <= start);
    const save = useMutation({
        mutationFn: async () => {
            for (const p of sitting.papers) {
                await examsService.updatePaper(examId, p.id, { exam_date: date, start_time: start || null, end_time: end || null, max_marks: Number(max) });
            }
        },
        onSuccess: onDone,
    });
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={Pencil}
            title={t('examsPage.moveTitle', { subject: sitting.subject })}
            subtitle={t('examsPage.moveSub', { sections: sitting.papers.map((p) => `${p.class_name} ${p.section_name}`).join(', ') })}
            closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} disabled={bad} onClick={() => save.mutate()}>{t('examsPage.save')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('examsPage.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <FormRow>
                <TextField type="date" label={t('examsPage.date')} value={date} onChange={(e) => setDate(e.target.value)} hint={date ? df.date(date) : undefined} />
                <TextField label={t('examsPage.fullMarks')} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ''))} />
            </FormRow>
            <FormRow>
                <TextField type="time" label={t('examsPage.starts')} value={start} onChange={(e) => setStart(e.target.value)} />
                <TextField type="time" label={t('examsPage.ends')} value={end} onChange={(e) => setEnd(e.target.value)}
                    error={start && end && end <= start ? t('examsPage.endError') : undefined} />
            </FormRow>
            <p className="type-caption text-muted">{t('examsPage.moveNote')}</p>
        </Dialog>
    );
}
