import { useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Ban, Eye, Paperclip, RotateCw, Wallet, X } from 'lucide-react';

import {
    ActionMenu, Badge, Button, Card, EmptyState, ListCard, ListRow, SearchField, Skeleton, SortTh,
    FilterChips, Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr, type FilterChip,
} from '../../design-system';
import { Toolbar } from '../layout/AppPage';
import { Pagination } from '../common/Pagination';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { financesService, type LedgerEntry } from '../../api/services/finances.service';
import { invalidateMoney, useLedger } from '../../features/finance/queries';
import { monthRange, previousMonthRange, yearRange } from '../../features/finance/period';
import { methodKey } from '../../features/finance/format';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';

type SortKey = 'date' | 'amount' | 'party' | 'label';
const PAGE_SIZE = 50;
const COLUMNS = 6;
const SWATCH = ['bg-warn', 'bg-primary', 'bg-info', 'bg-ok', 'bg-bad', 'bg-muted'];
const ALL = '__all__';

const isVoid = (e: LedgerEntry) => e.reference.startsWith('VOID');

/**
 * Figma E05 Expenses: this month's spending at the top, then every bill
 * this academic year. Rows come from /finances/ledger (expenses only), so
 * search, the category filter, sorting and paging all run on the server.
 * Whether a bill is attached is only known for the expenses /expenses
 * returns (its first 100); other rows show no bill badge rather than a
 * wrong one.
 */
