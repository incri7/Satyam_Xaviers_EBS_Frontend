import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar, FileSpreadsheet, Filter, Layers, LogOut, Pencil, RotateCcw, RotateCw, UserCheck, X } from 'lucide-react';

import {
    ActionMenu, Badge, Button, EmptyState, IconButton, ListCard, ListRow, Person, SearchField, Skeleton, SortTh,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr,
} from '../../design-system';
import { Toolbar } from '../layout/AppPage';
import { AccessControl } from '../AccessControl';
import { Pagination } from '../common/Pagination';
import { SelectMenu } from '../common/SelectMenu';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { EndEnrolmentDialog } from '../../features/academics/manage';
import { downloadSheet, fetchAll } from '../../utils/exportSheet';
import { formatDate } from '../../utils/nepaliDate';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { academicsService } from '../../api/services/academics.service';
import { academicYearLabel, academicYearOptions, currentAcademicYear } from '../../utils/academicYear';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import type { Enrollment } from '../../types/academic';

export type SortKey = 'student' | 'class' | 'section' | 'year' | 'status';
const PAGE_SIZE = 100; // the endpoint's own ceiling (limit le=100)
const COLUMNS = 6;
const YEAR_KEY = 'academics_enrollment_year';

/** Figma F11 Enrolments. Search, sort and filters all run on the server. */
export function EnrollmentManagement() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<SortKey>();
    const years = academicYearOptions(3);
    const [year, setYearState] = useState(() => {
        try {
            const stored = localStorage.getItem(YEAR_KEY);
            return stored && years.includes(stored) ? stored : currentAcademicYear();
        } catch {
            return currentAcademicYear();
        }
    });
    const [classId, setClassId] = useState('');
    const [status, setStatus] = useState<'active' | 'all'>('active');
    const [editing, setEditing] = useState<Enrollment | null>(null);
    const [ending, setEnding] = useState<Enrollment | null>(null);
    const [exporting, setExporting] = useState(false);

    const setYear = (y: string) => {
        setYearState(y);
        list.setPage(1);
        try { localStorage.setItem(YEAR_KEY, y); } catch { /* not remembered */ }
    };

    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['enrollments', year, list.page, list.search, classId, status, list.sort.by, list.sort.dir],
        queryFn: () =>
            academicsService.getEnrollments({
                academic_year: year,
                skip: (list.page - 1) * PAGE_SIZE,
                limit: PAGE_SIZE,
                search: list.search || undefined,
                class_id: classId ? Number(classId) : undefined,
                include_inactive: status === 'all',
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const rows: Enrollment[] = data?.enrollments ?? [];

    const reopen = useMutation({
        mutationFn: (id: number) => academicsService.changeEnrollmentStatus(id, { status: 'active' }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['enrollments'] }); queryClient.invalidateQueries({ queryKey: ['sections'] }); },
        onError: (err) => notify({ tone: 'bad', title: t('classesPage.dialog.failed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const studentName = (e: Enrollment) =>
        e.student ? [e.student.first_name, e.student.middle_name, e.student.last_name].filter(Boolean).join(' ') : `${t('academics.student')} #${e.student_id}`;
    const className = (e: Enrollment) => e.class_?.name || `#${e.class_id}`;
    const sectionName = (e: Enrollment) => e.section?.name || null;

    const askReopen = (e: Enrollment) =>
        confirm({
            title: t('academicsManage.reopenTitle', { name: studentName(e) }),
            body: t('academicsManage.reopenBody', { class: className(e) }),
            confirmLabel: t('academicsManage.reopen'),
            onConfirm: () => reopen.mutate(e.id),
        });

    // The whole list for these filters, not the page on screen.
    const exportSheet = async () => {
        setExporting(true);
        try {
            const all = await fetchAll((skip, limit) => academicsService.getEnrollments({
                academic_year: year, skip, limit, search: list.search || undefined,
                class_id: classId ? Number(classId) : undefined, include_inactive: status === 'all',
                sort_by: list.sort.by ?? 'class', sort_dir: list.sort.dir,
            }).then((r) => ({ items: r.enrollments, total: r.total_count })));
            await downloadSheet(`enrolments-${academicYearLabel(year, 'en')}`, t('classesPage.tabs.enrolments'),
                [t('classesPage.col.student'), t('exportSheet.admissionNo'), t('classesPage.col.class'), t('classesPage.col.section'), t('classesPage.col.year'), t('classesPage.col.status'), t('exportSheet.endedOn'), t('exportSheet.note')],
                all.map((e) => [studentName(e), e.student?.admission_no, className(e), sectionName(e), academicYearLabel(e.academic_year, 'en'),
                    t(`enrolStatus.${e.status ?? (e.is_active ? 'active' : 'left')}`), e.ended_on ? formatDate(e.ended_on, 'en', 'medium') : '', e.status_note]));
        } catch (err) {
            notify({ tone: 'bad', title: t('exportSheet.failed'), body: errorText(err, t('peoplePage.error.body')) });
        } finally {
            setExporting(false);
        }
    };

    const filtered = Boolean(list.search || classId || status === 'all');
    const clear = () => { list.resetSearch(); setClassId(''); setStatus('active'); };
    const total = data?.total_count;
    const title = total === undefined ? t('classesPage.tabs.enrolments') : t('classesPage.enrolments.count', { count: total, n: formatCount(total, lang) });
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={clear}>{t('common.clearFilters')}</Button> : undefined;

    const STATUS_TONE: Record<string, 'ok' | 'brand' | 'warn' | 'info' | 'neutral' | 'bad'> = {
        active: 'ok', promoted: 'brand', repeating: 'warn', graduated: 'info', transferred: 'neutral', left: 'bad',
    };
    const statusBadge = (e: Enrollment) => {
        const s = e.status ?? (e.is_active ? 'active' : 'left');
        return <Badge tone={STATUS_TONE[s] ?? 'neutral'} dot>{t(`enrolStatus.${s}`, { defaultValue: s })}</Badge>;
    };
    const sectionChip = (e: Enrollment) =>
        sectionName(e) ? <span className="inline-grid h-6 min-w-6 place-items-center rounded-[8px] bg-sunken px-1.5 type-caption-semibold text-ink-2">{sectionName(e)}</span> : <span className="text-muted">—</span>;

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={UserCheck} title={t('classesPage.enrolments.empty')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('classesPage.enrolments.emptyBody')}
        </EmptyState>
    ) : null;

    const paging = data && data.total_pages > 1 ? { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage } : undefined;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}

            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('classesPage.search.enrolments')} clearLabel={t('common.clear')} containerClassName="md:w-[240px]" />
                <div className="flex gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none] [&>*]:shrink-0">
                    <SelectMenu value={year} onChange={setYear} label={t('classesPage.col.year')} icon={<Calendar />}
                        options={years.map((y) => ({ value: y, label: academicYearLabel(y, lang) }))} />
                    <SelectMenu value={classId} onChange={list.filter(setClassId)} label={t('classesPage.col.class')} icon={<Layers />}
                        options={[{ value: '', label: t('classesPage.enrolments.allClasses') }, ...(classes.data?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} />
                    <SelectMenu value={status} onChange={list.filter((v: string) => setStatus(v as 'active' | 'all'))} label={t('classesPage.col.status')} icon={<Filter />}
                        options={[{ value: 'active', label: t('classesPage.enrolments.activeOnly') }, { value: 'all', label: t('classesPage.enrolments.allStatuses') }]} />
                </div>
                <Button variant="quiet" size="sm" leftIcon={FileSpreadsheet} loading={exporting} disabled={!data?.total_count} onClick={() => void exportSheet()}>{t('exportSheet.button')}</Button>
            </Toolbar>

            {/* md and up: table */}
            <TableCard className="max-md:hidden" title={title} subtitle={filtered ? t('classesPage.enrolments.subFiltered') : t('classesPage.enrolments.sub')} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <SortTh k="student" sort={list.sort} onSort={list.toggleSort}>{t('classesPage.col.student')}</SortTh>
                        <SortTh k="class" sort={list.sort} onSort={list.toggleSort}>{t('classesPage.col.class')}</SortTh>
                        <SortTh k="section" sort={list.sort} onSort={list.toggleSort}>{t('classesPage.col.section')}</SortTh>
                        <SortTh k="year" sort={list.sort} onSort={list.toggleSort}>{t('classesPage.col.year')}</SortTh>
                        <SortTh k="status" sort={list.sort} onSort={list.toggleSort}>{t('classesPage.col.status')}</SortTh>
                        <Th className="text-right">{t('classesPage.col.actions')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => (
                            <Tr key={e.id}>
                                <Td><Person name={studentName(e)} sub={e.student?.admission_no} /></Td>
                                <Td className="whitespace-nowrap">{className(e)}</Td>
                                <Td>{sectionChip(e)}</Td>
                                <Td className="whitespace-nowrap tabular-nums">{academicYearLabel(e.academic_year, lang)}</Td>
                                <Td>{statusBadge(e)}</Td>
                                <Td>
                                    <div className="flex justify-end gap-1.5">
                                        <AccessControl id="enrollments_update">
                                            <IconButton icon={Pencil} label={t('classesPage.enrolments.edit')} onClick={() => setEditing(e)} />
                                        </AccessControl>
                                        <ActionMenu label={t('classesPage.enrolments.more')} items={[
                                            { label: t('academicsManage.endAction'), icon: LogOut, onSelect: () => setEnding(e), hidden: !e.is_active || !can('enrollments', 'update') },
                                            { label: t('academicsManage.reopen'), icon: RotateCcw, onSelect: () => askReopen(e), hidden: e.is_active || !can('enrollments', 'update') },
                                        ]} />
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>

            {/* Phones: list rows */}
            <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-center justify-between px-1">
                    <p className="type-small-semibold text-ink-2">{title}</p>
                    {clearButton}
                </div>
                {isPending ? (
                    <ListCard>{Array.from({ length: 6 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-9" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((e) => (
                            <ListRow key={e.id} onClick={can('enrollments', 'update') ? () => setEditing(e) : undefined}>
                                <span className="min-w-0 flex-1"><Person name={studentName(e)} sub={[className(e), sectionName(e)].filter(Boolean).join(' ')} size={40} /></span>
                                {statusBadge(e)}
                            </ListRow>
                        ))}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>

            {editing && <EditEnrollmentModal key={editing.id} isOpen onClose={() => setEditing(null)} enrollmentData={editing} />}
            {ending && <EndEnrolmentDialog enrolment={ending} studentName={studentName(ending)} onClose={() => setEnding(null)} />}
        </div>
    );
}
