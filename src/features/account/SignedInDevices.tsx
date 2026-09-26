import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, LogOut, Monitor, RotateCw, Smartphone } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, Skeleton } from '../../design-system';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { accountService, type AccountSession } from '../../api/services/auth.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { errorText } from '../people/format';
import { deviceName } from './device';

const KEY = ['account', 'sessions'];

/**
 * Figma A05 "Signed-in devices": every browser this account is signed in
 * on, and a way to sign any of them out. A signed-out device is refused on
 * its very next request, not when its token would have run out.
 */
export function SignedInDevices() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const sessions = useQuery({ queryKey: KEY, queryFn: accountService.listSessions });

    const one = useMutation({
        mutationFn: accountService.signOutSession,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    });
    const others = useMutation({
        mutationFn: accountService.signOutOthers,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    });

    const label = (s: AccountSession) => {
        const d = deviceName(s.user_agent);
        if (d.browser && d.os) return t('profilePageMe.devices.on', { browser: d.browser, os: d.os });
        return d.browser ?? d.os ?? t('profilePageMe.devices.unknown');
    };
    const list = sessions.data ?? [];
    const otherCount = list.filter((s) => !s.current).length;
    const failed = one.error ?? others.error;

    const askOne = (s: AccountSession) => confirm({
        title: t('profilePageMe.devices.signOutTitle', { device: label(s) }),
        body: t('profilePageMe.devices.signOutBody'),
        confirmLabel: t('profilePageMe.devices.signOut'),
        onConfirm: () => one.mutate(s.id),
    });
    const askOthers = () => confirm({
        title: t('profilePageMe.devices.othersTitle', { count: otherCount }),
        body: t('profilePageMe.devices.othersBody'),
        confirmLabel: t('profilePageMe.devices.signOutOthers'),
        onConfirm: () => others.mutate(),
    });

    return (
        <Card className="gap-4">
            {confirmUI}
            <CardHeader title={t('profilePageMe.devices.title')} subtitle={t('profilePageMe.devices.sub')}
                action={otherCount > 0 && (
                    <Button variant="quiet" size="sm" leftIcon={LogOut} loading={others.isPending} onClick={askOthers}>
                        {t('profilePageMe.devices.signOutOthers')}
                    </Button>
                )} />
            {failed && <Banner tone="bad" title={t('profilePageMe.devices.failed')}>{errorText(failed, t('peoplePage.error.body'))}</Banner>}
            {sessions.isPending ? (
                <div className="flex flex-col gap-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : sessions.isError ? (
                <EmptyState icon={AlertCircle} tone="bad" title={t('profilePageMe.devices.error')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void sessions.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('peoplePage.error.body')}
                </EmptyState>
            ) : (
                <ul className="flex flex-col divide-y divide-line-subtle">
                    {list.map((s) => {
                        const Icon = deviceName(s.user_agent).mobile ? Smartphone : Monitor;
                        return (
                            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-muted" aria-hidden><Icon size={17} /></span>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex flex-wrap items-center gap-2 type-small-semibold text-ink">
                                        {label(s)}
                                        {s.current && <Badge tone="ok" dot>{t('profilePageMe.devices.thisOne')}</Badge>}
                                    </span>
                                    <span className="type-caption text-muted">
                                        {s.current
                                            ? t('profilePageMe.devices.signedIn', { when: df.relative(s.created_at) })
                                            : t('profilePageMe.devices.lastUsed', { when: df.relative(s.last_used_at ?? s.created_at) })}
                                        {s.ip_address ? ` · ${s.ip_address}` : ''}
                                    </span>
                                </span>
                                {!s.current && (
                                    <Button variant="ghost" size="sm" disabled={one.isPending} onClick={() => askOne(s)}>
                                        {t('profilePageMe.devices.signOut')}
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
