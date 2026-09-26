import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Bell, CalendarX, Copy, Megaphone, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react';

import { Badge, Button, Card, Dialog, EmptyState, FilterChips, SearchField, SegmentedControl, Skeleton } from '../design-system';
import { AppPage, PageBar, Toolbar } from '../components/layout/AppPage';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { noticesService } from '../api/services/notices.service';
import { academicsService } from '../api/services/academics.service';
import { peopleService } from '../api/services/people.service';
import { requestFCMToken, deviceService } from '../api/services/device.service';
import { NoticeDialog } from '../features/notices/NoticeDialog';
import { audienceLabel, noticeState, yesterdayISO, type NoticeNames } from '../features/notices/format';
import { useNotice } from '../features/people/useNotice';
import { errorText } from '../features/people/format';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionsStore } from '../store/usePermissionsStore';
import { useDateFormat } from '../hooks/useDateFormat';
import { homeForRole } from '../utils/roleHome';
import { formatCount } from '../utils/money';
import { cn } from '../utils/cn';
import type { Notice } from '../types/notice';

type Status = 'current' | 'expired' | 'all';
type Filter = 'all' | 'urgent' | 'everyone' | 'role' | 'class' | 'student';
const MATCH: Record<Filter, (n: Notice) => boolean> = {
    all: () => true,
    urgent: (n) => n.priority === 'high',
    everyone: (n) => n.scope === 'all',
    role: (n) => n.scope === 'role',
    class: (n) => n.scope === 'class_section',
    student: (n) => n.scope === 'student',
};

/**
 * Figma G04 Notices: the notice board for every signed-in role. Admin and
 * principal post, edit, copy, end and delete notices, and can look back at
 * expired ones; everyone else reads what is meant for them (the server
 * decides which notices that is).
 *
 * Adapted: the API keeps no delivery or read counts and no attachments, so
 * the Figma "Delivery" block is left out.
 */
