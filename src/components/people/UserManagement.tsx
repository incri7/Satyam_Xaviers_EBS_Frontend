import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Filter, Shield, UserCheck, UserCircle, UserX } from 'lucide-react';

import { Badge, IconButton, ListRow, Person, SearchField, SortTh, THead, Td, Th, Tr } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { useAuthStore } from '../../store/useAuthStore';
import { AccessControl } from '../AccessControl';
import type { User } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { SelectMenu } from '../common/SelectMenu';
import { RegisterView } from '../../features/people/RegisterView';
import { useListControls } from '../../features/people/useListControls';
import { ActiveBadge } from '../../features/people/shared';
import { errorText } from '../../features/people/format';
import { useNotice } from '../../features/people/useNotice';

type UserSortKey = 'email' | 'role' | 'status' | 'last_login';
const COLUMNS = 5;
const ROLES = ['admin', 'principal', 'coordinator', 'accountant', 'teacher', 'staff', 'parent', 'student'];

/**
 * Figma F05 User accounts. Deactivation stays blocked for your own account
 * and for the last active administrator, so nobody can lock the school out.
 */
export function UserManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<UserSortKey>();
    const [role, setRole] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');

    const filtered = Boolean(list.search || role || status);
    const clearFilters = () => { list.resetSearch(); setRole(''); setStatus(''); };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['users', list.search, list.page, 20, role, status, list.sort.by, list.sort.dir],
        queryFn: () =>
            peopleService.getUsers({
                search: list.search,
                page: list.page,
                limit: 20,
                role: role || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const users: User[] = data?.users ?? [];

    const onFail = (err: unknown) => notify({ tone: 'bad', title: t('peoplePage.notice.actionFailed'), body: errorText(err, t('peoplePage.error.body')) });
    const deactivate = useMutation({
        mutationFn: peopleService.deleteUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
        onError: onFail,
    });
    const reactivate = useMutation({
        mutationFn: (id: number) => peopleService.updateUser(id, { is_active: true }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
        onError: onFail,
    });

    const activeAdmins = users.filter((u) => u.role === 'admin' && u.is_active).length;
    const blockReason = (u: User) =>
        u.id === currentUser?.id
            ? t('peoplePage.row.cannotSelf')
            : u.role === 'admin' && u.is_active && activeAdmins <= 1
                ? t('peoplePage.row.cannotLastAdmin')
                : null;

    const name = (u: User) => [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;
    const roleLabel = (r: string) => t(`shell.roles.${r}`, { defaultValue: r });
    const youBadge = (u: User) => (u.id === currentUser?.id ? <Badge tone="brand">{t('peoplePage.value.you')}</Badge> : null);

    const action = (u: User) => {
        if (!u.is_active) {
            return (
                <IconButton
                    icon={UserCheck}
                    label={t('peoplePage.row.activate')}
                    onClick={() =>
                        confirm({
                            tone: 'neutral',
                            title: t('confirm.userActivate.title'),
                            body: t('confirm.userActivate.body', { email: u.email }),
                            confirmLabel: t('confirm.userActivate.action'),
                            onConfirm: () => reactivate.mutate(u.id),
                        })
                    }
                />
            );
        }
        const reason = blockReason(u);
        return (
            <IconButton
                icon={UserX}
                variant="danger"
                label={reason ?? t('peoplePage.row.deactivate')}
                disabled={reason !== null}
                onClick={() =>
                    confirm({
                        tone: 'neutral',
                        title: t('confirm.userDeactivate.title'),
                        body: t('confirm.userDeactivate.body', { email: u.email }),
                        confirmLabel: t('confirm.userDeactivate.action'),
                        onConfirm: () => deactivate.mutate(u.id),
                    })
                }
            />
        );
    };

    return (
        <>
            {confirmUI}
            <RegisterView<User>
                kind="users"
                emptyIcon={UserCircle}
                total={data?.total_count}
                filtered={filtered}
                onClearFilters={clearFilters}
                notice={noticeUI}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                rows={users}
                columns={COLUMNS}
                paging={data && { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage }}
                toolbar={
                    <>
                        <SearchField
                            value={list.searchInput}
                            onChange={list.setSearchInput}
                            placeholder={t('peoplePage.search.users')}
                            clearLabel={t('common.clear')}
                            containerClassName="md:w-[300px]"
                        />
                        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
                            <SelectMenu
                                value={role}
                                onChange={list.filter(setRole)}
                                label={t('peoplePage.filters.role')}
                                icon={<Shield />}
                                options={[{ value: '', label: t('peoplePage.filters.allRoles') }, ...ROLES.map((r) => ({ value: r, label: roleLabel(r) }))]}
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
                        <SortTh k="email" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.user')}</SortTh>
                        <SortTh k="role" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.role')}</SortTh>
                        <SortTh k="last_login" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.lastSignIn')}</SortTh>
                        <SortTh k="status" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.status')}</SortTh>
                        <Th className="text-right">{t('peoplePage.col.actions')}</Th>
                    </THead>
                }
                row={(u) => (
                    <Tr key={u.id}>
                        <Td><Person name={name(u)} sub={u.email} src={u.profile_image_url} trailing={youBadge(u)} /></Td>
                        <Td className="whitespace-nowrap">{roleLabel(u.role)}</Td>
                        <Td className="whitespace-nowrap">{u.last_login ? df.dateTime(u.last_login) : t('peoplePage.value.never')}</Td>
                        <Td><ActiveBadge active={u.is_active} /></Td>
                        <Td>
                            <div className="flex justify-end gap-1.5">
                                <AccessControl id="users_delete">{action(u)}</AccessControl>
                            </div>
                        </Td>
                    </Tr>
                )}
                listRow={(u) => (
                    <ListRow key={u.id}>
                        <span className="min-w-0 flex-1">
                            <Person name={name(u)} sub={roleLabel(u.role)} src={u.profile_image_url} size={40} trailing={youBadge(u)} />
                        </span>
                        <ActiveBadge active={u.is_active} />
                        <AccessControl id="users_delete">{action(u)}</AccessControl>
                    </ListRow>
                )}
            />
        </>
    );
}
