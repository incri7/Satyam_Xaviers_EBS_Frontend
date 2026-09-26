import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Download, Receipt, RotateCcw, RotateCw, ShieldCheck, X } from 'lucide-react';

import {
    ActionMenu, Badge, Banner, Button, EmptyState, IconButton, ListCard, ListRow, SearchField, Skeleton, SortTh,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr,
} from '../../design-system';
import { Toolbar } from '../layout/AppPage';
import { Pagination } from '../common/Pagination';
import { financesService, type LedgerEntry } from '../../api/services/finances.service';
import { useLedger } from '../../features/finance/queries';
import { yearRange } from '../../features/finance/period';
import { downloadReceipt, formatSignedRs, methodKey } from '../../features/finance/format';
import { ReversePaymentDialog, type ReversiblePayment } from '../../features/finance/ReversePaymentDialog';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

type SortKey = 'date' | 'amount' | 'party' | 'label';
const PAGE_SIZE = 50;
const COLUMNS = 6;

/**
 * Figma E04 Payments: every receipt this academic year, newest first.
 *
 * Rows come from /finances/ledger (income only), which already joins the
 * student and fee names and searches and sorts on the server. Whether a
 * payment was reversed is read from the reversal's transaction id
 * ("REV-<original id>") in the latest 500 payments.
 */