export default function CommunicationPage() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const canManage = user?.role === 'admin' || user?.role === 'principal';
    const isParent = user?.role === 'parent';

    const [status, setStatus] = useState<Status>('current');
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; notice?: Notice } | null>(null);
    const [pushState, setPushState] = useState<'idle' | 'enabling' | 'enabled' | 'unavailable'>('idle');

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['notices', 'board', canManage ? status : 'current'],
        queryFn: () => noticesService.getNotices(canManage ? { status, limit: 100 } : { limit: 100 }),
    });
    const notices = useMemo(() => data ?? [], [data]);

    // Names for "Class 10 A" and "Aarav Shrestha". Roles that cannot list
    // classes get the generic label rather than a request that would 403.
    const needsClasses = notices.some((n) => n.scope === 'class_section');
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: needsClasses && can('classes', 'read'), staleTime: 5 * 60 * 1000 });
    const sections = useQuery({ queryKey: ['sections', 'all-names'], queryFn: () => academicsService.getSections({ limit: 100 }), enabled: needsClasses && can('sections', 'read'), staleTime: 5 * 60 * 1000 });
    const studentIds = [...new Set(notices.filter((n) => n.scope === 'student' && n.student_id).map((n) => n.student_id!))];
    const students = useQueries({
        queries: studentIds.map((id) => ({ queryKey: ['students', 'one', id], queryFn: () => peopleService.getStudent(id), staleTime: Infinity, retry: false })),
    });
    const names: NoticeNames = {
        classes: Object.fromEntries((classes.data?.classes ?? []).map((c) => [c.id, c.name])),
        sections: Object.fromEntries((sections.data?.sections ?? []).map((s) => [s.id, s.name])),
        students: Object.fromEntries(students.flatMap((q, i) => (q.data ? [[studentIds[i], `${q.data.first_name} ${q.data.last_name}`]] : []))),
    };

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['notices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-notices'] });
    };
    const remove = useMutation({
        mutationFn: (n: Notice) => noticesService.deleteNotice(n.id),
        onSuccess: () => { refresh(); setSelectedId(null); setSheetOpen(false); notify({ tone: 'ok', title: t('noticesPage.deleted') }); },
        onError: (err) => notify({ tone: 'bad', title: t('noticesPage.actionFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const end = useMutation({
        mutationFn: (n: Notice) => noticesService.updateNotice(n.id, { valid_to: yesterdayISO() }),
        onSuccess: () => { refresh(); notify({ tone: 'ok', title: t('noticesPage.ended') }); },
        onError: (err) => notify({ tone: 'bad', title: t('noticesPage.actionFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const askDelete = (n: Notice) => confirm({ title: t('confirm.deleteNotice.title'), body: t('confirm.deleteNotice.body', { title: n.title }), confirmLabel: t('confirm.deleteNotice.action'), onConfirm: () => remove.mutate(n) });
    const askEnd = (n: Notice) => confirm({ title: t('noticesPage.endTitle'), body: t('noticesPage.endBody', { title: n.title }), confirmLabel: t('noticesPage.end'), tone: 'neutral', onConfirm: () => end.mutate(n) });

    const enablePush = async () => {
        setPushState('enabling');
        try {
            const token = await requestFCMToken();
            if (!token) return setPushState('unavailable');
            await deviceService.registerToken(token);
            setPushState('enabled');
            notify({ tone: 'ok', title: t('noticesPage.pushOn') });
        } catch {
            setPushState('unavailable');
        }
    };

    const q = search.trim().toLowerCase();
    const searched = q ? notices.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) : notices;
    const shown = searched.filter(MATCH[filter]);
    const chips = (Object.keys(MATCH) as Filter[])
        .map((f) => ({ value: f, label: t(`noticesPage.filter.${f}`), n: searched.filter(MATCH[f]).length }))
        .filter((c) => c.value === 'all' || c.value === filter || c.n > 0)
        .map((c) => ({ value: c.value, label: c.label, count: formatCount(c.n, lang) }));
    const selected = shown.find((n) => n.id === selectedId) ?? shown[0] ?? null;

    // Laptops show the notice beside the list; phones open it as a sheet.
    const open = (n: Notice) => {
        setSelectedId(n.id);
        if (!window.matchMedia('(min-width: 1024px)').matches) setSheetOpen(true);
    };
    const actions = (n: Notice) => canManage && (
        <div className="flex flex-wrap gap-2">
            <Button variant="quiet" size="sm" leftIcon={Pencil} onClick={() => setDialog({ mode: 'edit', notice: n })}>{t('noticesPage.edit')}</Button>
            <Button variant="quiet" size="sm" leftIcon={Copy} onClick={() => setDialog({ mode: 'create', notice: n })}>{t('noticesPage.copy')}</Button>
            {noticeState(n) !== 'ended' && <Button variant="quiet" size="sm" leftIcon={CalendarX} onClick={() => askEnd(n)}>{t('noticesPage.end')}</Button>}
            <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => askDelete(n)} className="text-bad">{t('noticesPage.delete')}</Button>
        </div>
    );

    const pageActions = (
        <>
            {isParent && <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => navigate(homeForRole('parent'))}>{t('noticesPage.back')}</Button>}
            {pushState !== 'enabled' && pushState !== 'unavailable' && (
                <Button variant="quiet" leftIcon={Bell} loading={pushState === 'enabling'} onClick={() => void enablePush()}>{t('noticesPage.pushEnable')}</Button>
            )}
            {canManage && <Button leftIcon={Plus} onClick={() => setDialog({ mode: 'create' })}>{t('noticesPage.post')}</Button>}
        </>
    );

    const list = isPending ? (
        <div className="flex flex-col gap-2.5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-card" />)}</div>
    ) : isError ? (
        <Card>
            <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
                {t('peoplePage.error.body')}
            </EmptyState>
        </Card>
    ) : shown.length === 0 ? (
        <Card>
            {notices.length === 0 && status === 'current' ? (
                <EmptyState icon={Megaphone} title={t('noticesPage.empty')}
                    action={canManage && <Button leftIcon={Plus} onClick={() => setDialog({ mode: 'create' })}>{t('noticesPage.post')}</Button>}>
                    {canManage ? t('noticesPage.emptyManager') : t('noticesPage.emptyReader')}
                </EmptyState>
            ) : (
                <EmptyState icon={Megaphone} title={t('noticesPage.noMatch')}
                    action={<Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilter('all'); }}>{t('common.clearFilters')}</Button>}>
                    {t('peoplePage.empty.filtered')}
                </EmptyState>
            )}
        </Card>
    ) : (
        <ul className="flex flex-col gap-2.5">
            {shown.map((n) => (
                <li key={n.id}>
                    <NoticeRow notice={n} audience={audienceLabel(n, names, t)} active={selected?.id === n.id} onOpen={() => open(n)} />
                </li>
            ))}
        </ul>
    );

    return (
        <AppPage title={t('noticesPage.title')} noSidebarOffset={isParent}>
            {confirmUI}
            <PageBar actions={pageActions}>
                <p className="type-small text-muted">{canManage ? t('noticesPage.introManager') : t('noticesPage.introReader')}</p>
            </PageBar>
            {noticeUI}

            {notices.length > 0 && <FilterChips items={chips} value={filter} onChange={setFilter} aria-label={t('noticesPage.filterLabel')} />}
            <Toolbar>
                <SearchField value={search} onChange={setSearch} placeholder={t('noticesPage.search')} clearLabel={t('common.clear')} containerClassName="md:w-[300px]" />
                {canManage && (
                    <SegmentedControl size="sm" value={status} onChange={(v) => { setStatus(v); setSelectedId(null); }} aria-label={t('noticesPage.statusLabel')} className="w-max"
                        options={(['current', 'expired', 'all'] as const).map((s) => ({ value: s, label: t(`noticesPage.status.${s}`) }))} />
                )}
            </Toolbar>

            <div className={cn('grid min-w-0 gap-4 lg:items-start', selected && 'lg:grid-cols-[minmax(0,1fr)_400px]')}>
                <div className="min-w-0">{list}</div>
                {selected && !isPending && !isError && (
                    <Card className="sticky top-0 gap-4 max-lg:hidden" aria-label={selected.title}>
                        <NoticeDetail notice={selected} audience={audienceLabel(selected, names, t)} />
                        {actions(selected)}
                    </Card>
                )}
            </div>

            {/* Phones: the notice opens as a sheet. */}
            {sheetOpen && selected && (
                <Dialog open onClose={() => setSheetOpen(false)} title={selected.title} closeLabel={t('common.close')}
                    footer={canManage ? actions(selected) : undefined}>
                    <NoticeDetail notice={selected} audience={audienceLabel(selected, names, t)} hideTitle />
                </Dialog>
            )}

            {dialog && (
                <NoticeDialog key={`${dialog.mode}-${dialog.notice?.id ?? 'new'}`} mode={dialog.mode} notice={dialog.notice} onClose={() => setDialog(null)}
                    onSaved={(saved) => {
                        setDialog(null);
                        refresh();
                        setSelectedId(saved.id);
                        notify({ tone: 'ok', title: dialog.mode === 'edit' ? t('noticesPage.saved') : noticeState(saved) === 'scheduled' ? t('noticesPage.scheduled', { date: df.date(saved.valid_from) }) : t('noticesPage.posted') });
                    }} />
            )}
        </AppPage>
    );
}

