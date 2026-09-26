import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BookMarked, CalendarClock, ClipboardList, Layers, Plus, RotateCw, UserRound, X } from 'lucide-react';

import {
    Badge, Button, EmptyState, FilterChips, ListCard, ListRow, Meter, SearchField, Skeleton, SortTh,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr,
} from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { Pagination } from '../../components/common/Pagination';
import { SelectMenu } from '../../components/common/SelectMenu';
import { assignmentsService, type Assignment, type AssignmentSort } from '../../api/services/assignments.service';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { NewAssignmentDialog } from '../../features/assignments/NewAssignmentDialog';
import { SubmissionsView } from '../../features/assignments/SubmissionsView';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useUrlState } from '../../hooks/useUrlState';
import { isoLocal } from '../../utils/nepaliDate';
import { formatCount } from '../../utils/money';

const PAGE_SIZE = 50;
type Due = '' | 'upcoming' | 'overdue';

/**
 * Figma C07 Assignments and C08 Assignment submissions. The list is paged,
 * searched and sorted on the server; opening an assignment shows its
 * submissions in place (?assignment= in the URL, so a reload comes back).
 */
const AssignmentsPage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const role = useAuthStore((s) => s.user?.role);
    const [noticeUI, notify] = useNotice();
    const canCreate = role === 'teacher' || role === 'admin' || role === 'principal';
    // Teachers only get their own assignments, so a teacher filter would have one entry.
    const showTeacher = role !== 'teacher';
    const list = useListControls<AssignmentSort>();
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [due, setDue] = useState<Due>('');
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useUrlState('assignment', '');
    const today = isoLocal(new Date());
    const inAWeek = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + 7); return isoLocal(d); })();

    const { data: options } = useQuery({
        queryKey: ['assignments', 'filter-options', classId],
        queryFn: () => assignmentsService.getFilterOptions(classId ? Number(classId) : undefined),
        staleTime: 5 * 60 * 1000,
    });
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['assignments', { search: list.search, classId, sectionId, subjectId, teacherId, due, sort: list.sort, page: list.page }],
        queryFn: () => assignmentsService.listAssignments({
            sort_by: list.sort.by ?? 'due_date',
            sort_dir: list.sort.by ? list.sort.dir : 'desc',
            skip: (list.page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            search: list.search || undefined,
            class_id: classId ? Number(classId) : undefined,
            section_id: sectionId ? Number(sectionId) : undefined,
            subject_id: subjectId ? Number(subjectId) : undefined,
            teacher_id: teacherId ? Number(teacherId) : undefined,
            status: due || undefined,
        }),
        placeholderData: keepPreviousData,
        enabled: !openId,
    });
    // The summary figures count across every assignment the caller can see.
    const dueSoon = useQuery({
        queryKey: ['assignments', 'due-soon', today],
        queryFn: () => assignmentsService.listAssignments({ due_after: today, due_before: inAWeek, sort_by: 'due_date', sort_dir: 'asc', limit: 100 }),
        enabled: !openId,
    });
    const openCount = useQuery({
        queryKey: ['assignments', 'open-count', today],
        queryFn: () => assignmentsService.listAssignments({ status: 'upcoming', limit: 1 }),
        enabled: !openId,
    });
    const opened = useQuery({
        queryKey: ['assignments', 'one', openId],
        queryFn: () => assignmentsService.getAssignment(Number(openId)),
        enabled: !!openId,
        initialData: () => data?.assignments.find((a) => String(a.id) === openId),
    });

    const rows: Assignment[] = data?.assignments ?? [];
    const total = data?.total_count;
    const soon = dueSoon.data?.assignments ?? [];
    const waiting = rows.reduce((n, a) => n + Math.max(0, a.submitted_count - a.graded_count), 0);
    const partial = total !== undefined && total > rows.length;

    const sectionOptions = options?.sections ?? [];
    const filtered = Boolean(list.search || classId || sectionId || subjectId || teacherId || due);
    const clear = () => { list.resetSearch(); setClassId(''); setSectionId(''); setSubjectId(''); setTeacherId(''); setDue(''); };
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={clear}>{t('common.clearFilters')}</Button> : undefined;
    const title = total === undefined ? t('assignmentsPage.title') : t('assignmentsPage.count', { count: total, n: formatCount(total, lang) });
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const dueText = (a: Assignment) => {
        const d = a.due_date.slice(0, 10);
        const days = Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 864e5);
        if (days === 0) return t('assignmentsPage.dueToday');
        if (days === 1) return t('assignmentsPage.dueTomorrow');
        if (days > 1) return t('assignmentsPage.dueIn', { count: days, n: formatCount(days, lang) });
        return t('assignmentsPage.dueAgo', { count: -days, n: formatCount(-days, lang) });
    };
    const statusBadge = (a: Assignment) => (a.due_date.slice(0, 10) < today
        ? <Badge tone="neutral">{t('assignmentsPage.closed')}</Badge>
        : <Badge tone="info" dot>{t('assignmentsPage.open')}</Badge>);
    // The API counts submission rows, which exist only once work is handed in
    // or recorded, not the class size — so this says how much of what came in
    // has been reviewed, rather than "x of the class".
    const progress = (a: Assignment) => (a.submitted_count ? (
        <span className="flex min-w-[130px] flex-col gap-1">
            <span className="type-caption tabular-nums text-ink-2">
                {t('assignmentsPage.handedInN', { count: a.submitted_count, n: formatCount(a.submitted_count, lang) })}
                <span className="text-muted"> · {t('assignmentsPage.reviewed', { n: formatCount(a.graded_count, lang) })}</span>
            </span>
            <Meter value={a.graded_count / a.submitted_count} tone={a.graded_count >= a.submitted_count ? 'ok' : 'brand'} label={t('assignmentsPage.reviewedLabel')} height={5} />
        </span>
    ) : <span className="type-caption text-muted">{t('assignmentsPage.noneIn')}</span>);
    const where = (a: Assignment) => [a.class_name ?? t('assignments.unknownClass'), sectionOptions.length > 1 ? a.section_name : null].filter(Boolean).join(' ');

    if (openId) {
        return (
            <AppPage title={t('assignmentsPage.subsTitle')}>
                {opened.data ? <SubmissionsView assignment={opened.data} onBack={() => setOpenId('')} />
                    : opened.isError ? <EmptyState icon={AlertCircle} tone="bad" title={t('assignmentsPage.notFound')} action={<Button variant="quiet" onClick={() => setOpenId('')}>{t('assignmentsPage.all')}</Button>} />
                        : <Skeleton className="h-[420px] rounded-card" />}
            </AppPage>
        );
    }

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={filtered ? t('assignments.noMatches') : t('assignments.noAssignments')}
            action={filtered ? clearButton : canCreate && <Button leftIcon={Plus} onClick={() => setCreating(true)}>{t('assignmentsPage.newButton')}</Button>}>
            {filtered ? t('peoplePage.empty.filtered') : t('assignmentsPage.emptyBody')}
        </EmptyState>
    ) : null;

    return (
        <AppPage title={t('assignmentsPage.title')}>
            <PageBar actions={canCreate && <Button leftIcon={Plus} onClick={() => setCreating(true)}>{t('assignmentsPage.newButton')}</Button>}>
                <p className="type-small text-muted">{t('assignmentsPage.intro')}</p>
            </PageBar>
            {noticeUI}

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-4">
                <KpiCard icon={CalendarClock} tone="warn" label={t('assignmentsPage.kpi.dueWeek')} value={formatCount(soon.length, lang)}
                    status={dueSoon.isPending ? 'loading' : dueSoon.isError ? 'error' : 'ready'} onRetry={() => void dueSoon.refetch()}
                    sub={<span className="truncate">{soon[0] ? `${soon[0].title}, ${dueText(soon[0]).toLowerCase()}` : t('assignmentsPage.kpi.nothingDue')}</span>} />
                <KpiCard icon={ClipboardList} tone="info" label={t('assignmentsPage.kpi.waiting')} value={formatCount(waiting, lang)}
                    status={isPending ? 'loading' : isError ? 'error' : 'ready'} onRetry={() => void refetch()}
                    sub={<span className="truncate">{partial ? t('assignmentsPage.kpi.onPage') : t('assignmentsPage.kpi.waitingSub')}</span>} />
                <div className="col-span-2 lg:col-span-1">
                    <KpiCard icon={ClipboardList} tone="brand" label={t('assignmentsPage.kpi.open')} value={formatCount(openCount.data?.total_count ?? 0, lang)}
                        status={openCount.isPending ? 'loading' : openCount.isError ? 'error' : 'ready'} onRetry={() => void openCount.refetch()}
                        sub={<span className="truncate">{t('assignmentsPage.kpi.openSub')}</span>} />
                </div>
            </div>

            <FilterChips aria-label={t('assignments.due')} value={due} onChange={list.filter(setDue)}
                items={[{ value: '' as Due, label: t('assignmentsPage.filter.all') }, { value: 'upcoming' as Due, label: t('assignmentsPage.filter.upcoming') }, { value: 'overdue' as Due, label: t('assignmentsPage.filter.overdue') }]} />
            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('assignments.searchPlaceholder')} clearLabel={t('common.clear')} containerClassName="md:w-[260px]" />
                <div className="flex gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none] [&>*]:shrink-0">
                    <SelectMenu value={classId} label={t('assignments.class')} icon={<Layers />} onChange={(v) => { setClassId(v); setSectionId(''); list.setPage(1); }}
                        options={[{ value: '', label: t('assignments.allClasses') }, ...(options?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} />
                    {!!classId && sectionOptions.length > 1 && (
                        <SelectMenu value={sectionId} label={t('assignments.section')} onChange={list.filter(setSectionId)}
                            options={[{ value: '', label: t('assignments.allSections') }, ...sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))]} />
                    )}
                    <SelectMenu value={subjectId} label={t('assignments.subject')} icon={<BookMarked />} onChange={list.filter(setSubjectId)}
                        options={[{ value: '', label: t('assignments.allSubjects') }, ...(options?.subjects ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} />
                    {showTeacher && (
                        <SelectMenu value={teacherId} label={t('assignments.teacher')} icon={<UserRound />} onChange={list.filter(setTeacherId)}
                            options={[{ value: '', label: t('assignments.allTeachers') }, ...(options?.teachers ?? []).map((tc) => ({ value: String(tc.id), label: tc.name }))]} />
                    )}
                </div>
            </Toolbar>

            <TableCard className="max-md:hidden" title={title} subtitle={t('assignmentsPage.tableSub')} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <SortTh k="title" sort={list.sort} onSort={list.toggleSort}>{t('assignments.assignment')}</SortTh>
                        <SortTh k="class" sort={list.sort} onSort={list.toggleSort}>{t('assignments.class')}</SortTh>
                        <SortTh k="subject" sort={list.sort} onSort={list.toggleSort}>{t('assignments.subject')}</SortTh>
                        {showTeacher && <SortTh k="teacher" sort={list.sort} onSort={list.toggleSort}>{t('assignments.teacher')}</SortTh>}
                        <SortTh k="due_date" sort={list.sort} onSort={list.toggleSort}>{t('assignments.dueDate')}</SortTh>
                        <Th>{t('assignmentsPage.handedInCol')}</Th>
                        <Th>{t('assignmentsPage.status')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={showTeacher ? 7 : 6} /> : message ? <TableMessage columns={showTeacher ? 7 : 6}>{message}</TableMessage> : rows.map((a) => (
                            <Tr key={a.id} onClick={() => setOpenId(String(a.id))} className="cursor-pointer">
                                <Td className="max-w-[300px]">
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate type-small-semibold text-ink">{a.title}</span>
                                        {a.description && <span className="truncate type-caption text-muted">{a.description}</span>}
                                    </span>
                                </Td>
                                <Td className="whitespace-nowrap">{where(a)}</Td>
                                <Td className="whitespace-nowrap">{a.subject_name ?? '—'}</Td>
                                {showTeacher && <Td className="max-w-[160px] truncate">{a.teacher_name ?? '—'}</Td>}
                                <Td className="whitespace-nowrap">
                                    <span className="flex flex-col">
                                        <span className="type-small text-ink">{df.date(a.due_date)}</span>
                                        <span className="type-caption text-muted">{dueText(a)}</span>
                                    </span>
                                </Td>
                                <Td>{progress(a)}</Td>
                                <Td>{statusBadge(a)}</Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>

            <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-center justify-between px-1">
                    <p className="type-small-semibold text-ink-2">{title}</p>
                    {clearButton}
                </div>
                {isPending ? (
                    <ListCard>{Array.from({ length: 5 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-14" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((a) => (
                            <ListRow key={a.id} onClick={() => setOpenId(String(a.id))}>
                                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="min-w-0 truncate type-small-semibold text-ink">{a.title}</span>
                                        {statusBadge(a)}
                                    </span>
                                    <span className="truncate type-caption text-muted">{[where(a), a.subject_name, dueText(a)].filter(Boolean).join(', ')}</span>
                                    {progress(a)}
                                </span>
                            </ListRow>
                        ))}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>

            {creating && <NewAssignmentDialog onClose={() => setCreating(false)} onCreated={() => { setCreating(false); notify({ tone: 'ok', title: t('assignmentsPage.created') }); }} />}
        </AppPage>
    );
};

export default AssignmentsPage;