export function PaymentManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const can = usePermissionsStore((s) => s.hasPermission);
    const [noticeUI, notify] = useNotice();
    const list = useListControls<SortKey>();
    const [reversing, setReversing] = useState<ReversiblePayment | null>(null);
    const [downloading, setDownloading] = useState<number | null>(null);
    const range = yearRange();

    const { data, isPending, isError, refetch } = useLedger({
        kind: 'income',
        start_date: range.start,
        end_date: range.end,
        search: list.search || undefined,
        sort_by: list.sort.by ?? 'date',
        sort_dir: list.sort.by ? list.sort.dir : 'desc',
        skip: (list.page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
    });
    const recent = useQuery({ queryKey: ['payments', 'recent'], queryFn: () => financesService.listPayments(undefined, { limit: 500 }), staleTime: 30 * 1000 });

    // original id → reversal, and reversal id → original receipt
    const links = useMemo(() => {
        const byId = new Map((recent.data ?? []).map((p) => [p.id, p]));
        const reversed = new Set<number>();
        const reverses = new Map<number, string>();
        for (const p of recent.data ?? []) {
            const m = /^REV-(\d+)$/.exec(p.transaction_id ?? '');
            if (!m) continue;
            const original = Number(m[1]);
            reversed.add(original);
            reverses.set(p.id, byId.get(original)?.receipt_no || `#${original}`);
        }
        return { reversed, reverses };
    }, [recent.data]);

    const rows: LedgerEntry[] = data?.entries ?? [];
    const total = data?.total_count;
    const title = total === undefined ? t('financePage.tabs.payments') : t('financePage.payments.count', { count: total, n: formatCount(total, lang) });
    const filtered = Boolean(list.search);
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={list.resetSearch}>{t('common.clearFilters')}</Button> : undefined;
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const kindOf = (e: LedgerEntry) => (e.amount < 0 ? 'reversal' : links.reversed.has(e.id) ? 'reversed' : 'paid');
    const canReverse = (e: LedgerEntry) => kindOf(e) === 'paid' && can('payments', 'create');
    const sub = (e: LedgerEntry) => (e.amount < 0 ? t('financePage.payments.reverses', { receipt: links.reverses.get(e.id) ?? '—' }) : e.label);

    const download = async (e: LedgerEntry) => {
        setDownloading(e.id);
        try {
            await downloadReceipt(e.id, e.reference);
        } catch (err) {
            notify({ tone: 'bad', title: t('financePage.payments.receiptFailed'), body: errorText(err, t('peoplePage.error.body')) });
        } finally {
            setDownloading(null);
        }
    };
    const askReverse = (e: LedgerEntry) =>
        setReversing({ id: e.id, receipt: e.reference || `#${e.id}`, student: e.party || '—', amount: e.amount, method: e.method, date: e.date });

    const status = (e: LedgerEntry) => {
        const k = kindOf(e);
        return k === 'reversal' ? <Badge tone="warn">{t('financePage.payments.reversal')}</Badge>
            : k === 'reversed' ? <Badge tone="neutral">{t('financePage.payments.reversed')}</Badge>
                : <Badge tone="ok" dot>{t('financePage.payments.paid')}</Badge>;
    };
    const amount = (e: LedgerEntry) => (
        <span className={cn('tabular-nums', e.amount < 0 ? 'text-bad' : kindOf(e) === 'reversed' ? 'text-muted line-through' : 'text-ink')}>
            {formatSignedRs(e.amount, lang)}
        </span>
    );
    const actions = (e: LedgerEntry) => (
        <div className="flex justify-end gap-1.5">
            <IconButton icon={Download} label={t('financePage.payments.download')} onClick={() => void download(e)} disabled={downloading === e.id} />
            <ActionMenu label={t('financePage.payments.more')} items={[
                { label: t('financePage.payments.reverse'), icon: RotateCcw, tone: 'bad', onSelect: () => askReverse(e), hidden: !canReverse(e) },
            ]} />
        </div>
    );

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={Receipt} title={filtered ? t('financePage.payments.noMatch') : t('financePage.payments.empty')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('financePage.payments.emptyBody')}
        </EmptyState>
    ) : null;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {noticeUI}
            <Banner tone="info" icon={ShieldCheck} title={t('financePage.payments.ruleTitle')}>{t('financePage.payments.ruleBody')}</Banner>

            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('financePage.payments.search')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
            </Toolbar>

            <TableCard className="max-md:hidden" title={title} subtitle={t('financePage.payments.sub', { from: df.date(range.start) })} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <Th>{t('financePage.col.receipt')}</Th>
                        <SortTh k="party" sort={list.sort} onSort={list.toggleSort}>{t('financePage.col.student')}</SortTh>
                        <SortTh k="date" sort={list.sort} onSort={list.toggleSort}>{t('financePage.col.date')}</SortTh>
                        <SortTh k="amount" sort={list.sort} onSort={list.toggleSort} className="text-right">{t('financePage.col.amount')}</SortTh>
                        <Th>{t('financePage.col.status')}</Th>
                        <Th className="text-right">{t('classesPage.col.actions')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => (
                            <Tr key={e.id}>
                                <Td>
                                    <span className="flex flex-col">
                                        <span className="type-small-semibold tabular-nums text-ink">{e.reference || `#${e.id}`}</span>
                                        <span className="type-caption text-muted">{t(methodKey(e.method))}</span>
                                    </span>
                                </Td>
                                <Td>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate type-small-medium text-ink">{e.party || '—'}</span>
                                        <span className="truncate type-caption text-muted">{sub(e)}</span>
                                    </span>
                                </Td>
                                <Td className="whitespace-nowrap">{df.date(e.date)}</Td>
                                <Td className="whitespace-nowrap text-right type-small-semibold">{amount(e)}</Td>
                                <Td>{status(e)}</Td>
                                <Td>{actions(e)}</Td>
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
                    <ListCard>{Array.from({ length: 6 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-10" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((e) => (
                            <ListRow key={e.id}>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex items-center gap-2 type-small-semibold text-ink">
                                        <span className="tabular-nums">{e.reference || `#${e.id}`}</span>
                                        {kindOf(e) !== 'paid' && status(e)}
                                    </span>
                                    <span className="truncate type-caption text-ink-2">{e.party || '—'}, {e.amount < 0 ? sub(e) : e.label}</span>
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-0.5">
                                    <span className="type-small-semibold">{amount(e)}</span>
                                    <span className="type-caption text-muted">{t(methodKey(e.method))}, {df.date(e.date, 'dayMonth').replace(/^[^,]*,\s*/, '')}</span>
                                </span>
                                <ActionMenu label={t('financePage.payments.more')} items={[
                                    { label: t('financePage.payments.download'), icon: Download, onSelect: () => void download(e) },
                                    { label: t('financePage.payments.reverse'), icon: RotateCcw, tone: 'bad', onSelect: () => askReverse(e), hidden: !canReverse(e) },
                                ]} />
                            </ListRow>
                        ))}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>

            {reversing && (
                <ReversePaymentDialog key={reversing.id} payment={reversing} onClose={() => setReversing(null)}
                    onDone={(receipt) => { setReversing(null); notify({ tone: 'ok', title: t('financePage.reverse.done', { receipt }) }); }} />
            )}
        </div>
    );
}