export function ExpenseManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<SortKey>();
    const [category, setCategory] = useState(ALL);
    const fileRef = useRef<HTMLInputElement>(null);
    const [attachTo, setAttachTo] = useState<number | null>(null);
    const year = yearRange();

    const { data, isPending, isError, refetch } = useLedger({
        kind: 'expense',
        start_date: year.start,
        end_date: year.end,
        search: list.search || undefined,
        label: category === ALL ? undefined : category,
        sort_by: list.sort.by ?? 'date',
        sort_dir: list.sort.by ? list.sort.dir : 'desc',
        skip: (list.page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
    });
    const known = useQuery({ queryKey: ['expenses'], queryFn: () => financesService.listExpenses(), staleTime: 30 * 1000 });
    const bills = useMemo(() => new Map((known.data ?? []).map((x) => [x.id, !!x.attachment_key])), [known.data]);

    const voidIt = useMutation({
        mutationFn: financesService.voidExpense,
        onSuccess: () => { invalidateMoney(queryClient); notify({ tone: 'ok', title: t('financePage.expenses.voided') }); },
        onError: (err) => notify({ tone: 'bad', title: t('financePage.expenses.voidFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const attach = useMutation({
        mutationFn: ({ id, file }: { id: number; file: File }) => financesService.uploadExpenseAttachment(id, file),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); notify({ tone: 'ok', title: t('financePage.expenses.attached') }); },
        onError: (err) => notify({ tone: 'bad', title: t('financePage.expense.billFailed'), body: errorText(err, t('peoplePage.error.body')) }),
        onSettled: () => setAttachTo(null),
    });

    const viewBill = async (id: number) => {
        try {
            const blob = await financesService.getExpenseAttachment(id);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            notify({ tone: 'bad', title: t('financePage.expenses.noBill'), body: errorText(err, t('peoplePage.error.body')) });
        }
    };
    const startAttach = (id: number) => { setAttachTo(id); fileRef.current?.click(); };
    const askVoid = (e: LedgerEntry) =>
        confirm({
            title: t('financePage.expenses.voidTitle'),
            body: t('financePage.expenses.voidBody', { vendor: e.party || e.label, amount: formatRs(e.amount, lang) }),
            confirmLabel: t('financePage.expenses.void'),
            onConfirm: () => voidIt.mutate(e.id),
        });

    const rows: LedgerEntry[] = data?.entries ?? [];
    const heads = data?.expense_by_head ?? [];
    const total = data?.total_count;
    const filtered = Boolean(list.search || category !== ALL);
    const clear = () => { list.resetSearch(); setCategory(ALL); };
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={clear}>{t('common.clearFilters')}</Button> : undefined;
    const title = total === undefined ? t('financePage.tabs.expenses') : t('financePage.expenses.count', { count: total, n: formatCount(total, lang) });
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const chips: FilterChip<string>[] = [
        { value: ALL, label: t('financePage.expenses.all'), count: formatCount(heads.reduce((n, h) => n + h.count, 0), lang) },
        ...heads.map((h) => ({ value: h.label, label: t(`financePage.category.${h.label}`, { defaultValue: h.label }), count: formatCount(h.count, lang) })),
    ];

    const billBadge = (e: LedgerEntry) => {
        if (isVoid(e)) return <Badge tone="neutral">{t('financePage.expenses.voidBadge')}</Badge>;
        const has = bills.get(e.id);
        if (has === undefined) return null;
        return has ? <Badge tone="ok" dot>{t('financePage.expenses.bill')}</Badge> : <Badge tone="warn" dot>{t('financePage.expenses.noBillBadge')}</Badge>;
    };
    const menu = (e: LedgerEntry) => (
        <ActionMenu label={t('financePage.payments.more')} items={[
            { label: t('financePage.expenses.viewBill'), icon: Eye, onSelect: () => void viewBill(e.id), hidden: bills.get(e.id) === false },
            { label: bills.get(e.id) ? t('financePage.expenses.replaceBill') : t('financePage.expenses.attachBill'), icon: Paperclip, onSelect: () => startAttach(e.id), hidden: isVoid(e) || !can('expenses', 'update') },
            { label: t('financePage.expenses.void'), icon: Ban, tone: 'bad', onSelect: () => askVoid(e), hidden: isVoid(e) || !can('expenses', 'delete') },
        ]} />
    );
    const amount = (e: LedgerEntry) => (
        <span className={cn('tabular-nums', isVoid(e) ? 'text-muted line-through' : 'text-ink')}>{formatRs(e.amount, lang)}</span>
    );
    const catLabel = (e: LedgerEntry) => t(`financePage.category.${e.label}`, { defaultValue: e.label });

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={Wallet} title={filtered ? t('financePage.expenses.noMatch') : t('financePage.expenses.empty')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('financePage.expenses.emptyBody')}
        </EmptyState>
    ) : null;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                onChange={(ev) => {
                    const file = ev.target.files?.[0];
                    ev.target.value = '';
                    if (file && attachTo) attach.mutate({ id: attachTo, file });
                }} />

            <MonthSpend />

            <FilterChips items={chips} value={category} onChange={list.filter(setCategory)} aria-label={t('financePage.expenses.byCategory')} />
            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('financePage.expenses.search')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
            </Toolbar>

            <TableCard className="max-md:hidden" title={title} subtitle={t('financePage.payments.sub', { from: df.date(year.start) })} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <SortTh k="party" sort={list.sort} onSort={list.toggleSort}>{t('financePage.col.paidTo')}</SortTh>
                        <SortTh k="date" sort={list.sort} onSort={list.toggleSort}>{t('financePage.col.date')}</SortTh>
                        <Th>{t('financePage.col.billNo')}</Th>
                        <SortTh k="amount" sort={list.sort} onSort={list.toggleSort} className="text-right">{t('financePage.col.amount')}</SortTh>
                        <Th>{t('financePage.col.bill')}</Th>
                        <Th className="text-right">{t('classesPage.col.actions')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => (
                            <Tr key={e.id}>
                                <Td>
                                    <span className="flex min-w-0 flex-col">
                                        <span className={cn('truncate type-small-medium', isVoid(e) ? 'text-muted' : 'text-ink')}>{e.party || catLabel(e)}</span>
                                        <span className="truncate type-caption text-muted">{catLabel(e)}, {t(methodKey(e.method))}</span>
                                    </span>
                                </Td>
                                <Td className="whitespace-nowrap">{df.date(e.date)}</Td>
                                <Td className="whitespace-nowrap tabular-nums text-ink-2">{e.reference.replace(/^VOID-?/, '') || '—'}</Td>
                                <Td className="whitespace-nowrap text-right type-small-semibold">{amount(e)}</Td>
                                <Td>{billBadge(e)}</Td>
                                <Td><div className="flex justify-end">{menu(e)}</div></Td>
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
                                    <span className={cn('truncate type-small-semibold', isVoid(e) ? 'text-muted' : 'text-ink')}>{e.party || catLabel(e)}</span>
                                    <span className="truncate type-caption text-muted">
                                        {isVoid(e) ? t('financePage.expenses.voidBadge') : catLabel(e)}, {df.date(e.date, 'dayMonth').replace(/^[^,]*,\s*/, '')}
                                    </span>
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="type-small-semibold">{amount(e)}</span>
                                    {!isVoid(e) && billBadge(e)}
                                </span>
                                {menu(e)}
                            </ListRow>
                        ))}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>
        </div>
    );
}

