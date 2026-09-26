import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Bell, CalendarCheck, CheckCheck, ClipboardCheck, Megaphone, RotateCw, Settings, type LucideIcon } from 'lucide-react';

import { Button, EmptyState, FilterChips, Skeleton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import { HeaderPopover } from './HeaderPopover';
import { useNotifications, type AppNotification, type NotificationKind } from './useNotifications';

type Filter = 'all' | 'unread' | NotificationKind;
const ICON: Record<NotificationKind, LucideIcon> = { leave: CalendarCheck, notice: Megaphone, attendance: ClipboardCheck };
const TONE = { bad: 'bg-bad-soft text-bad', warn: 'bg-warn-soft text-warn', ok: 'bg-ok-soft text-ok', info: 'bg-info-soft text-info' };

/**
 * Figma H16 Notifications: the bell in the top bar and its panel. Items
 * come from the school's own data (see useNotifications); tapping one opens
 * the page it is about and marks it read.
 */
export function NotificationsBell({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [open, setOpen] = useState(false);
    const feed = useNotifications();
    const n = feed.unread.length;
    return (
        <div className="relative shrink-0">
            <button type="button" data-popover-toggle onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog"
                aria-label={n ? t('notifications.bellUnread', { count: n }) : t('notifications.bell')} className={className}>
                <Bell size={18} aria-hidden />
                {n > 0 && (
                    <span aria-hidden className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-bad px-1 type-micro-bold text-white ring-2 ring-canvas">
                        {n > 9 ? '9+' : formatCount(n, lang)}
                    </span>
                )}
            </button>
            <HeaderPopover open={open} onClose={() => setOpen(false)} label={t('notifications.title')}>
                <Panel feed={feed} onClose={() => setOpen(false)} />
            </HeaderPopover>
        </div>
    );
}

function Panel({ feed, onClose }: { feed: ReturnType<typeof useNotifications>; onClose: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const [filter, setFilter] = useState<Filter>('all');
    const today = new Date().toDateString();

    const match = (i: AppNotification) => filter === 'all' || (filter === 'unread' ? !feed.isRead(i.id) : i.kind === filter);
    const shown = feed.items.filter(match);
    const groups = [
        { key: 'today', items: shown.filter((i) => new Date(i.at).toDateString() === today) },
        { key: 'earlier', items: shown.filter((i) => new Date(i.at).toDateString() !== today) },
    ].filter((g) => g.items.length);
    const kinds = (['leave', 'notice', 'attendance'] as NotificationKind[]).filter((k) => feed.items.some((i) => i.kind === k));
    const open = (i: AppNotification) => { feed.markRead([i.id]); onClose(); navigate(i.to); };

    return (
        <>
            <div className="flex items-center gap-2 border-b border-line-subtle px-4 py-3">
                <p className="flex-1 type-body-semibold text-ink">
                    {t('notifications.title')}
                    {feed.unread.length > 0 && <span className="ml-2 type-small text-muted">{t('notifications.newCount', { n: formatCount(feed.unread.length, lang) })}</span>}
                </p>
                {feed.unread.length > 0 && (
                    <Button variant="ghost" size="sm" leftIcon={CheckCheck} onClick={() => feed.markRead(feed.unread.map((i) => i.id))}>{t('notifications.markAll')}</Button>
                )}
            </div>
            {feed.items.length > 0 && (
                <div className="border-b border-line-subtle px-4 py-2.5">
                    <FilterChips aria-label={t('notifications.filter')} value={filter} onChange={setFilter} className="max-md:mx-0 max-md:px-0"
                        items={[
                            { value: 'all' as Filter, label: t('notifications.all') },
                            { value: 'unread' as Filter, label: t('notifications.unread'), count: formatCount(feed.unread.length, lang) },
                            ...kinds.map((k) => ({ value: k as Filter, label: t(`notifications.kind.${k}`) })),
                        ]} />
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {feed.isPending ? (
                    <div className="flex flex-col gap-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                ) : feed.isError ? (
                    <EmptyState icon={AlertCircle} tone="bad" title={t('notifications.errorTitle')}
                        action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={feed.refetch}>{t('classesPage.action.retry')}</Button>}>
                        {t('notifications.errorBody')}
                    </EmptyState>
                ) : shown.length === 0 ? (
                    <EmptyState icon={Bell} title={t('notifications.emptyTitle')}>{t('notifications.emptyBody')}</EmptyState>
                ) : groups.map((g) => (
                    <section key={g.key} aria-label={t(`notifications.group.${g.key}`)}>
                        <p className="px-4 pt-3 pb-1 type-micro-bold uppercase tracking-wide text-muted">{t(`notifications.group.${g.key}`)}</p>
                        <ul>
                            {g.items.map((i) => {
                                const Icon = ICON[i.kind];
                                const unread = !feed.isRead(i.id);
                                return (
                                    <li key={i.id}>
                                        <button type="button" onClick={() => open(i)}
                                            className={cn('flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2', unread && 'bg-primary-soft/40')}>
                                            <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', TONE[i.tone ?? 'info'])} aria-hidden><Icon size={17} /></span>
                                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span className={cn('type-small text-ink', unread ? 'font-semibold' : 'font-medium')}>{i.title}</span>
                                                {i.body && <span className="truncate type-caption text-ink-2">{i.body}</span>}
                                                <span className="type-caption text-muted">{df.relative(i.at)}</span>
                                            </span>
                                            {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label={t('notifications.unread')} />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
            <div className="border-t border-line-subtle px-4 py-2.5">
                <Button variant="ghost" size="sm" leftIcon={Settings} onClick={() => { onClose(); navigate('/profile'); }}>{t('notifications.settings')}</Button>
            </div>
        </>
    );
}
