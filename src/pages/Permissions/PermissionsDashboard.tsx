import React, { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Copy, Lock, RotateCw, Save, ShieldCheck } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, Dialog, EmptyState, Meter, SearchField, Skeleton } from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { SelectMenu } from '../../components/common/SelectMenu';
import { permissionsService } from '../../api/services/permissions.service';
import { peopleService } from '../../api/services/people.service';
import { usePermissionOptions } from '../../hooks/usePermissionOptions';
import { PermissionMatrix } from '../../features/access/PermissionMatrix';
import { ACTIONS, coverage, flagsOf, sameFlags, type Flags } from '../../features/access/resources';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { Permission } from '../../types/auth';

/** Admin's access is fixed on the server; it is shown, not edited. */
const LOCKED = 'admin';

/**
 * Figma B02 Access control and H12 Edit permissions: pick a role, then tick
 * what it can read, create, update and delete. On a laptop the grid sits
 * beside the roles; on a phone it opens as a sheet.
 *
 * Adapted: there is no audit log of permission changes yet. A resource the
 * role has no row for is created on save when anything is ticked.
 */
const PermissionsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const { options, isLoading: loadingOptions } = usePermissionOptions();
    const { data: permissions = [], isPending, isError, refetch } = useQuery({ queryKey: ['permissions'], queryFn: permissionsService.getAllPermissions });
    const [picked, setPicked] = useState<string | null>(null);
    const [sheet, setSheet] = useState(false);
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState<Record<string, Record<string, Flags>>>({});
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; title: string; body?: string } | null>(null);

    const roles = options.roles;
    const resources = options.resources;
    const people = useQueries({
        queries: roles.map((r) => ({
            queryKey: ['users', 'count', r],
            queryFn: () => peopleService.getUsers({ role: r, limit: 1 }),
            staleTime: 5 * 60 * 1000,
        })),
    });
    const countOf = (r: string) => people[roles.indexOf(r)]?.data?.total_count as number | undefined;

    const byRole = useMemo(() => {
        const map: Record<string, Record<string, Permission>> = {};
        permissions.forEach((p) => { (map[p.role] ??= {})[p.resource] = p; });
        return map;
    }, [permissions]);
    const savedFlags = (role: string) => Object.fromEntries(resources.map((r) => [r, flagsOf(byRole[role]?.[r])])) as Record<string, Flags>;

    const role = picked ?? roles.find((r) => r !== LOCKED) ?? roles[0] ?? null;
    const saved = role ? savedFlags(role) : {};
    const draft = role ? drafts[role] ?? saved : {};
    const changedResources = resources.filter((r) => draft[r] && saved[r] && !sameFlags(draft[r], saved[r]));
    const locked = role === LOCKED;

    const setDraft = (resource: string, next: Flags) => role && setDrafts((d) => ({ ...d, [role]: { ...(d[role] ?? saved), [resource]: next } }));
    const discard = () => role && setDrafts((d) => { const n = { ...d }; delete n[role]; return n; });
    const copyFrom = (other: string) => {
        if (!role || !other) return;
        setDrafts((d) => ({ ...d, [role]: savedFlags(other) }));
    };

    const save = useMutation({
        mutationFn: async () => {
            await Promise.all(changedResources.map((r) => {
                const row = byRole[role!]?.[r];
                const flags = draft[r];
                return row
                    ? permissionsService.updatePermission(row.id, flags)
                    : permissionsService.createPermission({ role: role!, resource: r, ...flags });
            }));
        },
        onSuccess: () => {
            const n = changedResources.length;
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            discard();
            setSheet(false);
            setNotice({ tone: 'ok', title: t('accessPage.saved', { count: n, n: formatCount(n, lang), role: roleName(role!) }), body: t('accessPage.savedBody') });
        },
        onError: (err) => {
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            setNotice({ tone: 'bad', title: t('accessPage.failed'), body: errorText(err, t('peoplePage.error.body')) });
        },
    });

    const roleName = (r: string) => t(`accessPage.role.${r}`, { defaultValue: r });
    const pct = (r: string) => Math.round(coverage(Object.values(byRole[r] ?? {}), resources.length) * 100);
    const granted = (r: string) => Object.values(byRole[r] ?? {}).reduce((n, p) => n + ACTIONS.filter((k) => p[k]).length, 0);
    const q = search.trim().toLowerCase();
    const shownRoles = roles.filter((r) => !q || r.includes(q) || roleName(r).toLowerCase().includes(q)
        || resources.some((res) => res.includes(q) && (byRole[r]?.[res] && ACTIONS.some((k) => byRole[r][res][k]))));

    const pick = (r: string) => {
        setPicked(r);
        if (!window.matchMedia('(min-width: 1024px)').matches) setSheet(true);
    };
    const peopleText = (r: string) => {
        const n = countOf(r);
        return n === undefined ? '' : t('accessPage.people', { count: n, n: formatCount(n, lang) });
    };

    const editorHead = role && (
        <div className="flex flex-wrap items-center gap-2">
            {!locked && (
                <SelectMenu value="" label={t('accessPage.copyFrom')} icon={<Copy />} onChange={copyFrom}
                    options={[{ value: '', label: t('accessPage.copyFrom') }, ...roles.filter((r) => r !== role).map((r) => ({ value: r, label: roleName(r) }))]} />
            )}
        </div>
    );
    const saveBar = role && !locked && (
        <div className="flex flex-wrap items-center gap-2">
            <p className={cn('type-small', changedResources.length ? 'text-warn' : 'text-muted')}>
                {changedResources.length ? t('accessPage.unsaved', { count: changedResources.length, n: formatCount(changedResources.length, lang) }) : t('accessPage.nextSignIn')}
            </p>
            <span className="ml-auto flex gap-2">
                {changedResources.length > 0 && <Button variant="quiet" onClick={discard} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>}
                <Button leftIcon={Save} loading={save.isPending} disabled={!changedResources.length} onClick={() => save.mutate()}>{t('accessPage.save')}</Button>
            </span>
        </div>
    );
    const matrix = role && (
        <PermissionMatrix resources={resources} draft={draft} saved={saved} onChange={setDraft} disabled={locked || save.isPending} />
    );

    return (
        <AppPage title={t('accessPage.title')}>
            <PageBar>
                <p className="type-small text-muted">{t('accessPage.intro')}</p>
            </PageBar>
            {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}

            {isPending || loadingOptions ? (
                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"><Skeleton className="h-[480px] rounded-card" /><Skeleton className="h-[640px] rounded-card max-lg:hidden" /></div>
            ) : isError ? (
                <Card><EmptyState icon={AlertCircle} tone="bad" title={t('permissions.accessDenied')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>{t('permissions.failedLoad')}</EmptyState></Card>
            ) : (
                <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                    <Card className="gap-3 p-0 lg:sticky lg:top-0">
                        <div className="flex flex-col gap-3 px-4 pt-4 lg:px-5 lg:pt-5">
                            <CardHeader title={t('accessPage.roles')} />
                            <SearchField value={search} onChange={setSearch} placeholder={t('accessPage.search')} clearLabel={t('common.clear')} />
                        </div>
                        <ul className="flex flex-col pb-2">
                            {shownRoles.map((r) => {
                                const on = r === role;
                                return (
                                    <li key={r}>
                                        <button type="button" onClick={() => pick(r)} aria-current={on ? 'true' : undefined}
                                            className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors focus-visible:bg-surface-2 lg:px-5', on ? 'lg:bg-primary-soft' : 'hover:bg-surface-2')}>
                                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                                <span className="flex items-center gap-2">
                                                    <span className={cn('type-small-semibold', on ? 'lg:text-primary-text text-ink' : 'text-ink')}>{roleName(r)}</span>
                                                    {drafts[r] && <span className="size-1.5 rounded-full bg-warn" aria-label={t('accessPage.changed')} />}
                                                </span>
                                                <span className="type-caption text-muted">{peopleText(r)}</span>
                                            </span>
                                            {r === LOCKED ? <Badge tone="neutral"><Lock size={11} aria-hidden /> {t('accessPage.fixed')}</Badge>
                                                : <span className="flex w-16 flex-col items-end gap-1"><span className="type-caption-semibold tabular-nums text-ink-2">{formatCount(pct(r), lang)}%</span><Meter value={pct(r) / 100} label={roleName(r)} height={4} /></span>}
                                        </button>
                                    </li>
                                );
                            })}
                            {shownRoles.length === 0 && <li className="px-5 py-4 type-small text-muted">{t('peoplePage.empty.filtered')}</li>}
                        </ul>
                    </Card>

                    {role && (
                        <Card className="gap-0 overflow-hidden p-0 max-lg:hidden">
                            <div className="flex flex-col gap-3 border-b border-line-subtle p-5">
                                <CardHeader title={roleName(role)}
                                    subtitle={[peopleText(role), locked ? t('accessPage.lockedSub') : t('accessPage.grantedOf', { n: formatCount(granted(role), lang), of: formatCount(resources.length * ACTIONS.length, lang) })].filter(Boolean).join('. ')}
                                    action={editorHead} />
                                {locked && <Banner tone="info" icon={ShieldCheck} title={t('accessPage.lockedTitle')}>{t('accessPage.lockedBody')}</Banner>}
                            </div>
                            {matrix}
                            {!locked && <div className="sticky bottom-0 border-t border-line-subtle bg-surface p-4 lg:px-5">{saveBar}</div>}
                        </Card>
                    )}
                </div>
            )}

            {/* Phones: H12, the role's grid as a sheet. */}
            {sheet && role && (
                <Dialog open onClose={() => setSheet(false)} dismissible={!save.isPending} size="lg" icon={ShieldCheck}
                    title={t('accessPage.editTitle', { role: roleName(role) })} subtitle={peopleText(role) || undefined} closeLabel={t('common.close')}
                    footer={locked ? undefined : saveBar}>
                    {locked ? <Banner tone="info" title={t('accessPage.lockedTitle')}>{t('accessPage.lockedBody')}</Banner> : editorHead}
                    <div className="-mx-5">{matrix}</div>
                </Dialog>
            )}
        </AppPage>
    );
};

export default PermissionsDashboard;