/** Figma E05 top card: this month's spending, against last month, by category. */
function MonthSpend() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const titleId = useId();
    const month = monthRange();
    const prev = previousMonthRange();
    const now = useLedger({ kind: 'expense', start_date: month.start, end_date: month.end, limit: 1 });
    const before = useQuery({
        queryKey: ['financial-summary', prev?.start, prev?.end],
        queryFn: () => financesService.getFinancialSummary(prev!.start, prev!.end),
        enabled: !!prev,
        staleTime: 5 * 60 * 1000,
    });

    const spent = Number(now.data?.total_expense ?? 0);
    const last = Number(before.data?.total_expense ?? 0);
    const diff = spent - last;
    const heads = (now.data?.expense_by_head ?? []).filter((h) => Number(h.amount) > 0);
    const monthName = df.date(month.end, 'monthYear').split(' ')[0];
    const prevName = prev ? df.date(prev.end, 'monthYear').split(' ')[0] : '';

    return (
        <Card aria-labelledby={titleId} className="gap-3">
            {now.isPending ? (
                <div className="flex flex-col gap-2.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-7 w-48" /><Skeleton className="h-3" /></div>
            ) : now.isError ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="type-small text-muted">{t('adminDashboard.cardError')}</p>
                    <Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void now.refetch()}>{t('adminDashboard.retry')}</Button>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                        <div className="flex flex-col gap-0.5">
                            <h2 id={titleId} className="type-small-medium text-ink-2">{t('financePage.expenses.spentIn', { month: monthName })}</h2>
                            <p className="type-figure-m text-ink lg:type-figure-l">{formatRs(spent, lang)}</p>
                        </div>
                        {before.data && last > 0 && (
                            <p className={cn('type-small', diff > 0 ? 'text-bad' : 'text-ok')}>
                                {diff > 0
                                    ? t('financePage.expenses.moreThan', { amount: formatRs(diff, lang), month: prevName })
                                    : t('financePage.expenses.lessThan', { amount: formatRs(-diff, lang), month: prevName })}
                            </p>
                        )}
                    </div>
                    {heads.length > 0 && (
                        <>
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
                                {heads.map((h, i) => <span key={h.label} className={SWATCH[i % SWATCH.length]} style={{ width: `${(Number(h.amount) / spent) * 100}%` }} />)}
                            </div>
                            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                                {heads.map((h, i) => (
                                    <li key={h.label} className="flex items-center gap-1.5 type-caption text-ink-2">
                                        <span aria-hidden className={`size-2 rounded-[2px] ${SWATCH[i % SWATCH.length]}`} />
                                        {t(`financePage.category.${h.label}`, { defaultValue: h.label })} <span className="tabular-nums text-muted">{formatCount(Math.round((Number(h.amount) / spent) * 100), lang)}%</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}
        </Card>
    );
}
