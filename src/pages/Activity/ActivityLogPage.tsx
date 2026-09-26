import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, History, Layers, Lock, RotateCw, Settings2, X } from 'lucide-react';

import {
    Badge, Banner, Button, Card, CardHeader, EmptyState, SegmentedControl, SelectField, Skeleton, TextField,
} from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { Pagination } from '../../components/common/Pagination';
import { auditService, type MyAuditBucket } from '../../api/services/audit.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { EntryRow } from '../../features/audit/EntryRow';
import { RequestOlderDialog } from '../../features/audit/RequestOlderDialog';
import { PERIODS, eventLabel, periodRange, scopeLabel, type Period } from '../../features/audit/format';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 50;
const EVERYTHING = 0; // admin's view of every event, outside any bucket

/**
 * The activity log: the buckets admin has given this person, each a list of
 * what was done, by whom, to what, with the values before and after.
 * Admin also sees everything, outside any bucket.
 */
export default function ActivityLogPage() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.user?.role ?? '');
    const isAdmin = role === 'admin';
    // Parents have no sidebar; they come here from their profile.
    const isParent = role === 'parent';
    const [today] = useState(() => isoLocal(new Date()));

    const buckets = useQuery({ queryKey: ['audit', 'my-buckets'], queryFn: auditService.myBuckets });
    const catalogue = useQuery({ queryKey: ['audit', 'catalogue'], queryFn: auditService.getCatalogue, staleTime: 10 * 60 * 1000 });
    const requests = useQuery({ queryKey: ['audit', 'requests', 'mine'], queryFn: () => auditService.listRequests(), enabled: !isAdmin });

    const [picked, setPicked] = useState<number | null>(null);
    const [period, setPeriod] = useState<Period>('week');
    const [custom, setCustom] = useState({ start: today, end: today });
    const [event, setEvent] = useState('');
    const [person, setPerson] = useState<{ id: number; name: string } | null>(null);
    const [page, setPage] = useState(1);
    const [asking, setAsking] = useState(false);
    const [sent, setSent] = useState(false);

    const list = buckets.data ?? [];
    // Admin opens on everything; others on their first bucket.
    const bucketId = picked ?? (isAdmin ? EVERYTHING : list[0]?.id ?? null);
    const bucket: MyAuditBucket | undefined = list.find((b) => b.id === bucketId);
    const range = period === 'custom' ? custom : periodRange(period, today);

    const windowStart = bucket?.window_days ? (() => {
        const d = new Date(`${today}T12:00:00`);
        d.setDate(d.getDate() - bucket.window_days!);
        return isoLocal(d);
    })() : null;

    const events = useQuery({
        queryKey: ['audit', 'events', bucketId, range.start, range.end, event, person?.id, page],
        queryFn: () => auditService.getEvents({
            bucket_id: bucketId && bucketId !== EVERYTHING ? bucketId : undefined,
            start_date: range.start, end_date: range.end,
            event: event || undefined, actor_user_id: person?.id,
            skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE,
        }),
        enabled: bucketId !== null && range.start <= range.end,
        placeholderData: (prev) => prev,
        retry: (n, err) => !(isAxiosError(err) && err.response?.status === 403) && n < 2,
    });
    const needsRequest = isAxiosError(events.error) && events.error.response?.status === 403
        && (events.error.response.data as { detail?: { code?: string } })?.detail?.code === 'archive_required';

    const labels = new Map((catalogue.data?.events ?? []).map((e) => [e.key, e.label]));
    const bucketEvents = bucketId === EVERYTHING ? (catalogue.data?.events ?? []).map((e) => e.key) : bucket?.events ?? [];
    const reset = () => setPage(1);
    const choose = (id: number) => { setPicked(id); setEvent(''); reset(); };

    const total = events.data?.total_count ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const openRequests = (requests.data ?? []).filter((r) => r.bucket_id === bucketId && r.status !== 'rejected');

    const bucketButton = (id: number, name: string, sub: string) => (
        <li key={id}>
            <button type="button" onClick={() => choose(id)} aria-current={bucketId === id ? 'true' : undefined}
                className={cn('flex w-full flex-col rounded-row px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                    bucketId === id ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2')}>
                <span className="type-small-semibold">{name}</span>
                <span className="type-caption text-muted">{sub}</span>
            </button>
        </li>
    );

    if (buckets.isPending) {
        return <AppPage title={t('audit.title')} noSidebarOffset={isParent}><Skeleton className="h-64" /></AppPage>;
    }
    if (!isAdmin && list.length === 0) {
        return (
            <AppPage title={t('audit.title')} noSidebarOffset={isParent}>
                <Card><EmptyState icon={Lock} title={t('audit.noAccessTitle')}>{t('audit.noAccessBody')}</EmptyState></Card>
            </AppPage>
        );
    }

    return (
        <AppPage title={t('audit.title')} noSidebarOffset={isParent}>
            {isParent && <Button variant="quiet" leftIcon={ArrowLeft} className="w-fit" onClick={() => navigate('/profile')}>{t('audit.backToProfile')}</Button>}
            {isAdmin && (
                <PageBar actions={<Button variant="quiet" leftIcon={Settings2} onClick={() => navigate('/activity/manage')}>{t('audit.manage')}</Button>}>
                    <p className="type-small text-muted">{t('audit.adminIntro')}</p>
                </PageBar>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
                <Card className="gap-2 max-lg:hidden">
                    <CardHeader title={t('audit.buckets')} action={<Layers size={18} className="text-muted" aria-hidden />} />
                    <ul className="flex flex-col gap-1">
                        {isAdmin && bucketButton(EVERYTHING, t('audit.everything'), t('audit.everythingSub'))}
                        {list.map((b) => bucketButton(b.id, b.name, `${scopeLabel(t, b.scope)} · ${t('audit.eventCount', { count: b.events.length, n: b.events.length })}`))}
                    </ul>
                </Card>

                <div className="flex min-w-0 flex-col gap-3.5">
                    <div className="lg:hidden">
                        <SelectField label={t('audit.bucket')} value={String(bucketId ?? '')} onChange={(e) => choose(Number(e.target.value))}
                            options={[...(isAdmin ? [{ value: String(EVERYTHING), label: t('audit.everything') }] : []), ...list.map((b) => ({ value: String(b.id), label: b.name }))]} />
                    </div>

                    <Card className="gap-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <SegmentedControl size="sm" value={period} onChange={(p) => { setPeriod(p); reset(); }} aria-label={t('audit.period')}
                                options={PERIODS.map((p) => ({ value: p, label: t(`audit.periods.${p}`) }))} />
                            {bucketEvents.length > 1 && (
                                <SelectField label={t('audit.event')} value={event} onChange={(e) => { setEvent(e.target.value); reset(); }} containerClassName="min-w-[220px]"
                                    options={[{ value: '', label: t('audit.allEvents') }, ...bucketEvents.map((k) => ({ value: k, label: eventLabel(t, k, labels.get(k)) }))]} />
                            )}
                        </div>
                        {period === 'custom' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <TextField type="date" label={t('audit.from')} value={custom.start} max={custom.end}
                                    onChange={(e) => { setCustom((c) => ({ ...c, start: e.target.value })); reset(); }} hint={df.date(custom.start)} />
                                <TextField type="date" label={t('audit.to')} value={custom.end} min={custom.start} max={today}
                                    onChange={(e) => { setCustom((c) => ({ ...c, end: e.target.value })); reset(); }} hint={df.date(custom.end)} />
                            </div>
                        )}
                        {bucket && (
                            <p className="flex flex-wrap items-center gap-2 type-caption text-muted">
                                <Badge tone="brand">{scopeLabel(t, bucket.scope)}</Badge>
                                {t(`audit.scopeBody.${bucket.scope}`)}
                                {windowStart && ` ${t('audit.windowNote', { date: df.date(windowStart) })}`}
                            </p>
                        )}
                        {person && (
                            <button type="button" onClick={() => { setPerson(null); reset(); }}
                                className="flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 type-caption-semibold text-primary-text">
                                {t('audit.byPerson', { name: person.name })}<X size={13} aria-hidden />
                            </button>
                        )}
                    </Card>

                    {sent && <Banner tone="ok" title={t('audit.request.sent')}>{t('audit.request.sentBody')}</Banner>}
                    {openRequests.length > 0 && (
                        <Banner tone="info" icon={History} title={t('audit.request.yours')}>
                            {openRequests.map((r) => (
                                <span key={r.id} className="block">
                                    {t('leavePage.range', { from: df.date(r.start_date), to: df.date(r.end_date) })} · {t(`audit.request.status.${r.status}`)}
                                    {r.status === 'approved' && r.expires_at && ` · ${t('audit.request.openUntil', { date: df.date(r.expires_at) })}`}
                                </span>
                            ))}
                        </Banner>
                    )}

                    <Card className="gap-3">
                        <CardHeader title={bucketId === EVERYTHING ? t('audit.everything') : bucket?.name ?? t('audit.title')}
                            subtitle={events.data ? t('audit.entryCount', { count: total, n: total }) : undefined} />
                        {needsRequest && bucket && windowStart ? (
                            <EmptyState icon={Lock} title={t('audit.olderTitle')}
                                action={<Button leftIcon={History} onClick={() => { setSent(false); setAsking(true); }}>{t('audit.request.open')}</Button>}>
                                {t('audit.olderBody', { date: df.date(windowStart) })}
                            </EmptyState>
                        ) : events.isError ? (
                            <EmptyState icon={AlertCircle} tone="bad" title={t('audit.errorTitle')}
                                action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void events.refetch()}>{t('classesPage.action.retry')}</Button>}>
                                {t('peoplePage.error.body')}
                            </EmptyState>
                        ) : events.isPending ? (
                            <div className="flex flex-col gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                        ) : !events.data?.entries.length ? (
                            <EmptyState icon={History} title={t('audit.emptyTitle')}>{t('audit.emptyBody')}</EmptyState>
                        ) : (
                            <ul className="flex flex-col divide-y divide-line-subtle">
                                {events.data.entries.map((e) => (
                                    <EntryRow key={e.id} entry={e}
                                        onPerson={events.data.scope === 'own_actions' ? undefined : (id, name) => { setPerson({ id, name }); reset(); }} />
                                ))}
                            </ul>
                        )}
                        {totalPages > 1 && <Pagination variant="inset" page={page} totalPages={totalPages} totalCount={total} pageSize={PAGE_SIZE} onChange={setPage} />}
                    </Card>
                </div>
            </div>

            {asking && bucket && windowStart && (
                <RequestOlderDialog bucketId={bucket.id} bucketName={bucket.name} start={range.start < windowStart ? range.start : ''}
                    end={range.end < windowStart ? range.end : ''} windowStart={windowStart}
                    onClose={() => setAsking(false)} onDone={() => { setAsking(false); setSent(true); }} />
            )}
        </AppPage>
    );
}
