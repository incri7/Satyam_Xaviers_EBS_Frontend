import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Check, Layers, ListTree, Pencil, Plus, RotateCw, ShieldAlert, Trash2, UserCheck, X } from 'lucide-react';

import {
    ActionMenu, Badge, Banner, Button, Card, EmptyState, FilterChips, Skeleton, Table, TableCard, THead, Td, Th, Tr, Tabs, TextAreaField, Dialog,
} from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { auditService, type ArchiveRequest, type AuditBucket, type AuditCatalogue } from '../../api/services/audit.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { BucketDialog } from '../../features/audit/BucketDialog';
import { GrantsDialog } from '../../features/audit/GrantsDialog';
import { categoryLabel, eventLabel, roleLabel, scopeLabel } from '../../features/audit/format';
import { errorText } from '../../features/people/format';

type Tab = 'buckets' | 'requests' | 'apis';

/**
 * Admin: arrange the activity log. Buckets gather events; each bucket is
 * given to roles or people with a scope; requests for activity older than
 * three months are answered here; and the API list shows which API records
 * which event, and which are deliberately not recorded.
 */
export default function ManageActivityPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('buckets');
    const [editing, setEditing] = useState<AuditBucket | 'new' | null>(null);
    const [granting, setGranting] = useState<AuditBucket | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const catalogue = useQuery({ queryKey: ['audit', 'catalogue'], queryFn: auditService.getCatalogue, staleTime: 10 * 60 * 1000 });
    const pending = useQuery({ queryKey: ['audit', 'requests', 'pending'], queryFn: () => auditService.listRequests('pending') });

    return (
        <AppPage title={t('audit.manageTitle')}>
            <PageBar actions={tab === 'buckets' && catalogue.data
                ? <Button leftIcon={Plus} onClick={() => setEditing('new')}>{t('audit.newBucket')}</Button> : undefined}>
                <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => navigate('/activity')}>{t('audit.title')}</Button>
            </PageBar>
            <Tabs value={tab} onChange={setTab} aria-label={t('audit.manageTitle')} items={[
                { value: 'buckets', label: t('audit.tabs.buckets'), icon: Layers },
                { value: 'requests', label: t('audit.tabs.requests'), icon: UserCheck, count: pending.data?.length || undefined },
                { value: 'apis', label: t('audit.tabs.apis'), icon: ListTree },
            ]} />
            {notice && <Banner tone="ok" title={notice} />}

            {tab === 'buckets' && <BucketsTab catalogue={catalogue.data} onEdit={setEditing} onGrant={setGranting} onNotice={setNotice} />}
            {tab === 'requests' && <RequestsTab />}
            {tab === 'apis' && <ApisTab catalogue={catalogue.data} isError={catalogue.isError} />}

            {editing && catalogue.data && (
                <BucketDialog bucket={editing === 'new' ? null : editing} catalogue={catalogue.data} onClose={() => setEditing(null)}
                    onDone={(b) => { setEditing(null); setNotice(t('audit.bucketSaved', { name: b.name })); if (editing === 'new') setGranting(b); }} />
            )}
            {granting && (
                <GrantsDialog bucket={granting} onClose={() => setGranting(null)}
                    onDone={() => { setGranting(null); setNotice(t('audit.grants.saved', { name: granting.name })); }} />
            )}
        </AppPage>
    );
}

