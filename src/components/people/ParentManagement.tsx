import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, CheckCircle2, Combine, Filter, Home, Mail, MapPin, Pencil, Phone } from 'lucide-react';

import { Badge, IconButton, ListRow, Person, SearchField, SortTh, THead, Td, Th, Tr } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { AccessControl } from '../AccessControl';
import { EditParentModal } from './EditParentModal';
import type { Parent } from '../../types/people';
import { useViewMode } from '../common/useViewMode';
import { SelectMenu } from '../common/SelectMenu';
import { RegisterView } from '../../features/people/RegisterView';
import { PersonCard } from '../../features/people/PersonCard';
import { useListControls } from '../../features/people/useListControls';
import { fullName } from '../../features/people/format';
import { MergeParentsDialog } from '../../features/people/MergeParentsDialog';
import { useNotice } from '../../features/people/useNotice';
import { useAuthStore } from '../../store/useAuthStore';

type ParentSortKey = 'name' | 'occupation' | 'city';
const COLUMNS = 5;

/**
 * Figma F04 Parents. The app-registration column reads the parent's sign-in
 * account (a guardian with no account has not registered).
 */
export function ParentManagement() {
    const { t } = useTranslation();
    const [view, setView] = useViewMode('people_parents_view');
    const list = useListControls<ParentSortKey>();
    const [occupation, setOccupation] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
    const [editing, setEditing] = useState<Parent | null>(null);
    const [merging, setMerging] = useState<Parent | null>(null);
    const [noticeUI, notify] = useNotice();
    // Merging moves logins between records: admins and principals only.
    const canMerge = useAuthStore((s) => s.user?.role === 'admin' || s.user?.role === 'principal');

    const filtered = Boolean(list.search || occupation || status);
    const clearFilters = () => { list.resetSearch(); setOccupation(''); setStatus(''); };

    const { data: occupations } = useQuery({
        queryKey: ['parent-occupations'],
        queryFn: peopleService.getParentOccupations,
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['parents', list.search, list.page, 20, occupation, status, list.sort.by, list.sort.dir],
        queryFn: () =>
            peopleService.getParents({
                search: list.search,
                page: list.page,
                limit: 20,
                occupation: occupation || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const parents: Parent[] = data?.parents ?? [];

    // The guardian's own details first: a secondary guardian has no account.
    const phoneOf = (p: Parent) => p.phone || p.user?.phone || null;
    const emailOf = (p: Parent) => p.email || p.user?.email || null;

    const registration = (p: Parent) =>
        p.user_id || p.user ? (
            <Badge tone="ok" dot>{t('peoplePage.value.registered')}</Badge>
        ) : (
            <Badge tone="neutral" dot>{t('peoplePage.value.notRegistered')}</Badge>
        );

    const edit = (p: Parent) => (
        <>
            <AccessControl id="parents_update">
                <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(p)} />
            </AccessControl>
            {canMerge && <IconButton icon={Combine} label={t('family.merge.button')} onClick={() => setMerging(p)} />}
        </>
    );
    // Who the family is, so two records of one person are easy to spot.
    const childrenLine = (p: Parent) =>
        (p.children ?? []).length ? t('peopleRules.childrenOf', { names: (p.children ?? []).map((c) => c.name).join(', ') }) : null;

    return (
        <>
            <RegisterView<Parent>
                kind="parents"
                emptyIcon={Home}
                total={data?.total_count}
                filtered={filtered}
                onClearFilters={clearFilters}
                view={view}
                onViewChange={setView}
                notice={noticeUI}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                rows={parents}
                columns={COLUMNS}
                paging={data && { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage }}
                toolbar={
                    <>
                        <SearchField
                            value={list.searchInput}
                            onChange={list.setSearchInput}
                            placeholder={t('peoplePage.search.parents')}
                            clearLabel={t('common.clear')}
                            containerClassName="md:w-[300px]"
                        />
                        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
                            <SelectMenu
                                value={occupation}
                                onChange={list.filter(setOccupation)}
                                label={t('peoplePage.filters.occupation')}
                                icon={<Briefcase />}
                                options={[
                                    { value: '', label: t('peoplePage.filters.allOccupations') },
                                    ...((occupations as string[] | undefined) ?? []).map((o) => ({ value: o, label: o })),
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
                        <SortTh k="name" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.parent')}</SortTh>
                        <Th>{t('peoplePage.col.contact')}</Th>
                        <SortTh k="city" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.city')}</SortTh>
                        <Th>{t('peoplePage.col.appAccount')}</Th>
                        <Th className="text-right">{t('peoplePage.col.actions')}</Th>
                    </THead>
                }
                row={(p) => (
                    <Tr key={p.id}>
                        <Td><Person name={fullName(p)} sub={childrenLine(p) ?? p.occupation} /></Td>
                        <Td>
                            <span className="flex flex-col gap-px">
                                <span className="whitespace-nowrap type-small-medium text-ink">{phoneOf(p) || t('peoplePage.value.noPhone')}</span>
                                {emailOf(p) && <span className="max-w-64 truncate type-caption text-muted">{emailOf(p)}</span>}
                            </span>
                        </Td>
                        <Td>{p.city || '—'}</Td>
                        <Td>{registration(p)}</Td>
                        <Td><div className="flex justify-end gap-1.5">{edit(p)}</div></Td>
                    </Tr>
                )}
                card={(p) => (
                    <PersonCard
                        key={p.id}
                        name={fullName(p)}
                        sub={p.occupation}
                        badge={registration(p)}
                        details={[
                            { icon: Phone, label: t('peoplePage.col.phone'), value: phoneOf(p) || t('peoplePage.value.noPhone') },
                            { icon: Mail, label: t('common.email'), value: emailOf(p) || '—' },
                            { icon: MapPin, label: t('peoplePage.col.city'), value: p.city || '—' },
                        ]}
                        actions={edit(p)}
                    />
                )}
                listRow={(p) => (
                    <ListRow key={p.id}>
                        <span className="min-w-0 flex-1">
                            <Person name={fullName(p)} sub={phoneOf(p) || p.occupation} size={40} />
                        </span>
                        {p.user_id || p.user ? <CheckCircle2 size={18} className="shrink-0 text-ok" aria-label={t('peoplePage.value.registered')} /> : null}
                        {edit(p)}
                    </ListRow>
                )}
            />

            {editing && <EditParentModal parent={editing} isOpen onClose={() => setEditing(null)} />}
            {merging && (
                <MergeParentsDialog from={merging} onClose={() => setMerging(null)}
                    onMerged={(name) => notify({ tone: 'ok', title: t('family.merge.done', { name }) })} />
            )}
        </>
    );
}
