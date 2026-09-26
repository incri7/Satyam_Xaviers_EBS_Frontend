import { useId, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, Layers, Loader2, RotateCw, Send, TrendingDown, X } from 'lucide-react';

import {
    Badge, Button, Card, Checkbox, EmptyState, FilterChips, IconButton, ListCard, Person, SearchField, Skeleton,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr, type BadgeTone,
} from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { Pagination } from '../../components/common/Pagination';
import { SelectMenu } from '../../components/common/SelectMenu';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { financesService, type OutstandingEntry } from '../../api/services/finances.service';
import { academicsService } from '../../api/services/academics.service';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';

const PAGE_SIZE = 50;
const COLUMNS = 7;
type Risk = 'High' | 'Medium' | 'Low';
const RISKS: Risk[] = ['High', 'Medium', 'Low'];
const RISK_TONE: Record<Risk, BadgeTone> = { High: 'bad', Medium: 'warn', Low: 'neutral' };
const ALL = 'all';

/**
 * Figma E07 Outstanding fees: who owes what, the riskiest first, and one
 * tap to remind them. Reminders go out by SMS from the server; with nothing
 * ticked, "Remind all" covers every family with a balance, not just this
 * page, so it asks first.
 */
export default function OutstandingFeesPage() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<never>();
    const [risk, setRisk] = useState<Risk | typeof ALL>(ALL);
    const [classId, setClassId] = useState('');
    const [selected, setSelected] = useState<number[]>([]);
    const [sendingTo, setSendingTo] = useState<number | 'many' | null>(null);

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['finances', 'outstanding', { search: list.search, risk, classId, page: list.page }],
        queryFn: () => financesService.getOutstanding({
            limit: PAGE_SIZE,
            offset: (list.page - 1) * PAGE_SIZE,
            search: list.search || undefined,
            risk: risk === ALL ? undefined : risk,
            class_id: classId ? Number(classId) : undefined,
        }),
        placeholderData: (prev) => prev,
    });
    // School-wide figures and the count behind each risk chip, unaffected by the filters.
    const [whole, ...byRisk] = useQueries({
        queries: [undefined, ...RISKS].map((r) => ({
            queryKey: ['finances', 'outstanding', 'count', r ?? 'all'],
            queryFn: () => financesService.getOutstanding({ limit: 1, risk: r }),
            staleTime: 30 * 1000,
        })),
    });
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });

    const remind = useMutation({
        mutationFn: (ids?: number[]) => financesService.sendBulkReminders(ids),
        onSuccess: (res) => { notify({ tone: 'ok', title: res.message }); setSelected([]); },
        onError: (err) => notify({ tone: 'bad', title: t('outstandingPage.remindFailed'), body: errorText(err, t('peoplePage.error.body')) }),
        onSettled: () => setSendingTo(null),
    });
    const sendOne = (e: OutstandingEntry) => { setSendingTo(e.student_id); remind.mutate([e.student_id]); };
    const sendSelected = () => { setSendingTo('many'); remind.mutate(selected); };
    const everyone = whole.data?.total_count ?? 0;
    const askRemindAll = () =>
        confirm({
            title: t('outstandingPage.remindAllTitle', { n: formatCount(everyone, lang) }),
            body: t('outstandingPage.remindAllBody'),
            confirmLabel: t('outstandingPage.remindAllConfirm'),
            tone: 'neutral',
            onConfirm: () => { setSendingTo('many'); remind.mutate(undefined); },
        });

    const rows: OutstandingEntry[] = useMemo(() => data?.entries ?? [], [data]);
    const pageIds = rows.map((e) => e.student_id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const togglePage = () => setSelected((s) => (allOnPage ? s.filter((id) => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));

    const filtered = Boolean(list.search || classId || risk !== ALL);
    const clear = () => { list.resetSearch(); setClassId(''); setRisk(ALL); };
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={clear}>{t('common.clearFilters')}</Button> : undefined;
    const total = data?.total_count;
    const title = total === undefined ? t('outstandingPage.title') : t('outstandingPage.count', { count: total, n: formatCount(total, lang) });
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const chips = [
        { value: ALL, label: t('financePage.expenses.all'), count: whole.data ? formatCount(whole.data.total_count, lang) : undefined },
        ...RISKS.map((r, i) => ({ value: r, label: t(`outstandingPage.risk.${r}`), count: byRisk[i].data ? formatCount(byRisk[i].data!.total_count, lang) : undefined })),
    ];

    const riskBadge = (e: OutstandingEntry) => <Badge tone={RISK_TONE[e.risk] ?? 'neutral'} dot>{t(`outstandingPage.risk.${e.risk}`)}</Badge>;
    const overdue = (e: OutstandingEntry) => (e.days_overdue > 0 ? t('outstandingPage.days', { count: e.days_overdue, n: formatCount(e.days_overdue, lang) }) : t('outstandingPage.notYet'));
    const remindButton = (e: OutstandingEntry) => (
        <AccessControl id="payments_create">
            <IconButton icon={sendingTo === e.student_id ? Loader2 : Send} label={t('outstandingPage.remindOne', { name: e.student_name })}
                onClick={() => sendOne(e)} disabled={remind.isPending} className={sendingTo === e.student_id ? '[&_svg]:animate-spin' : undefined} />
        </AccessControl>
    );

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={filtered ? t('outstandingPage.noMatch') : t('outstandingPage.allClear')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('outstandingPage.allClearBody')}
        </EmptyState>
    ) : null;

    const actions = (
        <>
            <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => navigate('/finances')}>{t('financePage.title')}</Button>
            <AccessControl id="payments_create">
                <Button leftIcon={Send} loading={sendingTo === 'many'} disabled={everyone === 0 || remind.isPending} onClick={askRemindAll}>
                    {t('outstandingPage.remindAll', { n: formatCount(everyone, lang) })}
                </Button>
            </AccessControl>
        </>
    );

    return (
        <AppPage title={t('outstandingPage.title')}>
            {confirmUI}
            <PageBar actions={actions}>
                <p className="type-small text-muted">{t('outstandingPage.intro')}</p>
            </PageBar>
            {noticeUI}

            <div className="grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-4">
                <CollectedCard status={whole.isPending ? 'loading' : whole.isError ? 'error' : 'ready'} collected={Number(whole.data?.total_collected ?? 0)}
                    raised={Number(whole.data?.total_raised ?? 0)} onRetry={() => void whole.refetch()} />
                <KpiCard icon={TrendingDown} tone="bad" label={t('outstandingPage.outstanding')} long
                    status={whole.isPending ? 'loading' : whole.isError ? 'error' : 'ready'} onRetry={() => void whole.refetch()}
                    value={formatRs(whole.data?.total_outstanding ?? 0, lang)}
                    sub={<span>{everyone > 0
                        ? t('outstandingPage.average', { count: everyone, n: formatCount(everyone, lang), avg: formatRs(Number(whole.data?.total_outstanding ?? 0) / everyone, lang) })
                        : t('outstandingPage.allClear')}</span>} />
            </div>

            <FilterChips items={chips} value={risk} onChange={list.filter((v: string) => setRisk(v as Risk | typeof ALL))} aria-label={t('outstandingPage.byRisk')} />
            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('outstandingPage.search')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
                <SelectMenu value={classId} onChange={list.filter(setClassId)} label={t('outstandingPage.class')} icon={<Layers />}
                    options={[{ value: '', label: t('classesPage.enrolments.allClasses') }, ...(classes.data?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} />
            </Toolbar>

            {selected.length > 0 && (
                <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-card border border-primary-soft-line bg-primary-soft px-4 py-2.5">
                    <p className="type-small-semibold text-primary-text">{t('outstandingPage.selected', { count: selected.length, n: formatCount(selected.length, lang) })}</p>
                    <span className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelected([])}>{t('outstandingPage.clearSelection')}</Button>
                        <AccessControl id="payments_create">
                            <Button size="sm" leftIcon={Send} loading={sendingTo === 'many'} disabled={remind.isPending} onClick={sendSelected}>
                                {t('outstandingPage.remindSelected', { count: selected.length, n: formatCount(selected.length, lang) })}
                            </Button>
                        </AccessControl>
                    </span>
                </div>
            )}

            <TableCard className="max-md:hidden" title={title} subtitle={t('outstandingPage.sub')} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <Th className="w-10"><Checkbox label={<span className="sr-only">{t('outstandingPage.selectPage')}</span>} checked={allOnPage} onChange={togglePage} /></Th>
                        <Th>{t('financePage.col.student')}</Th>
                        <Th>{t('outstandingPage.class')}</Th>
                        <Th>{t('outstandingPage.overdue')}</Th>
                        <Th>{t('outstandingPage.riskLabel')}</Th>
                        <Th className="text-right">{t('outstandingPage.balance')}</Th>
                        <Th className="text-right"><span className="sr-only">{t('classesPage.col.actions')}</span></Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => (
                            <Tr key={e.student_id}>
                                <Td><Checkbox label={<span className="sr-only">{e.student_name}</span>} checked={selected.includes(e.student_id)} onChange={() => toggle(e.student_id)} /></Td>
                                <Td><Person name={e.student_name} sub={e.admission_no} /></Td>
                                <Td className="whitespace-nowrap">{e.class_name ?? '—'}</Td>
                                <Td className="whitespace-nowrap tabular-nums">{overdue(e)}</Td>
                                <Td>{riskBadge(e)}</Td>
                                <Td className="whitespace-nowrap text-right">
                                    <span className="flex flex-col items-end">
                                        <span className="type-small-semibold tabular-nums text-bad">{formatRs(e.balance, lang)}</span>
                                        <span className="type-caption tabular-nums text-muted">{t('outstandingPage.paidOf', { paid: formatRs(e.total_paid, lang), of: formatRs(e.total_assigned, lang) })}</span>
                                    </span>
                                </Td>
                                <Td><div className="flex justify-end">{remindButton(e)}</div></Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>

            <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-center justify-between px-1">
                    <p className="type-small-semibold text-ink-2">{title}</p>
                    {clearButton}
                </div>
                {isPending ? (
                    <ListCard>{Array.from({ length: 6 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-12" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((e) => (
                            <li key={e.student_id} className="flex items-start gap-3 py-3">
                                <Checkbox className="mt-2.5" label={<span className="sr-only">{e.student_name}</span>} checked={selected.includes(e.student_id)} onChange={() => toggle(e.student_id)} />
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="min-w-0"><Person name={e.student_name} sub={e.class_name ?? e.admission_no} size={36} /></span>
                                        <span className="shrink-0 type-small-semibold tabular-nums text-bad">{formatRs(e.balance, lang)}</span>
                                    </span>
                                    <span className="flex items-center gap-2 pl-[46px] type-caption text-muted">{riskBadge(e)} {overdue(e)}</span>
                                </span>
                                {remindButton(e)}
                            </li>
                        ))}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>
        </AppPage>
    );
}

/** Figma E07 "Collected so far": taken against raised, as one bar. */
function CollectedCard({ status, collected, raised, onRetry }: { status: 'loading' | 'error' | 'ready'; collected: number; raised: number; onRetry: () => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const share = raised > 0 ? Math.min(1, collected / raised) : 0;
    const pct = Math.round(share * 100);

    return (
        <Card aria-labelledby={titleId} className="gap-3">
            {status === 'loading' ? (
                <div className="flex flex-col gap-2.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-7 w-48" /><Skeleton className="h-3" /></div>
            ) : status === 'error' ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="type-small text-muted">{t('adminDashboard.cardError')}</p>
                    <Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={onRetry}>{t('adminDashboard.retry')}</Button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-0.5">
                        <h2 id={titleId} className="type-small-medium text-ink-2">{t('outstandingPage.collected')}</h2>
                        <p className="flex flex-wrap items-baseline gap-x-2 type-figure-m text-ink lg:type-figure-l">
                            {formatRs(collected, lang)}
                            <span className="type-small text-muted">{t('outstandingPage.ofRaised', { amount: formatRs(raised, lang) })}</span>
                        </p>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bad/75" aria-hidden>
                        <span className="bg-ok" style={{ width: `${share * 100}%` }} />
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-2 rounded-[2px] bg-ok" />{t('outstandingPage.paidShare', { pct: formatCount(pct, lang) })}</li>
                        <li className="flex items-center gap-1.5 type-caption text-ink-2"><span aria-hidden className="size-2 rounded-[2px] bg-bad/75" />{t('outstandingPage.dueShare', { pct: formatCount(100 - pct, lang) })}</li>
                    </ul>
                </>
            )}
        </Card>
    );
}