function BucketsTab({ catalogue, onEdit, onGrant, onNotice }: {
    catalogue?: AuditCatalogue;
    onEdit: (b: AuditBucket) => void;
    onGrant: (b: AuditBucket) => void;
    onNotice: (s: string) => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const buckets = useQuery({ queryKey: ['audit', 'buckets'], queryFn: auditService.listBuckets });
    const remove = useMutation({
        mutationFn: (b: AuditBucket) => auditService.deleteBucket(b.id),
        onSuccess: (_, b) => { queryClient.invalidateQueries({ queryKey: ['audit'] }); onNotice(t('audit.bucketDeleted', { name: b.name })); },
    });
    const labels = new Map((catalogue?.events ?? []).map((e) => [e.key, e]));

    if (buckets.isPending) return <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
    if (buckets.isError) {
        return <Card><EmptyState icon={AlertCircle} tone="bad" title={t('audit.errorTitle')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void buckets.refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>;
    }
    if (!buckets.data.length) {
        return <Card><EmptyState icon={Layers} title={t('audit.noBucketsTitle')}>{t('audit.noBucketsBody')}</EmptyState></Card>;
    }
    return (
        <div className="grid gap-3.5 md:grid-cols-2">
            {confirmUI}
            {buckets.data.map((b) => {
                const cats = [...new Set(b.events.map((k) => labels.get(k)?.category).filter(Boolean))] as string[];
                const sensitive = b.events.some((k) => labels.get(k)?.sensitivity === 'admin');
                return (
                    <Card key={b.id} className="gap-3">
                        <div className="flex items-start gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <p className="type-body-semibold text-ink">{b.name}</p>
                                {b.description && <p className="type-small text-ink-2">{b.description}</p>}
                            </div>
                            <ActionMenu label={t('financePage.payments.more')} items={[
                                { label: t('audit.editBucket'), icon: Pencil, onSelect: () => onEdit(b) },
                                { label: t('audit.whoCanSee'), icon: UserCheck, onSelect: () => onGrant(b) },
                                { label: t('audit.deleteBucket'), icon: Trash2, tone: 'bad', onSelect: () => confirm({
                                    title: t('audit.deleteTitle', { name: b.name }), body: t('audit.deleteBody'),
                                    confirmLabel: t('audit.deleteBucket'), onConfirm: () => remove.mutate(b),
                                }) },
                            ]} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Badge tone="brand">{t('audit.eventCount', { count: b.events.length, n: b.events.length })}</Badge>
                            {cats.map((c) => <Badge key={c} tone="neutral">{categoryLabel(t, c)}</Badge>)}
                            {sensitive && <Badge tone="warn"><ShieldAlert size={11} aria-hidden />{t('audit.hasAdminOnly')}</Badge>}
                        </div>
                        <div className="flex flex-col gap-1 border-t border-line-subtle pt-2.5">
                            <p className="type-caption-semibold text-muted">{t('audit.whoCanSee')}</p>
                            {b.grants?.length ? (
                                <ul className="flex flex-wrap gap-1.5">
                                    {b.grants.map((g) => (
                                        <li key={g.id}><Badge tone="info">{g.user_id ? g.user_name : t('audit.grants.everyone', { role: roleLabel(t, g.role) })} · {scopeLabel(t, g.scope)}</Badge></li>
                                    ))}
                                </ul>
                            ) : <p className="type-caption text-muted">{t('audit.adminOnlyNow')}</p>}
                            <Button variant="quiet" size="sm" leftIcon={UserCheck} className="mt-1 w-fit" onClick={() => onGrant(b)}>{t('audit.whoCanSee')}</Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

function RequestsTab() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [deciding, setDeciding] = useState<{ r: ArchiveRequest; status: 'approved' | 'rejected' } | null>(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const requests = useQuery({ queryKey: ['audit', 'requests', status], queryFn: () => auditService.listRequests(status === 'all' ? undefined : status) });
    const decide = useMutation({
        mutationFn: () => auditService.decideRequest(deciding!.r.id, { status: deciding!.status, note: note.trim() || undefined }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit', 'requests'] }); setDeciding(null); setNote(''); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    return (
        <div className="flex flex-col gap-3">
            <FilterChips aria-label={t('audit.request.filter')} value={status} onChange={setStatus}
                items={(['pending', 'approved', 'rejected', 'all'] as const).map((s) => ({ value: s, label: s === 'all' ? t('audit.allRequests') : t(`audit.request.status.${s}`) }))} />
            <Card className="gap-3">
                {requests.isPending ? <Skeleton className="h-24" /> : !requests.data?.length ? (
                    <EmptyState icon={UserCheck} title={t('audit.request.noneTitle')}>{t('audit.request.noneBody')}</EmptyState>
                ) : (
                    <ul className="flex flex-col divide-y divide-line-subtle">
                        {requests.data.map((r) => (
                            <li key={r.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <p className="type-small-semibold text-ink">{r.requester_name} · {r.bucket_name}</p>
                                    <p className="type-small text-ink-2">{t('leavePage.range', { from: df.date(r.start_date), to: df.date(r.end_date) })}</p>
                                    <p className="type-caption text-ink-2">{r.reason}</p>
                                    <p className="type-caption text-muted">
                                        {df.relative(r.created_at)}
                                        {r.decided_by_name && ` · ${t('audit.request.decidedBy', { name: r.decided_by_name })}`}
                                        {r.decision_note && ` · ${r.decision_note}`}
                                        {r.status === 'approved' && r.expires_at && ` · ${t('audit.request.openUntil', { date: df.date(r.expires_at) })}`}
                                    </p>
                                </div>
                                {r.status === 'pending' ? (
                                    <div className="flex gap-2">
                                        <Button variant="quiet" size="sm" leftIcon={X} onClick={() => { setError(null); setDeciding({ r, status: 'rejected' }); }}>{t('audit.request.decline')}</Button>
                                        <Button variant="success" size="sm" leftIcon={Check} onClick={() => { setError(null); setDeciding({ r, status: 'approved' }); }}>{t('audit.request.approve')}</Button>
                                    </div>
                                ) : <Badge tone={r.status === 'approved' ? 'ok' : 'bad'} dot>{t(`audit.request.status.${r.status}`)}</Badge>}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
            {deciding && (
                <Dialog open onClose={() => setDeciding(null)} dismissible={!decide.isPending} size="sm"
                    icon={deciding.status === 'approved' ? Check : X} iconTone={deciding.status === 'approved' ? 'ok' : 'bad'}
                    title={t(deciding.status === 'approved' ? 'audit.request.approveTitle' : 'audit.request.declineTitle', { name: deciding.r.requester_name })}
                    subtitle={deciding.status === 'approved' ? t('audit.request.approveBody') : undefined} closeLabel={t('common.close')}
                    footer={<>
                        <Button variant="quiet" onClick={() => setDeciding(null)} disabled={decide.isPending}>{t('common.cancel')}</Button>
                        <Button variant={deciding.status === 'approved' ? 'success' : 'danger'} loading={decide.isPending} onClick={() => decide.mutate()}>
                            {t(deciding.status === 'approved' ? 'audit.request.approve' : 'audit.request.decline')}
                        </Button>
                    </>}>
                    {error && <Banner tone="bad" title={t('audit.request.decideFailed')}>{error}</Banner>}
                    <TextAreaField label={t('audit.request.note')} rows={2} value={note} onChange={(e) => setNote(e.target.value)} optional={t('peopleForms.optional')} />
                </Dialog>
            )}
        </div>
    );
}

function ApisTab({ catalogue, isError }: { catalogue?: AuditCatalogue; isError: boolean }) {
    const { t } = useTranslation();
    if (isError) return <Card><EmptyState icon={AlertCircle} tone="bad" title={t('audit.errorTitle')}>{t('peoplePage.error.body')}</EmptyState></Card>;
    if (!catalogue) return <Skeleton className="h-64" />;
    return (
        <div className="flex flex-col gap-3.5">
            <p className="type-small text-muted">{t('audit.apisIntro', { count: catalogue.events.length })}</p>
            {catalogue.categories.map((c) => {
                const events = catalogue.events.filter((e) => e.category === c.key);
                if (!events.length) return null;
                return (
                    <TableCard key={c.key} title={categoryLabel(t, c.key, c.label)}>
                        <Table aria-label={categoryLabel(t, c.key, c.label)}>
                            <THead>
                                <Th>{t('audit.col.event')}</Th>
                                <Th>{t('audit.col.name')}</Th>
                                <Th>{t('audit.col.apis')}</Th>
                            </THead>
                            <tbody>
                                {events.map((e) => (
                                    <Tr key={e.key}>
                                        <Td>
                                            <span className="flex flex-wrap items-center gap-1.5 type-small-medium text-ink">
                                                {eventLabel(t, e.key, e.label)}
                                                {e.sensitivity === 'admin' && <Badge tone="warn">{t('audit.adminOnly')}</Badge>}
                                            </span>
                                        </Td>
                                        <Td><code className="type-caption text-ink-2">{e.key}</code></Td>
                                        <Td>
                                            <span className="flex flex-col gap-0.5">
                                                {(e.routes ?? []).map((r) => <code key={`${r.method} ${r.path}`} className="type-caption text-muted">{r.method} {r.path}</code>)}
                                            </span>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableCard>
                );
            })}
            {!!catalogue.not_audited?.length && (
                <TableCard title={t('audit.notAudited')} subtitle={t('audit.notAuditedSub')}>
                    <Table aria-label={t('audit.notAudited')}>
                        <THead><Th>{t('audit.col.apis')}</Th><Th>{t('audit.col.why')}</Th></THead>
                        <tbody>
                            {catalogue.not_audited.map((n) => (
                                <Tr key={`${n.method} ${n.path}`}>
                                    <Td><code className="type-caption text-ink-2">{n.method} {n.path}</code></Td>
                                    <Td className="type-small text-ink-2">{n.reason}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                </TableCard>
            )}
        </div>
    );
}
