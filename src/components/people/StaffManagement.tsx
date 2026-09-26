import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, CalendarDays, CheckCircle2, ChevronRight, Eye, Filter, KeyRound, Pencil, Phone, Power, Users } from 'lucide-react';

import { Button, IconButton, ListRow, Person, SearchField, SortTh, THead, Td, Th, Tr } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { AccessControl } from '../AccessControl';
import { EditStaffModal } from './EditStaffModal';
import { StaffProfileDrawer } from './StaffProfileDrawer';
import type { Staff } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { useViewMode } from '../common/useViewMode';
import { SelectMenu } from '../common/SelectMenu';
import { RegisterView } from '../../features/people/RegisterView';
import { PersonCard } from '../../features/people/PersonCard';
import { useListControls } from '../../features/people/useListControls';
import { ActiveBadge } from '../../features/people/shared';
import { errorText, fullName } from '../../features/people/format';
import { useNotice } from '../../features/people/useNotice';

type StaffSortKey = 'name' | 'code' | 'designation' | 'phone' | 'join_date' | 'status';
const COLUMNS = 7;

/** Figma F03 Staff. "Add staff" lives on the page bar (PeoplePage). */
export function StaffManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [view, setView] = useViewMode('people_staff_view');
    const list = useListControls<StaffSortKey>();
    const [designation, setDesignation] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
    const [editing, setEditing] = useState<Staff | null>(null);
    const [viewingId, setViewingId] = useState<number | null>(null);

    const filtered = Boolean(list.search || designation || status);
    const clearFilters = () => { list.resetSearch(); setDesignation(''); setStatus(''); };

    const { data: designations } = useQuery({
        queryKey: ['staff-designations'],
        queryFn: peopleService.getStaffDesignations,
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['staff', list.search, list.page, 20, designation, status, list.sort.by, list.sort.dir],
        queryFn: () =>
            peopleService.getStaffList({
                search: list.search,
                page: list.page,
                limit: 20,
                designation: designation || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const staff: Staff[] = data?.staff ?? [];

    const statusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => peopleService.setStaffActive(id, isActive),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
        onError: (err) => notify({ tone: 'bad', title: t('peoplePage.notice.actionFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const askToggle = (m: Staff) => {
        const next = !m.is_active;
        confirm({
            tone: 'neutral',
            title: next ? t('confirm.staffActivate.title') : t('confirm.staffDeactivate.title'),
            body: t(next ? 'confirm.staffActivate.body' : 'confirm.staffDeactivate.body', { name: fullName(m) }),
            confirmLabel: next ? t('confirm.staffActivate.action') : t('confirm.staffDeactivate.action'),
            onConfirm: () => statusMutation.mutate({ id: m.id, isActive: next }),
        });
    };

    const signIn = (m: Staff) =>
        m.user_id ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap type-small-medium text-ok">
                <CheckCircle2 size={14} aria-hidden />
                {t('peoplePage.value.hasSignIn')}
            </span>
        ) : (
            <span className="whitespace-nowrap text-muted">{t('peoplePage.value.noSignIn')}</span>
        );

    const actions = (m: Staff) => (
        <>
            <IconButton icon={Eye} label={t('peoplePage.row.view')} onClick={() => setViewingId(m.id)} />
            <AccessControl id="staff_update">
                <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(m)} />
            </AccessControl>
            <AccessControl id="staff_update">
                <IconButton
                    icon={Power}
                    variant={m.is_active ? 'danger' : 'outline'}
                    label={m.is_active ? t('peoplePage.row.markInactive') : t('peoplePage.row.markActive')}
                    onClick={() => askToggle(m)}
                />
            </AccessControl>
        </>
    );

    return (
        <>
            {confirmUI}
            <RegisterView<Staff>
                kind="staff"
                emptyIcon={Users}
                total={data?.total_count}
                filtered={filtered}
                onClearFilters={clearFilters}
                notice={noticeUI}
                view={view}
                onViewChange={setView}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                rows={staff}
                columns={COLUMNS}
                paging={data && { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage }}
                toolbar={
                    <>
                        <SearchField
                            value={list.searchInput}
                            onChange={list.setSearchInput}
                            placeholder={t('peoplePage.search.staff')}
                            clearLabel={t('common.clear')}
                            containerClassName="md:w-[300px]"
                        />
                        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
                            <SelectMenu
                                value={designation}
                                onChange={list.filter(setDesignation)}
                                label={t('peoplePage.filters.designation')}
                                icon={<Briefcase />}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allDesignations') },
                                    ...((designations as string[] | undefined) ?? []).map((d) => ({ value: d, label: d })),
                                ]}
                            />
                            <SelectMenu
                                value={status}
                                onChange={list.filter((v: string) => setStatus(v as '' | 'active' | 'inactive'))}
                                label={t('peoplePage.filters.status')}
                                icon={<Filter />}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allStatuses') },
                                    { value: 'active', label: t('peoplePage.status.active') },
                                    { value: 'inactive', label: t('peoplePage.status.inactive') },
                                ]}
                            />
                        </div>
                    </>
                }
                head={
                    <THead>
                        <SortTh k="name" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.staffMember')}</SortTh>
                        <SortTh k="designation" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.designation')}</SortTh>
                        <SortTh k="phone" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.phone')}</SortTh>
                        <SortTh k="join_date" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.joined')}</SortTh>
                        <Th>{t('peoplePage.col.signIn')}</Th>
                        <SortTh k="status" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.status')}</SortTh>
                        <Th className="text-right">{t('peoplePage.col.actions')}</Th>
                    </THead>
                }
                row={(m) => (
                    <Tr key={m.id}>
                        <Td>
                            <button type="button" onClick={() => setViewingId(m.id)} className="rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-focus/60">
                                <Person name={fullName(m)} sub={m.staff_code} />
                            </button>
                        </Td>
                        <Td>{m.designation || '—'}</Td>
                        <Td className="whitespace-nowrap tabular-nums">{m.phone || '—'}</Td>
                        <Td className="whitespace-nowrap">{df.date(m.join_date, 'medium', '—')}</Td>
                        <Td>{signIn(m)}</Td>
                        <Td><ActiveBadge active={m.is_active} /></Td>
                        <Td><div className="flex justify-end gap-1.5">{actions(m)}</div></Td>
                    </Tr>
                )}
                card={(m) => (
                    <PersonCard
                        key={m.id}
                        name={fullName(m)}
                        sub={[m.designation, m.staff_code].filter(Boolean).join(', ')}
                        badge={<ActiveBadge active={m.is_active} />}
                        muted={!m.is_active}
                        details={[
                            { icon: Phone, label: t('peoplePage.col.phone'), value: m.phone || '—' },
                            { icon: CalendarDays, label: t('peoplePage.col.joined'), value: df.date(m.join_date, 'medium', '—') },
                            { icon: KeyRound, label: t('peoplePage.col.signIn'), value: m.user_id ? t('peoplePage.value.hasSignIn') : t('peoplePage.value.noSignIn') },
                        ]}
                        primaryAction={
                            <Button variant="secondary" size="sm" rightIcon={ChevronRight} onClick={() => setViewingId(m.id)}>
                                {t('peoplePage.row.viewProfile')}
                            </Button>
                        }
                        actions={
                            <>
                                <AccessControl id="staff_update">
                                    <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(m)} />
                                </AccessControl>
                                <AccessControl id="staff_update">
                                    <IconButton
                                        icon={Power}
                                        variant={m.is_active ? 'danger' : 'outline'}
                                        label={m.is_active ? t('peoplePage.row.markInactive') : t('peoplePage.row.markActive')}
                                        onClick={() => askToggle(m)}
                                    />
                                </AccessControl>
                            </>
                        }
                    />
                )}
                listRow={(m) => (
                    <ListRow key={m.id} onClick={() => setViewingId(m.id)}>
                        <span className="min-w-0 flex-1">
                            <Person name={fullName(m)} sub={m.designation || m.staff_code} size={40} />
                        </span>
                        <ActiveBadge active={m.is_active} />
                        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </ListRow>
                )}
            />

            {editing && <EditStaffModal staff={editing} isOpen onClose={() => setEditing(null)} />}
            <StaffProfileDrawer staffId={viewingId} onClose={() => setViewingId(null)} />
        </>
    );
}
