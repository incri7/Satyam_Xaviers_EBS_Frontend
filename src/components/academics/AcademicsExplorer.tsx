import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle, AlertTriangle, BookMarked, CalendarClock, ChevronRight, Info, Layers, Pencil, Plus, RotateCw, UserCheck,
} from 'lucide-react';

import {
    Badge, Button, Card, CardHeader, EmptyState, IconButton, IconTile, ListCard, ListRow, Meter, Person, SearchField,
    Skeleton, Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr,
} from '../../design-system';
import { Toolbar } from '../layout/AppPage';
import { AccessControl } from '../AccessControl';
import { ViewToggle, useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { academicsService, type ClassDetail, type ClassSubjectRow } from '../../api/services/academics.service';
import { STAGES, seatTone, useClassOverview, type ClassOverview, type Stage } from '../../features/academics/queries';
import { ManageSubjectsDialog, PickTeacherDialog } from '../../features/academics/dialogs';
import { CreateSectionModal } from './CreateSectionModal';
import { CreateEnrollmentModal } from './CreateEnrollmentModal';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

type View =
    | { level: 'classes' }
    | { level: 'class'; classId: number; className: string }
    | { level: 'section'; classId: number; className: string; sectionId: number };

/**
 * Figma F08 Classes → F09 Class detail → F10 Section detail, one drill-down.
 */
export function AcademicsExplorer() {
    const [view, setView] = useState<View>({ level: 'classes' });
    if (view.level === 'class') {
        return (
            <ClassPage
                classId={view.classId}
                className={view.className}
                onBack={() => setView({ level: 'classes' })}
                onOpenSection={(sectionId) => setView({ level: 'section', classId: view.classId, className: view.className, sectionId })}
            />
        );
    }
    if (view.level === 'section') {
        return (
            <SectionPage
                classId={view.classId}
                className={view.className}
                sectionId={view.sectionId}
                onClasses={() => setView({ level: 'classes' })}
                onClass={() => setView({ level: 'class', classId: view.classId, className: view.className })}
                onSwitch={(classId, className, sectionId) => setView({ level: 'section', classId, className, sectionId })}
            />
        );
    }
    return <ClassList onOpen={(c) => setView({ level: 'class', classId: c.id, className: c.name })} />;
}

// ── Crumbs ────────────────────────────────────────────────────────────────────
function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 type-small">
            {items.map((it, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={14} className="text-muted" aria-hidden />}
                    {it.onClick ? (
                        <button type="button" onClick={it.onClick} className="rounded-sm font-medium text-ink-2 outline-none hover:text-primary-text focus-visible:ring-3 focus-visible:ring-focus/60">
                            {it.label}
                        </button>
                    ) : (
                        <span aria-current="page" className="text-muted">{it.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

function SeatMeter({ filled, capacity, height = 6 }: { filled: number; capacity: number; height?: number }) {
    const { t } = useTranslation();
    return <Meter value={capacity ? filled / capacity : 0} tone={seatTone(filled, capacity)} height={height} label={t('classesPage.card.seats', { filled, total: capacity })} />;
}

// ── F08: classes ─────────────────────────────────────────────────────────────
function ClassList({ onOpen }: { onOpen: (c: { id: number; name: string }) => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [view, setView] = useViewMode('academics_classes_view', 'cards');
    const [search, setSearch] = useState('');
    const [stage, setStage] = useState<Stage | 'all'>('all');
    const { rows, isPending, isError, refetch } = useClassOverview();

    const present = STAGES.filter((s) => rows.some((r) => r.stage === s));
    const shown = rows
        .filter((r) => stage === 'all' || r.stage === stage)
        .filter((r) => r.klass.name.toLowerCase().includes(search.trim().toLowerCase()));

    const sections = rows.reduce((n, r) => n + r.sections.length, 0);
    const students = rows.reduce((n, r) => n + r.students, 0);
    const capacity = rows.reduce((n, r) => n + r.capacity, 0);
    const n = (v: number) => formatCount(v, lang);
    const summaryLine = (r: ClassOverview) =>
        `${t('classesPage.card.sections', { count: r.sections.length, n: n(r.sections.length) })}, ${t('classesPage.card.students', { count: r.students, n: n(r.students) })}`;

    const chip = (value: Stage | 'all', label: string, count: number) => {
        const on = stage === value;
        return (
            <button key={value} type="button" aria-pressed={on} onClick={() => setStage(value)}
                className={cn(
                    'inline-flex h-[34px] shrink-0 items-center gap-2 rounded-full px-3 type-small-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                    on ? 'bg-inverse text-on-inverse' : 'bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-sunken',
                )}>
                {label}
                <span className={cn('rounded-full px-1.5 type-micro-bold', on ? 'bg-white/20' : 'bg-sunken')}>{n(count)}</span>
            </button>
        );
    };

    const error = (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={refetch}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    );
    const empty = (
        <EmptyState icon={Layers} title={search || stage !== 'all' ? t('academics.noClassesMatch') : t('academics.noClassesYet')}>
            {search || stage !== 'all' ? t('academics.noClassesMatchHint') : t('academics.noClassesYetHint')}
        </EmptyState>
    );

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {/* Year summary (Figma "Year summary") */}
            <div className="grid grid-cols-2 rounded-card border border-line bg-surface py-3 shadow-e1 md:grid-cols-4 md:py-4">
                {[
                    [t('classesPage.summary.classes'), n(rows.length), null],
                    [t('classesPage.summary.sections'), n(sections), null],
                    [t('classesPage.summary.students'), n(students), null],
                    [t('classesPage.summary.seats'), capacity ? `${n(Math.round((students / capacity) * 100))}%` : '—', capacity ? t('classesPage.summary.seatsOf', { filled: n(students), total: n(capacity) }) : null],
                ].map(([label, value, sub], i) => (
                    <div key={i} className={cn('flex flex-col gap-0.5 px-4 py-1 md:px-5', i % 2 === 0 && 'max-md:border-r', i < 3 && 'md:border-r', 'border-line-subtle')}>
                        <span className="type-small text-muted">{label}</span>
                        <span className="flex flex-wrap items-baseline gap-2">
                            {isPending ? <Skeleton className="h-7 w-12" /> : <span className="type-figure-m text-ink">{value}</span>}
                            {sub && <span className="type-caption text-muted">{sub}</span>}
                        </span>
                    </div>
                ))}
            </div>

            <Toolbar end={<ViewToggle value={view} onChange={setView} />}>
                <SearchField value={search} onChange={setSearch} placeholder={t('classesPage.search.classes')} clearLabel={t('common.clear')} containerClassName="md:w-[220px]" />
                <div className="flex gap-1.5 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none]">
                    {chip('all', t('classesPage.stage.all'), rows.length)}
                    {present.map((s) => chip(s, t(`classesPage.stage.${s}`), rows.filter((r) => r.stage === s).length))}
                </div>
            </Toolbar>

            {/* Cards (default, as in Figma), always on phones */}
            <div className={cn(view === 'table' && 'md:hidden')}>
                {isPending ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[162px] rounded-card" />)}</div>
                ) : isError ? (
                    <Card>{error}</Card>
                ) : shown.length === 0 ? (
                    <Card>{empty}</Card>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-3.5">
                        {shown.map((r) => (
                            <button key={r.klass.id} type="button" onClick={() => onOpen(r.klass)}
                                className="group flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-[18px] text-left shadow-e1 outline-none transition-[box-shadow,border-color] duration-200 hover:border-primary-soft-line hover:shadow-e2 focus-visible:ring-3 focus-visible:ring-focus/60">
                                <span className="flex items-center gap-2.5">
                                    <IconTile icon={Layers} tone="brand" size={36} />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate type-h3 text-ink">{r.klass.name}</span>
                                        <span className="truncate type-caption text-muted">{summaryLine(r)}</span>
                                    </span>
                                    <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                                </span>
                                <span className="flex min-w-0 items-center gap-2 type-small text-ink-2">
                                    <UserCheck size={15} className="shrink-0 text-muted" aria-hidden />
                                    <span className="truncate">{r.teacherNames.length ? r.teacherNames.join(', ') : t('classesPage.card.noClassTeacher')}</span>
                                </span>
                                {r.missingTeacher.length > 0 && r.teacherNames.length > 0 && (
                                    <span className="flex items-center gap-1.5 rounded-[10px] bg-warn-soft px-2.5 py-1.5 type-caption-semibold text-warn">
                                        <AlertTriangle size={13} aria-hidden />
                                        {t('classesPage.card.missing', { count: r.missingTeacher.length, sections: r.missingTeacher.join(', ') })}
                                    </span>
                                )}
                                <span className="mt-auto flex flex-col gap-1.5">
                                    <span className="flex items-center justify-between type-caption">
                                        <span className="text-muted">{t('classesPage.card.capacity')}</span>
                                        <span className="font-semibold text-ink-2">{r.capacity ? t('classesPage.card.seats', { filled: n(r.students), total: n(r.capacity) }) : t('classesPage.card.noLimit')}</span>
                                    </span>
                                    <SeatMeter filled={r.students} capacity={r.capacity} />
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Table, from md up when chosen */}
            {view === 'table' && (
                <TableCard className="max-md:hidden">
                    <Table>
                        <THead>
                            <Th>{t('classesPage.col.class')}</Th>
                            <Th>{t('classesPage.col.sections')}</Th>
                            <Th>{t('classesPage.col.students')}</Th>
                            <Th>{t('classesPage.col.classTeacher')}</Th>
                            <Th className="w-[220px]">{t('classesPage.col.capacity')}</Th>
                            <Th><span className="sr-only">{t('classesPage.col.actions')}</span></Th>
                        </THead>
                        <tbody>
                            {isPending ? <TableSkeletonRows columns={6} /> : isError ? <TableMessage columns={6}>{error}</TableMessage> : shown.length === 0 ? <TableMessage columns={6}>{empty}</TableMessage> : shown.map((r) => (
                                <Tr key={r.klass.id} className="cursor-pointer" onClick={() => onOpen(r.klass)}>
                                    <Td><span className="flex items-center gap-2.5"><IconTile icon={Layers} tone="brand" size={32} /><span className="type-body-semibold text-ink">{r.klass.name}</span></span></Td>
                                    <Td className="tabular-nums">{n(r.sections.length)}</Td>
                                    <Td className="tabular-nums">{n(r.students)}</Td>
                                    <Td>{r.teacherNames.join(', ') || <span className="text-muted">{t('classesPage.card.noClassTeacher')}</span>}</Td>
                                    <Td>
                                        <span className="flex flex-col gap-1">
                                            <span className="type-caption text-ink-2">{r.capacity ? t('classesPage.card.seats', { filled: n(r.students), total: n(r.capacity) }) : t('classesPage.card.noLimit')}</span>
                                            <SeatMeter filled={r.students} capacity={r.capacity} />
                                        </span>
                                    </Td>
                                    <Td><span className="flex justify-end"><IconButton icon={ChevronRight} label={r.klass.name} onClick={(e) => { e.stopPropagation(); onOpen(r.klass); }} /></span></Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                </TableCard>
            )}
        </div>
    );
}

// ── Shared: subjects table (F09/F10) ──────────────────────────────────────────
function useClassSubjects(classId: number) {
    return useQuery({ queryKey: ['class-subjects', classId], queryFn: () => academicsService.getClassSubjects(classId) });
}

function SubjectsCard({ classId, className }: { classId: number; className: string }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const subjects = useClassSubjects(classId);
    const [managing, setManaging] = useState(false);
    const [assigning, setAssigning] = useState<ClassSubjectRow | null>(null);
    const [error, setError] = useState<string | null>(null);
    const teachers = useQuery({ queryKey: ['teacher-options'], queryFn: academicsService.getTeacherOptions, enabled: !!assigning, staleTime: 5 * 60 * 1000 });

    const setTeacher = useMutation({
        mutationFn: ({ csId, tId }: { csId: number; tId: number | null }) => academicsService.setClassSubjectTeacher(csId, tId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['class-subjects', classId] }); queryClient.invalidateQueries({ queryKey: ['class-detail', classId] }); setAssigning(null); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const rows = subjects.data ?? [];
    const manage = (
        <AccessControl id="classes_update">
            <Button variant="quiet" size="sm" leftIcon={BookMarked} onClick={() => setManaging(true)}>{t('classesPage.action.manageSubjects')}</Button>
        </AccessControl>
    );

    return (
        <>
            <TableCard title={t('classesPage.detail.subjectsTitle')} subtitle={rows.length ? `${t('classesPage.card.subjects', { count: rows.length, n: rows.length })}. ${t('classesPage.detail.subjectsSub')}` : undefined} action={manage}>
                {subjects.isPending ? (
                    <Table><tbody><TableSkeletonRows columns={3} rows={4} /></tbody></Table>
                ) : rows.length === 0 ? (
                    <EmptyState icon={BookMarked} title={t('classesPage.detail.noSubjects')}>{t('classesPage.detail.noSubjectsBody')}</EmptyState>
                ) : (
                    <Table>
                        <THead>
                            <Th>{t('classesPage.col.subject')}</Th>
                            <Th>{t('classesPage.col.teacher')}</Th>
                            <Th><span className="sr-only">{t('classesPage.col.actions')}</span></Th>
                        </THead>
                        <tbody>
                            {rows.map((cs) => (
                                <Tr key={cs.id}>
                                    <Td><span className="flex items-center gap-2.5"><IconTile icon={BookMarked} tone="info" size={32} /><span className="type-body-semibold text-ink">{cs.subject_name}</span></span></Td>
                                    <Td>{cs.teacher_name ? <Person name={cs.teacher_name} size={28} /> : <span className="text-muted">{t('classesPage.detail.noTeacher')}</span>}</Td>
                                    <Td>
                                        <span className="flex justify-end">
                                            <AccessControl id="classes_update">
                                                {cs.teacher_name
                                                    ? <IconButton icon={Pencil} label={`${t('classesPage.action.change')}: ${cs.subject_name}`} onClick={() => { setError(null); setAssigning(cs); }} />
                                                    : <Button variant="secondary" size="sm" onClick={() => { setError(null); setAssigning(cs); }}>{t('classesPage.action.assign')}</Button>}
                                            </AccessControl>
                                        </span>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </TableCard>

            {managing && (
                <ManageSubjectsDialog open onClose={() => setManaging(false)} classId={classId} className={className} currentIds={rows.map((r) => r.subject_id)} />
            )}
            {assigning && (
                <PickTeacherDialog
                    open
                    onClose={() => setAssigning(null)}
                    title={t('classesPage.dialog.subjectTeacherTitle', { subject: assigning.subject_name })}
                    subtitle={t('classesPage.dialog.subjectTeacherSub', { class: className })}
                    loading={teachers.isPending}
                    choices={(teachers.data ?? []).map((tc) => ({ id: tc.id, name: tc.name, sub: tc.subjects.map((s) => s.name).join(', ') || tc.designation || undefined }))}
                    currentId={assigning.teacher_id}
                    noneLabel={t('classesPage.dialog.noTeacherOption')}
                    emptyText={t('classesPage.dialog.noTeachers')}
                    onPick={(id) => setTeacher.mutate({ csId: assigning.id, tId: id })}
                    pending={setTeacher.isPending}
                    error={error}
                />
            )}
        </>
    );
}

// ── Class teacher picker (F09 section cards, F10 header) ──────────────────────
function useClassTeacherPicker(classId: number, className: string) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [target, setTarget] = useState<ClassDetail['sections'][number] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const detail = useQuery({ queryKey: ['class-detail', classId], queryFn: () => academicsService.getClassDetail(classId) });

    const save = useMutation({
        mutationFn: ({ sectionId, teacherId }: { sectionId: number; teacherId: number | null }) => academicsService.updateSection(sectionId, { class_teacher_id: teacherId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
            queryClient.invalidateQueries({ queryKey: ['sections'] });
            setTarget(null);
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const open = (s: ClassDetail['sections'][number]) => { setError(null); setTarget(s); };
    const ui = target && (
        <PickTeacherDialog
            open
            onClose={() => setTarget(null)}
            title={t('classesPage.dialog.classTeacherTitle', { section: `${className} ${target.name}` })}
            subtitle={t('classesPage.dialog.classTeacherSub', { class: className })}
            choices={(detail.data?.teachers ?? []).map((tc) => ({ id: tc.id, name: tc.name, sub: tc.subjects.join(', ') }))}
            currentId={target.class_teacher_id}
            noneLabel={t('classesPage.dialog.noneOption')}
            emptyText={t('classesPage.dialog.noCandidates')}
            onPick={(id) => save.mutate({ sectionId: target.id, teacherId: id })}
            pending={save.isPending}
            error={error}
        />
    );
    return { detail, open, ui };
}

// ── F09: one class ───────────────────────────────────────────────────────────
function ClassPage({ classId, className, onBack, onOpenSection }: { classId: number; className: string; onBack: () => void; onOpenSection: (sectionId: number) => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const subjects = useClassSubjects(classId);
    const { detail, open: pickTeacher, ui: teacherUi } = useClassTeacherPicker(classId, className);
    const [adding, setAdding] = useState(false);
    const n = (v: number) => formatCount(v, lang);

    const sections = detail.data?.sections ?? [];
    const students = sections.reduce((s, x) => s + x.enrolled_count, 0);
    const capacity = sections.reduce((s, x) => s + (x.capacity ?? 0), 0);
    const used = new Set(sections.map((s) => s.name.toUpperCase()));
    const nextLetter = 'ABCDEFGH'.split('').find((l) => !used.has(l)) ?? '';
    const seatDefault = sections.find((s) => s.capacity)?.capacity ?? 40;

    const addSection = (
        <AccessControl id="sections_create">
            <Button leftIcon={Plus} onClick={() => setAdding(true)}>{t('classesPage.action.addSection')}</Button>
        </AccessControl>
    );

    return (
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-[18px]">
            <Crumbs items={[{ label: t('classesPage.tabs.classes'), onClick: onBack }, { label: className }]} />

            <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-e1 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <IconTile icon={Layers} tone="brand" size={52} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="type-h2 text-ink">{className}</h2>
                        {detail.isPending ? <Skeleton className="h-3.5 w-56" /> : (
                            <p className="type-body text-ink-2">
                                {[
                                    t('classesPage.card.sections', { count: sections.length, n: n(sections.length) }),
                                    t('classesPage.card.students', { count: students, n: n(students) }),
                                    t('classesPage.card.subjects', { count: subjects.data?.length ?? detail.data?.subject_count ?? 0, n: n(subjects.data?.length ?? detail.data?.subject_count ?? 0) }),
                                ].join(', ')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 gap-2 max-md:[&>*]:flex-1">{addSection}</div>
            </header>

            {detail.isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('classesPage.detail.notFound')} action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void detail.refetch()}>{t('classesPage.action.retry')}</Button>} /></Card>
            ) : (
                <section aria-labelledby="sections-heading" className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 id="sections-heading" className="type-title text-ink">{t('classesPage.detail.sectionsHeading')}</h3>
                        {capacity > 0 && <p className="type-small text-muted">{t('classesPage.detail.capacityLine', { total: n(capacity), filled: n(students) })}</p>}
                    </div>
                    {detail.isPending ? (
                        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[247px] rounded-card" />)}</div>
                    ) : (
                        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                            {sections.map((s) => {
                                const cap = s.capacity ?? 0;
                                const tone = seatTone(s.enrolled_count, cap);
                                const pct = cap ? Math.round((s.enrolled_count / cap) * 100) : 0;
                                return (
                                    <article key={s.id} className="flex min-w-0 flex-col gap-3.5 rounded-card border border-line bg-surface p-[18px] shadow-e1">
                                        <header className="flex items-center gap-3">
                                            <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-primary type-h3 text-on-primary">{s.name.slice(0, 2)}</span>
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <h4 className="truncate type-title text-ink">{className} {s.name}</h4>
                                                <p className="type-caption text-muted">{t('classesPage.card.students', { count: s.enrolled_count, n: n(s.enrolled_count) })}</p>
                                            </div>
                                            {tone !== 'ok' && <Badge tone={tone} dot>{tone === 'bad' ? t('classesPage.detail.full') : t('classesPage.detail.pctFull', { pct: n(pct) })}</Badge>}
                                        </header>
                                        <div className="flex items-center gap-2.5 rounded-row bg-surface-2 px-3 py-2.5">
                                            <span className="min-w-0 flex-1">
                                                {s.class_teacher_name
                                                    ? <Person name={s.class_teacher_name} sub={t('classesPage.detail.classTeacher')} />
                                                    : <span className="flex flex-col"><span className="type-small-semibold text-ink-2">{t('classesPage.detail.notAssigned')}</span><span className="type-caption text-muted">{t('classesPage.detail.classTeacher')}</span></span>}
                                            </span>
                                            <AccessControl id="sections_update">
                                                <Button variant="ghost" size="sm" onClick={() => pickTeacher(s)}>{s.class_teacher_name ? t('classesPage.action.change') : t('classesPage.action.assign')}</Button>
                                            </AccessControl>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className={cn('type-small-semibold', tone === 'bad' ? 'text-bad' : 'text-ink-2')}>
                                                {cap ? t('classesPage.card.seats', { filled: n(s.enrolled_count), total: n(cap) }) : t('classesPage.card.noLimit')}
                                            </span>
                                            <SeatMeter filled={s.enrolled_count} capacity={cap} height={8} />
                                        </div>
                                        <Button variant="secondary" size="sm" fullWidth rightIcon={ChevronRight} onClick={() => onOpenSection(s.id)}>{t('classesPage.action.openSection')}</Button>
                                    </article>
                                );
                            })}
                            <AccessControl id="sections_create">
                                <button type="button" onClick={() => setAdding(true)}
                                    className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line bg-surface-2 p-5 text-center outline-none transition-colors hover:border-primary-soft-line hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-focus/60">
                                    <IconTile icon={Plus} tone="brand" size={40} />
                                    <span className="type-title text-ink">{nextLetter ? t('classesPage.detail.addSectionCard', { letter: nextLetter }) : t('classesPage.action.addSection')}</span>
                                    <span className="max-w-[260px] type-small text-muted">{sections.length ? t('classesPage.detail.addSectionHint') : t('classesPage.detail.noSectionsBody')}</span>
                                </button>
                            </AccessControl>
                        </div>
                    )}
                </section>
            )}

            <SubjectsCard classId={classId} className={className} />

            {teacherUi}
            {adding && (
                <CreateSectionModal isOpen onClose={() => setAdding(false)} classId={classId} className={className} suggestedName={nextLetter} suggestedSeats={seatDefault} />
            )}
        </div>
    );
}

// ── F10: one section ─────────────────────────────────────────────────────────
function SectionPage({
    classId, className, sectionId, onClasses, onClass, onSwitch,
}: {
    classId: number; className: string; sectionId: number;
    onClasses: () => void; onClass: () => void;
    onSwitch: (classId: number, className: string, sectionId: number) => void;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const { detail, open: pickTeacher, ui: teacherUi } = useClassTeacherPicker(classId, className);
    const [enrolling, setEnrolling] = useState(false);
    const allClasses = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });
    const students = useQuery({
        queryKey: ['enrollments', 'section', sectionId],
        queryFn: () => academicsService.getEnrollments({ class_id: classId, section_id: sectionId, limit: 100 }),
    });
    const n = (v: number) => formatCount(v, lang);

    const sections = detail.data?.sections ?? [];
    const section = sections.find((s) => s.id === sectionId);
    const cap = section?.capacity ?? 0;
    const filled = section?.enrolled_count ?? 0;
    const tone = seatTone(filled, cap);

    // Switching class lands on its first section, never a section of another class.
    const switchClass = (id: string) => {
        const target = (allClasses.data?.classes ?? []).find((c) => String(c.id) === id);
        if (!target || target.id === classId) return;
        academicsService.getClassDetail(target.id).then((d) => {
            const first = d.sections?.[0];
            if (first) onSwitch(target.id, target.name, first.id);
        });
    };

    const list = students.data?.enrollments ?? [];

    return (
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-[18px]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Crumbs items={[{ label: t('classesPage.tabs.classes'), onClick: onClasses }, { label: className, onClick: onClass }, { label: t('classesPage.section.crumb', { name: section?.name ?? '' }) }]} />
                <div className="flex gap-2">
                    <SelectMenu value={String(classId)} onChange={switchClass} label={t('classesPage.section.switchClass')} icon={<Layers />}
                        options={(allClasses.data?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />
                    <SelectMenu value={String(sectionId)} onChange={(id) => onSwitch(classId, className, Number(id))} label={t('classesPage.section.switchSection')}
                        options={sections.map((s) => ({ value: String(s.id), label: t('classesPage.section.crumb', { name: s.name }) }))} />
                </div>
            </div>

            <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-e1 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span className="grid size-[52px] shrink-0 place-items-center rounded-[16px] bg-primary type-h2 text-on-primary">{section?.name.slice(0, 2) ?? ''}</span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="type-h2 text-ink">{className} {section?.name}</h2>
                            {section && tone !== 'ok' && <Badge tone={tone} dot>{tone === 'bad' ? t('classesPage.detail.full') : t('classesPage.detail.pctFull', { pct: n(Math.round((filled / cap) * 100)) })}</Badge>}
                        </div>
                        <p className="type-body text-ink-2">
                            {section?.class_teacher_name ? t('classesPage.section.teacherLine', { name: section.class_teacher_name }) : t('classesPage.section.noTeacherLine')}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-5 max-lg:border-t max-lg:border-line-subtle max-lg:pt-3">
                    <div className="flex flex-col">
                        <span className="type-caption text-muted">{t('classesPage.section.students')}</span>
                        <span className="type-title tabular-nums text-ink">{cap ? t('classesPage.card.seats', { filled: n(filled), total: n(cap) }) : n(filled)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 max-md:[&>*]:flex-1">
                    <Button variant="quiet" leftIcon={CalendarClock} onClick={() => navigate('/timetable')}>{t('classesPage.action.openTimetable')}</Button>
                    {section && (
                        <AccessControl id="sections_update">
                            <Button variant="quiet" leftIcon={UserCheck} onClick={() => pickTeacher(section)}>{t('classesPage.action.assignClassTeacher')}</Button>
                        </AccessControl>
                    )}
                </div>
            </header>

            <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-4">
                <SubjectsCard classId={classId} className={className} />

                <Card className="gap-2">
                    <CardHeader
                        title={t('classesPage.section.students')}
                        subtitle={t('classesPage.section.studentsSub', { count: list.length, n: n(students.data?.total_count ?? list.length) })}
                        action={
                            <AccessControl id="enrollments_create">
                                <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setEnrolling(true)}>{t('classesPage.action.enrolShort')}</Button>
                            </AccessControl>
                        }
                    />
                    {cap > 0 && <SeatMeter filled={filled} capacity={cap} />}
                    {students.isPending ? (
                        <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
                    ) : list.length === 0 ? (
                        <p className="py-6 text-center type-small text-muted">{t('classesPage.section.noStudents')}</p>
                    ) : (
                        <ListCard className="border-0 px-0 py-0 shadow-none">
                            {list.map((e, i) => (
                                <ListRow key={e.id}>
                                    <span className="w-6 shrink-0 text-right type-caption tabular-nums text-muted">{n(i + 1)}</span>
                                    <span className="min-w-0 flex-1">
                                        <Person name={e.student ? [e.student.first_name, e.student.last_name].filter(Boolean).join(' ') : `#${e.student_id}`} sub={e.student?.admission_no} size={30} />
                                    </span>
                                </ListRow>
                            ))}
                        </ListCard>
                    )}
                    {tone === 'bad' && (
                        <p className="flex items-start gap-2 rounded-row bg-surface-2 px-3 py-2.5 type-small text-ink-2">
                            <Info size={16} className="mt-px shrink-0 text-muted" aria-hidden /> {t('classesPage.section.fullNote')}
                        </p>
                    )}
                </Card>
            </div>

            {teacherUi}
            {enrolling && <CreateEnrollmentModal isOpen onClose={() => setEnrolling(false)} classId={classId} sectionId={sectionId} />}
        </div>
    );
}