function Badges({ notice, audience }: { notice: Notice; audience: string }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const state = noticeState(notice);
    return (
        <span className="flex flex-wrap items-center gap-1.5">
            {notice.priority === 'high' && <Badge tone="bad" dot>{t('noticesPage.priority.high')}</Badge>}
            {notice.priority === 'low' && <Badge tone="neutral">{t('noticesPage.priority.low')}</Badge>}
            <Badge tone="brand">{audience}</Badge>
            {state === 'scheduled' && <Badge tone="info">{t('noticesPage.startsOn', { date: df.date(notice.valid_from) })}</Badge>}
            {state === 'ended' && <Badge tone="neutral">{t('noticesPage.endedBadge')}</Badge>}
        </span>
    );
}

/** Figma G04 notice row: date tile, badges, title, two lines of the message. */
function NoticeRow({ notice, audience, active, onOpen }: { notice: Notice; audience: string; active: boolean; onOpen: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const shownOn = noticeState(notice) === 'scheduled' ? notice.valid_from! : notice.created_at;
    return (
        <button type="button" onClick={onOpen} aria-current={active ? 'true' : undefined}
            className={cn(
                'flex w-full gap-3.5 rounded-card border bg-surface p-4 text-left shadow-e1 outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-focus/60 lg:p-[18px]',
                'border-line', active ? 'lg:border-primary lg:shadow-e2' : 'hover:border-primary-soft-line',
                noticeState(notice) === 'ended' && 'opacity-75',
            )}>
            <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-row bg-sunken">
                <span className="type-micro text-muted">{df.monthShort(shownOn)}</span>
                <span className="type-title text-ink">{df.day(shownOn)}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Badges notice={notice} audience={audience} />
                <span className="type-body-semibold text-ink">{notice.title}</span>
                <span className="line-clamp-2 type-small text-ink-2">{notice.body}</span>
                <span className="type-caption text-muted">
                    {notice.valid_to ? t('noticesPage.until', { date: df.date(notice.valid_to) }) : t('noticesPage.noEnd')}
                </span>
            </span>
        </button>
    );
}

function NoticeDetail({ notice, audience, hideTitle }: { notice: Notice; audience: string; hideTitle?: boolean }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <Badges notice={notice} audience={audience} />
            {!hideTitle && <h2 className="type-h3 text-ink">{notice.title}</h2>}
            <p className="type-caption text-muted">
                {t('noticesPage.postedBy', { date: df.dateTime(notice.created_at), name: notice.posted_by_name || t('noticesPage.someone') })}{' '}
                {notice.valid_to ? t('noticesPage.shownUntil', { date: df.date(notice.valid_to) }) : t('noticesPage.shownAlways')}
            </p>
            <p className="whitespace-pre-wrap break-words type-body text-ink-2">{notice.body}</p>
        </div>
    );
}
