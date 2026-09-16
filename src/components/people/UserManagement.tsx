import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Mail, Shield, UserX, UserCheck, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { SelectMenu } from '../common/SelectMenu';
import { AccessControl } from '../AccessControl';
import { cn } from '../../utils/cn';
import type { User } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '../common/ConfirmDialog';

type UserSortKey = 'email' | 'role' | 'status' | 'last_login';

/** Sortable column header: ascending -> descending -> unsorted. */
const UserSortTh: React.FC<{
    k: UserSortKey;
    sort: { by: UserSortKey | null; dir: 'asc' | 'desc' };
    onSort: (k: UserSortKey) => void;
    children: React.ReactNode;
}> = ({ k, sort, onSort, children }) => {
    const active = sort.by === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    return (
        <th scope="col" className="px-6 py-4 whitespace-nowrap">
            <button
                type="button"
                onClick={() => onSort(k)}
                className={cn(
                    'group inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors rounded',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600',
                )}
            >
                {children}
                <Icon
                    className={cn(
                        'w-3.5 h-3.5 transition-opacity',
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                    )}
                />
            </button>
        </th>
    );
};

export const UserManagement: React.FC = () => {
    const { t } = useTranslation();
    const [confirmUI, confirm] = useConfirmDialog();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [role, setRole] = useState('');
    const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
    const [sort, setSort] = useState<{ by: UserSortKey | null; dir: 'asc' | 'desc' }>({
        by: null,
        dir: 'asc',
    });

    // Debounced, so typing an email does not fire a request per keystroke.
    React.useEffect(() => {
        const id = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    // Any filter change is a different result set, so start at its first page.
    const onFilter = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    const toggleSort = (key: UserSortKey) =>
        setSort((prev) => {
            setPage(1);
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });

    const hasFilters = Boolean(searchQuery || role || status);
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setRole('');
        setStatus('');
        setPage(1);
    };

    const { data: userData, isLoading } = useQuery({
        queryKey: ['users', searchQuery, page, limit, role, status, sort.by, sort.dir],
        queryFn: () =>
            peopleService.getUsers({
                search: searchQuery,
                page,
                limit,
                role: role || undefined,
                is_active: status === '' ? undefined : status === 'active',
                sort_by: sort.by ?? undefined,
                sort_dir: sort.dir,
            }),
        placeholderData: (prev: any) => prev,
    });

    const deactivateMutation = useMutation({
        mutationFn: peopleService.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    const reactivateMutation = useMutation({
        mutationFn: (id: number) => peopleService.updateUser(id, { is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.detail || 'Failed to reactivate account');
        }
    });

    const users = userData?.users || [];
    const activeAdminCount = users.filter((u: User) => u.role === 'admin' && u.is_active).length;
    // Deactivation is blocked for: yourself, and the last active admin
    const canDeactivate = (u: User) =>
        u.id !== currentUser?.id && !(u.role === 'admin' && u.is_active && activeAdminCount <= 1);

    return (
        <div className="space-y-6">
            {confirmUI}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by email or phone..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                aria-label={t('common.clear')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <SelectMenu
                            value={role}
                            onChange={onFilter(setRole)}
                            label="Role"
                            icon={<Shield className="w-4 h-4 text-slate-400 shrink-0" />}
                            options={[
                                { value: '', label: 'All roles' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'principal', label: 'Principal' },
                                { value: 'coordinator', label: 'Coordinator' },
                                { value: 'accountant', label: 'Accountant' },
                                { value: 'teacher', label: 'Teacher' },
                                { value: 'staff', label: 'Staff' },
                                { value: 'parent', label: 'Parent' },
                                { value: 'student', label: 'Student' },
                            ]}
                        />
                        <SelectMenu
                            value={status}
                            onChange={(v) => onFilter(setStatus)(v as '' | 'active' | 'inactive')}
                            label="Status"
                            options={[
                                { value: '', label: 'All statuses' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm px-1">
                <p className="font-bold text-slate-400">
                    Accounts <span className="text-slate-900">{userData?.total_count ?? 0}</span>
                </p>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-brand transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        {t('common.clearFilters')}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <UserSortTh k="email" sort={sort} onSort={toggleSort}>User</UserSortTh>
                                <UserSortTh k="role" sort={sort} onSort={toggleSort}>Role</UserSortTh>
                                <UserSortTh k="status" sort={sort} onSort={toggleSort}>Status</UserSortTh>
                                <UserSortTh k="last_login" sort={sort} onSort={toggleSort}>Last Login</UserSortTh>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : users.map((user: User) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{user.first_name} {user.last_name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-brand" />
                                            <span className="text-sm font-bold text-slate-700 capitalize">{user.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            user.is_active
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-red-100 text-red-700"
                                        )}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        {user.last_login ? df.dateTime(user.last_login) : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <AccessControl id="users_delete">
                                                {user.is_active ? (
                                                    canDeactivate(user) ? (
                                                        <button
                                                            onClick={() => {
                                                                confirm({
                                                                    tone: 'neutral',
                                                                    title: t('confirm.userDeactivate.title'),
                                                                    body: t('confirm.userDeactivate.body', { email: user.email }),
                                                                    confirmLabel: t('confirm.userDeactivate.action'),
                                                                    onConfirm: () => deactivateMutation.mutate(user.id),
                                                                });
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Deactivate Account"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="p-2 text-slate-200 cursor-not-allowed inline-flex"
                                                            title={user.id === currentUser?.id ? "You can't deactivate your own account" : "Can't deactivate the last active admin"}
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </span>
                                                    )
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            confirm({
                                                                tone: 'neutral',
                                                                title: t('confirm.userActivate.title'),
                                                                body: t('confirm.userActivate.body', { email: user.email }),
                                                                confirmLabel: t('confirm.userActivate.action'),
                                                                onConfirm: () => reactivateMutation.mutate(user.id),
                                                            });
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Reactivate Account"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </AccessControl>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {userData && (
                <Pagination
                    page={userData.page}
                    totalPages={userData.total_pages}
                    totalCount={userData.total_count}
                    pageSize={userData.limit}
                    onChange={setPage}
                />
            )}
        </div>
    );
};
