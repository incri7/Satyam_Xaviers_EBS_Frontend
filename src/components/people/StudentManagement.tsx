import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronRight, Eye, Filter, GraduationCap, Link2, Pencil, Trash2, Users } from 'lucide-react';

import { ActionMenu, Button, IconButton, ListRow, Person, SearchField, SortTh, THead, Td, Th, Tr } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { registrationService } from '../../api/services/registration.service';
import { academicsService } from '../../api/services/academics.service';
import { AccessControl } from '../AccessControl';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { EditStudentModal } from './EditStudentModal';
import type { Student } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { RegisterView } from '../../features/people/RegisterView';
import { PersonCard } from '../../features/people/PersonCard';
import { useListControls } from '../../features/people/useListControls';
import { StudentStatusBadge } from '../../features/people/shared';
import { errorText, fullName } from '../../features/people/format';
import { useNotice } from '../../features/people/useNotice';

type StudentSortKey = 'name' | 'admission_no' | 'dob' | 'gender' | 'status' | 'admission_date';
const COLUMNS = 7;

/** Figma F01 Students. */
export function StudentManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [view, setView] = useViewMode('people_students_view');
    const list = useListControls<StudentSortKey>();
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [status, setStatus] = useState('');
    const [gender, setGender] = useState('');
    const [editing, setEditing] = useState<Student | null>(null);

    const filtered = Boolean(list.search || classId || sectionId || status || gender);
    const clearFilters = () => {
        list.resetSearch();
        setClassId('');
        setSectionId('');
        setStatus('');
        setGender('');
    };

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });
    const { data: sectionsData } = useQuery({
        queryKey: ['sections', classId],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: !!classId,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['students', list.search, list.page, 20, classId, sectionId, status, gender, list.sort.by, list.sort.dir],
        queryFn: () =>
            peopleService.getStudents({
                search: list.search,
                page: list.page,
                limit: 20,
                class_id: classId ? Number(classId) : undefined,
                section_id: sectionId ? Number(sectionId) : undefined,
                filter_by_status: status || undefined,
                gender: gender || undefined,
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const students: Student[] = data?.students ?? [];

    const linkMutation = useMutation({
        mutationFn: registrationService.generateToken,
        onSuccess: async (res, studentId) => {
            const url = `${window.location.origin}${res.registration_url}`;
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                window.prompt(t('peoplePage.row.copyLink'), url);
            }
            const st = students.find((s) => s.id === studentId);
            notify({ tone: 'ok', title: t('peoplePage.notice.linkCopied'), body: t('peoplePage.notice.linkCopiedBody', { name: st ? st.first_name : '' }) });
        },
        onError: (err) => notify({ tone: 'bad', title: t('peoplePage.notice.linkFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const deleteMutation = useMutation({
        mutationFn: peopleService.deleteStudent,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
        onError: (err) => notify({ tone: 'bad', title: t('peoplePage.notice.actionFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const askDelete = (st: Student) =>
        confirm({
            title: t('confirm.deleteStudent.title'),
            body: t('confirm.deleteStudent.body', { name: fullName(st) }),
            confirmLabel: t('confirm.deleteStudent.action'),
            onConfirm: () => deleteMutation.mutate(st.id),
        });

    const genderLabel = (g?: string) => (g ? t(`peoplePage.gender.${g}`, { defaultValue: g }) : undefined);

    /** Primary contact first, else whoever is linked. */
    const parentOf = (st: Student) => {
        const links = st.parent_links ?? [];
        const link = links.find((l) => l?.is_primary_contact) ?? links[0];
        const p = link?.parent;
        if (!p) return null;
        return { name: fullName(p), phone: p.phone || p.user?.phone || null };
    };

    const moreItems = (st: Student) => [
        { label: t('peoplePage.row.copyLink'), icon: Link2, onSelect: () => linkMutation.mutate(st.id), hidden: !can('students', 'update') },
        { label: t('peoplePage.row.delete'), icon: Trash2, tone: 'bad' as const, onSelect: () => askDelete(st), hidden: !can('students', 'delete') },
    ];

    const open = (st: Student) => navigate(`/people/students/${st.id}`);

    return (
        <>
            {confirmUI}
            <RegisterView<Student>
                kind="students"
                emptyIcon={GraduationCap}
                total={data?.total_count}
                filtered={filtered}
                onClearFilters={clearFilters}
                notice={noticeUI}
                view={view}
                onViewChange={setView}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                rows={students}
                columns={COLUMNS}
                paging={data && { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage }}
                toolbar={
                    <>
                        <SearchField
                            value={list.searchInput}
                            onChange={list.setSearchInput}
                            placeholder={t('peoplePage.search.students')}
                            clearLabel={t('common.clear')}
                            containerClassName="md:w-[300px]"
                        />
                        <div className="flex gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none] [&>*]:shrink-0">
                            <SelectMenu
                                value={classId}
                                onChange={list.filter((v: string) => { setClassId(v); setSectionId(''); })}
                                label={t('peoplePage.filters.class')}
                                icon={<GraduationCap />}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allClasses') },
                                    ...(classesData?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name })),
                                ]}
                            />
                            <SelectMenu
                                value={sectionId}
                                onChange={list.filter(setSectionId)}
                                label={t('peoplePage.filters.section')}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allSections') },
                                    ...((sectionsData?.sections ?? []) as { id: number; name: string }[]).map((s) => ({ value: String(s.id), label: s.name })),
                                ]}
                            />
                            <SelectMenu
                                value={status}
                                onChange={list.filter(setStatus)}
                                label={t('peoplePage.filters.status')}
                                icon={<Filter />}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allStatuses') },
                                    ...['active', 'passed_out', 'transferred', 'discontinued'].map((s) => ({ value: s, label: t(`peoplePage.status.${s}`) })),
                                ]}
                            />
                            <SelectMenu
                                value={gender}
                                onChange={list.filter(setGender)}
                                label={t('peoplePage.filters.gender')}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allGenders') },
                                    ...['M', 'F', 'O'].map((g) => ({ value: g, label: t(`peoplePage.gender.${g}`) })),
                                ]}
                            />
                        </div>
                    </>
                }
                head={
                    <THead>
                        <SortTh k="name" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.student')}</SortTh>
                        <SortTh k="admission_no" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.admissionNo')}</SortTh>
                        <Th>{t('peoplePage.col.parent')}</Th>
                        <SortTh k="dob" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.dob')}</SortTh>
                        <SortTh k="admission_date" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.admitted')}</SortTh>
                        <SortTh k="status" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.status')}</SortTh>
                        <Th className="text-right">{t('peoplePage.col.actions')}</Th>
                    </THead>
                }
                row={(st) => {
                    const parent = parentOf(st);
                    return (
                        <Tr key={st.id}>
                            <Td>
                                <button type="button" onClick={() => open(st)} className="rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-focus/60">
                                    <Person name={fullName(st)} sub={genderLabel(st.gender)} />
                                </button>
                            </Td>
                            <Td className="whitespace-nowrap tabular-nums">{st.admission_no || '—'}</Td>
                            <Td>
                                {parent ? (
                                    <span className="flex flex-col gap-px">
                                        <span className="type-small-medium text-ink">{parent.name}</span>
                                        <span className="type-caption text-muted">{parent.phone || t('peoplePage.value.noPhone')}</span>
                                    </span>
                                ) : '—'}
                            </Td>
                            <Td className="whitespace-nowrap">{df.date(st.dob, 'medium', '—')}</Td>
                            <Td className="whitespace-nowrap">{df.date(st.admission_date, 'medium', '—')}</Td>
                            <Td><StudentStatusBadge status={st.status} /></Td>
                            <Td>
                                <div className="flex justify-end gap-1.5">
                                    <IconButton icon={Eye} label={t('peoplePage.row.view')} onClick={() => open(st)} />
                                    <AccessControl id="students_update">
                                        <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(st)} />
                                    </AccessControl>
                                    <ActionMenu label={t('peoplePage.row.more')} items={moreItems(st)} />
                                </div>
                            </Td>
                        </Tr>
                    );
                }}
                card={(st) => {
                    const parent = parentOf(st);
                    return (
                        <PersonCard
                            key={st.id}
                            name={fullName(st)}
                            sub={[st.admission_no, genderLabel(st.gender)].filter(Boolean).join(', ')}
                            badge={<StudentStatusBadge status={st.status} />}
                            muted={st.status !== 'active'}
                            details={[
                                { icon: Users, label: t('peoplePage.col.parent'), value: parent ? parent.name : '—' },
                                { icon: CalendarDays, label: t('peoplePage.col.dob'), value: df.date(st.dob, 'medium', '—') },
                                { icon: GraduationCap, label: t('peoplePage.col.admitted'), value: df.date(st.admission_date, 'medium', '—') },
                            ]}
                            primaryAction={
                                <Button variant="secondary" size="sm" rightIcon={ChevronRight} onClick={() => open(st)}>
                                    {t('peoplePage.row.viewProfile')}
                                </Button>
                            }
                            actions={
                                <>
                                    <AccessControl id="students_update">
                                        <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(st)} />
                                    </AccessControl>
                                    <ActionMenu label={t('peoplePage.row.more')} items={moreItems(st)} />
                                </>
                            }
                        />
                    );
                }}
                listRow={(st) => (
                    <ListRow key={st.id} onClick={() => open(st)}>
                        <span className="min-w-0 flex-1">
                            <Person name={fullName(st)} sub={st.admission_no || genderLabel(st.gender)} size={40} />
                        </span>
                        <StudentStatusBadge status={st.status} />
                        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </ListRow>
                )}
            />

            {editing && <EditStudentModal student={editing} isOpen onClose={() => setEditing(null)} />}
        </>
    );
}
