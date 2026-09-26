import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { leavesService } from '../../api/services/leaves.service';
import { noticesService } from '../../api/services/notices.service';
import { attendanceService } from '../../api/services/attendance.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatISODate } from '../../utils/nepaliDate';
import { usePendingLeaveCount } from './usePendingLeaveCount';

export type NotificationKind = 'leave' | 'notice' | 'attendance';

export interface AppNotification {
    id: string;
    kind: NotificationKind;
    title: string;
    body?: string;
    at: string;
    to: string;
    tone?: 'bad' | 'warn' | 'ok' | 'info';
}

const WEEK = 7 * 864e5;
const APPROVERS = ['admin', 'principal'];
const MARKERS = ['admin', 'principal', 'coordinator'];
const STAFF = ['admin', 'principal', 'coordinator', 'teacher', 'staff', 'accountant'];

/** Read state lives on this device: the API keeps no per-user notification feed. */
function useSeen(userId?: number) {
    const key = `sx-seen-notifications-${userId ?? 'anon'}`;
    const [seen, setSeen] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
    });
    const save = useCallback((ids: string[]) => {
        const next = [...new Set([...seen, ...ids])].slice(-400);
        setSeen(next);
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* not remembered */ }
    }, [key, seen]);
    return { seen: useMemo(() => new Set(seen), [seen]), markSeen: save };
}

/**
 * Figma H16 feed, built from what the school's data already says: leave
 * requests waiting for you, decisions on your own leave, notices from the
 * last week, and classes whose attendance is still unmarked today.
 */
export function useNotifications() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const user = useAuthStore((s) => s.user);
    const role = user?.role ?? '';
    const today = formatISODate(new Date());
    const { seen, markSeen } = useSeen(user?.id);
    // Taken once per mount: the feed is a snapshot, refreshed with its queries.
    const [now] = useState(() => Date.now());

    const pending = usePendingLeaveCount();
    const myLeave = useQuery({
        queryKey: ['leaves', 'my-history'],
        queryFn: () => leavesService.listLeaves({ limit: 200 }),
        enabled: STAFF.includes(role),
        staleTime: 60 * 1000,
    });
    const notices = useQuery({
        queryKey: ['notices', 'feed'],
        queryFn: () => noticesService.getNotices({ limit: 20 }),
        enabled: !!user,
        staleTime: 60 * 1000,
    });
    const attendance = useQuery({
        queryKey: ['attendance', 'today-summary', today],
        queryFn: attendanceService.getTodaySummary,
        enabled: MARKERS.includes(role),
        staleTime: 60 * 1000,
    });

    const items = useMemo(() => {
        const out: AppNotification[] = [];
        (APPROVERS.includes(role) ? pending.data ?? [] : [])
            .filter((l) => l.applicant_user_id !== user?.id)
            .forEach((l) => out.push({
                id: `leave-request-${l.id}`, kind: 'leave', tone: 'warn', at: l.created_at, to: '/leave-approvals',
                title: t('notifications.leaveRequest', { name: l.applicant_name, type: t(`leavePage.type.${l.leave_type}`).toLowerCase() }),
                body: l.start_date === l.end_date ? df.date(l.start_date) : t('leavePage.range', { from: df.date(l.start_date), to: df.date(l.end_date) }),
            }));
        (myLeave.data?.leaves ?? [])
            .filter((l) => (!APPROVERS.includes(role) || l.applicant_user_id === user?.id) && l.status !== 'pending' && l.decided_at && now - new Date(l.decided_at).getTime() < 2 * WEEK)
            .forEach((l) => out.push({
                id: `leave-decision-${l.id}-${l.status}`, kind: 'leave', tone: l.status === 'approved' ? 'ok' : 'bad', at: l.decided_at!, to: '/leave',
                title: t(l.status === 'approved' ? 'notifications.leaveApproved' : 'notifications.leaveDeclined', { date: df.date(l.start_date) }),
                body: t(`leavePage.type.${l.leave_type}`),
            }));
        (notices.data ?? [])
            .filter((n) => now - new Date(n.created_at).getTime() < WEEK)
            .forEach((n) => out.push({
                id: `notice-${n.id}`, kind: 'notice', tone: n.priority === 'high' ? 'bad' : 'info', at: n.created_at, to: '/communication',
                title: n.title, body: n.posted_by_name ? t('notifications.noticeFrom', { name: n.posted_by_name }) : undefined,
            }));
        const a = attendance.data;
        // After 10 AM an unmarked register is worth a nudge; before, it is just early.
        if (a && a.sections_total > a.sections_marked && new Date(now).getHours() >= 10) {
            const left = a.sections_total - a.sections_marked;
            out.push({
                id: `attendance-${today}-${left}`, kind: 'attendance', tone: 'warn', at: `${today}T10:00:00`, to: '/attendance',
                title: t('notifications.unmarked', { count: left }), body: t('notifications.unmarkedBody', { marked: a.sections_marked, total: a.sections_total }),
            });
        }
        return out.sort((x, y) => y.at.localeCompare(x.at));
    }, [role, pending.data, myLeave.data, notices.data, attendance.data, user?.id, t, df, today, now]);

    const unread = items.filter((i) => !seen.has(i.id));
    const sources = [notices, ...(STAFF.includes(role) ? [myLeave] : []), ...(APPROVERS.includes(role) ? [pending] : []), ...(MARKERS.includes(role) ? [attendance] : [])];
    return {
        items,
        unread,
        isRead: (id: string) => seen.has(id),
        markRead: (ids: string[]) => markSeen(ids),
        isPending: sources.some((s) => s.isPending && s.fetchStatus !== 'idle'),
        isError: sources.length > 0 && sources.every((s) => s.isError),
        refetch: () => sources.forEach((s) => void s.refetch()),
    };
}
