import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { notificationsService, type Feed, type FeedItem } from '../../api/services/notifications.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatRs } from '../../utils/money';
import { eventLabel } from '../audit/format';

export type NotificationKind = 'leave' | 'notice' | 'attendance' | 'fees' | 'audit';

export interface AppNotification {
    id: string;
    kind: NotificationKind;
    title: string;
    body?: string;
    at: string;
    to: string;
    tone?: 'bad' | 'warn' | 'ok' | 'info';
    read: boolean;
}

const KEY = ['notifications', 'feed'];
const FINANCE = ['admin', 'principal', 'accountant'];

/**
 * Figma H16 feed, from the server: events stored as they happened and the
 * notices this person can see. Read marks live on the server too, so an item
 * read on the phone is read on the office computer. A notification.new event
 * over the live connection refreshes the bell at once.
 */
export function useNotifications() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const role = useAuthStore((s) => s.user?.role ?? '');
    const signedIn = useAuthStore((s) => s.isAuthenticated);
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: KEY,
        queryFn: () => notificationsService.getFeed(),
        enabled: signedIn,
        staleTime: 30 * 1000,
        refetchInterval: 2 * 60 * 1000,
    });
    useWebSocket({ 'notification.new': () => void queryClient.invalidateQueries({ queryKey: KEY }) });

    // Read marks show at once; the server's count replaces the guess.
    const setRead = (ids: string[] | 'all') => queryClient.setQueryData<Feed>(KEY, (feed) => {
        if (!feed) return feed;
        const flips = (i: FeedItem) => !i.read && (ids === 'all' || ids.includes(i.id));
        const flipped = feed.items.filter(flips).length;
        return {
            items: feed.items.map((i) => (flips(i) ? { ...i, read: true } : i)),
            unread_count: ids === 'all' ? 0 : Math.max(0, feed.unread_count - flipped),
        };
    });
    const settle = (res: { unread_count: number }) => queryClient.setQueryData<Feed>(KEY, (feed) => feed && { ...feed, unread_count: res.unread_count });
    const readSome = useMutation({
        mutationFn: notificationsService.markRead,
        onMutate: (ids) => setRead(ids),
        onSuccess: settle,
        onError: () => void queryClient.invalidateQueries({ queryKey: KEY }),
    });
    const readAll = useMutation({
        mutationFn: notificationsService.markAllRead,
        onMutate: () => setRead('all'),
        onSuccess: settle,
        onError: () => void queryClient.invalidateQueries({ queryKey: KEY }),
    });

    const describe = useCallback((i: FeedItem): AppNotification => {
        const p = i.params;
        const sid = p.student_id;
        const name = String(p.name ?? '');
        const base = { id: i.id, at: i.created_at, read: i.read };
        const leaveType = t(`leavePage.type.${p.leave_type}`, { defaultValue: String(p.leave_type ?? '') });
        const range = p.start_date === p.end_date
            ? df.date(String(p.start_date))
            : t('leavePage.range', { from: df.date(String(p.start_date)), to: df.date(String(p.end_date)) });
        const money = (v: unknown) => formatRs(String(v ?? 0), df.lang);
        switch (i.kind) {
            case 'leave.requested':
                return { ...base, kind: 'leave', tone: 'warn', to: role === 'teacher' ? '/home/teacher' : '/leave-approvals',
                    title: t('notifications.leaveRequest', { name, type: leaveType.toLowerCase() }), body: range };
            case 'leave.decided': {
                const ok = p.status === 'approved';
                const child = role === 'parent' && sid;
                return { ...base, kind: 'leave', tone: ok ? 'ok' : 'bad',
                    to: child ? `/parent/child/${sid}/leave` : role === 'student' ? '/home/student' : '/leave',
                    title: child
                        ? t(ok ? 'notifications.childLeaveApproved' : 'notifications.childLeaveDeclined', { name, date: range })
                        : t(ok ? 'notifications.leaveApproved' : 'notifications.leaveDeclined', { date: range }),
                    body: leaveType };
            }
            case 'attendance.absent':
                return { ...base, kind: 'attendance', tone: 'bad', to: role === 'parent' ? `/parent/child/${sid}/attendance` : '/attendance',
                    title: t('notifications.absent', { name }), body: df.date(String(p.date)) };
            case 'attendance.unmarked':
                return { ...base, kind: 'attendance', tone: 'warn', to: '/attendance',
                    title: t('notifications.unmarked', { count: Number(p.count ?? 0) }), body: df.date(String(p.date)) };
            case 'welfare.flag':
                return { ...base, kind: 'attendance', tone: 'bad', to: `/people/students/${sid}`,
                    title: t('notifications.welfare', { name, count: Number(p.days ?? 0) }), body: t('notifications.welfareBody') };
            case 'fee.reminder':
                return { ...base, kind: 'fees', tone: 'warn', to: role === 'parent' ? `/parent/child/${sid}/fees` : '/finances/outstanding',
                    title: t('notifications.feeReminder', { name }), body: t('notifications.feeDue', { amount: money(p.amount) }) };
            case 'fee.paid':
                return { ...base, kind: 'fees', tone: 'ok', to: role === 'parent' ? `/parent/child/${sid}/fees` : FINANCE.includes(role) ? '/finances' : '/',
                    title: t('notifications.feePaid', { name }), body: t('notifications.feePaidBody', { amount: money(p.amount), receipt: p.receipt_no ?? '' }) };
            case 'audit.archive_requested':
                return { ...base, kind: 'audit', tone: 'info', to: '/activity/manage',
                    title: t('notifications.auditRequested', { name }), body: range };
            case 'audit.alert': {
                const repeated = p.event === 'security.repeated_sign_in_failures';
                const label = eventLabel(t, String(p.event ?? ''), String(p.label ?? ''));
                return { ...base, kind: 'audit', tone: repeated ? 'bad' : 'warn',
                    // The account's owner goes to their devices; admin to the log.
                    to: role === 'admin' ? '/activity' : '/profile',
                    title: repeated ? t('notifications.auditRepeatedSignIn', { count: Number(p.count ?? 0), email: p.email ?? '' })
                        : p.actor_name ? t('notifications.auditAlert', { name: p.actor_name, what: label.toLowerCase() }) : label,
                    body: repeated ? t('notifications.auditRepeatedBody') : t('notifications.auditAlertBody') };
            }
            case 'audit.archive_decided': {
                const ok = p.status === 'approved';
                return { ...base, kind: 'audit', tone: ok ? 'ok' : 'bad', to: '/activity',
                    title: t(ok ? 'notifications.auditApproved' : 'notifications.auditDeclined'), body: range };
            }
            case 'notice':
            default:
                return { ...base, kind: 'notice', tone: p.priority === 'high' ? 'bad' : 'info', to: '/communication',
                    title: String(p.title ?? ''), body: p.posted_by_name ? t('notifications.noticeFrom', { name: p.posted_by_name }) : undefined };
        }
    }, [t, df, role]);

    const items = useMemo(() => (query.data?.items ?? []).map(describe), [query.data, describe]);

    return {
        items,
        unreadCount: query.data?.unread_count ?? 0,
        markRead: (ids: string[]) => { if (ids.length) readSome.mutate(ids); },
        markAllRead: () => readAll.mutate(),
        isPending: query.isPending && signedIn,
        isError: query.isError,
        refetch: () => void query.refetch(),
    };
}
