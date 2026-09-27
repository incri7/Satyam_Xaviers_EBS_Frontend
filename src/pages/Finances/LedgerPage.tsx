import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Download, FileSpreadsheet, Minus, Plus, RotateCw, X } from 'lucide-react';

import {
    Badge, Button, Card, CardHeader, EmptyState, FilterChips, ListCard, ListRow, Meter, SearchField, SegmentedControl, Skeleton, SortTh,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr, type MeterTone,
} from '../../design-system';
import { AppPage, PageBar, Toolbar } from '../../components/layout/AppPage';
import { Pagination } from '../../components/common/Pagination';
import { financesService, type LedgerBucket, type LedgerEntry, type LedgerParams } from '../../api/services/finances.service';
import { useLedger } from '../../features/finance/queries';
import { monthRange, yearRange, type DateRange } from '../../features/finance/period';
import { formatSignedRs, methodKey } from '../../features/finance/format';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { formatDate, formatISODate, isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 50;
const COLUMNS = 5;
type View = 'net' | 'income' | 'expense';
const VIEWS: View[] = ['net', 'income', 'expense'];
const KIND: Record<View, LedgerParams['kind']> = { net: 'all', income: 'income', expense: 'expense' };
const PRESETS = ['thisMonth', 'last30', 'last3Months', 'thisYear'] as const;
type Preset = (typeof PRESETS)[number];
type SortKey = 'date' | 'amount' | 'label' | 'party';

function rangeFor(preset: Preset): DateRange {
    const today = new Date();
    if (preset === 'thisMonth') return monthRange(today);
    if (preset === 'thisYear') return yearRange(today);
    const start = new Date(today);
    if (preset === 'last3Months') start.setMonth(start.getMonth() - 3);
    else start.setDate(start.getDate() - 30);
    return { start: isoLocal(start), end: isoLocal(today) };
}

/** The day before a YYYY-MM-DD, for the balance brought forward. */
function dayBefore(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return isoLocal(d);
}

/** Money out, and reversals, read as negative in a ledger that mixes both. */
const signed = (e: LedgerEntry) => (e.kind === 'expense' ? -Math.abs(e.amount) : e.amount);

/**
 * Figma E08 Ledger: every rupee in and out over a period. The summary cards
 * drill in here with their own window (?view=&start=&end=), so the figure
 * tapped is the figure this page opens on.
 *
 * Adapted: the balance brought forward is every recorded payment less every
 * expense before the period (the system has no opening cash figure), and
 * there is no running balance per row or month close, which need a backend.
 */
export default function LedgerPage() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<SortKey>();
    const [head, setHead] = useState('');
    const [exporting, setExporting] = useState(false);

    const view: View = VIEWS.includes(params.get('view') as View) ? (params.get('view') as View) : 'net';
    const startParam = params.get('start');
    const endParam = params.get('end');
    const preset: Preset | null = startParam && endParam ? null : PRESETS.includes(params.get('preset') as Preset) ? (params.get('preset') as Preset) : 'thisMonth';
    const range = preset ? rangeFor(preset) : { start: startParam!, end: endParam! };

    const setParam = (mutate: (p: URLSearchParams) => void) => {
        const p = new URLSearchParams(params);
        mutate(p);
        setParams(p, { replace: true });
        list.setPage(1);
    };
    const setView = (v: View) => { setHead(''); setParam((p) => p.set('view', v)); };
    const setPreset = (v: Preset) => setParam((p) => { p.set('preset', v); p.delete('start'); p.delete('end'); });

    const filters: LedgerParams = {
        start_date: range.start,
        end_date: range.end,
        kind: KIND[view],
        search: list.search || undefined,
        label: head || undefined,
        sort_by: list.sort.by ?? 'date',
        sort_dir: list.sort.by ? list.sort.dir : 'desc',
    };
    const { data, isPending, isError, refetch } = useLedger({ ...filters, skip: (list.page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
    const before = useQuery({
        queryKey: ['financial-summary', '2000-01-01', dayBefore(range.start)],
        queryFn: () => financesService.getFinancialSummary('2000-01-01', dayBefore(range.start)),
        staleTime: 5 * 60 * 1000,
    });

    const income = Number(data?.total_income ?? 0);
    const expense = Number(data?.total_expense ?? 0);
    const opening = Number(before.data?.net_balance ?? 0);
    const receipts = (data?.income_by_head ?? []).reduce((n, b) => n + b.count, 0);
    const bills = (data?.expense_by_head ?? []).reduce((n, b) => n + b.count, 0);
    const status = isPending ? 'loading' : isError ? 'error' : 'ready';

    const rows = data?.entries ?? [];
    const total = data?.total_count;
    const filtered = Boolean(list.search || head);
    const clear = () => { list.resetSearch(); setHead(''); };
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={clear}>{t('common.clearFilters')}</Button> : undefined;
    const title = t('ledgerPage.transactions');
    const subtitle = total === undefined ? undefined : t('ledgerPage.entries', { count: total, n: formatCount(total, lang) });
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const exportCsv = async () => {
        setExporting(true);
        try {
            const all: LedgerEntry[] = [];
            for (let skip = 0; ; skip += 500) {
                // The first page marks it as an export, so it is recorded once in the activity log.
                const page = await financesService.getLedger({ ...filters, skip, limit: 500, ...(skip === 0 ? { export: true } : {}) });
                all.push(...page.entries);
                if (all.length >= page.total_count || page.entries.length === 0) break;
            }
            const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
            const lines = [
                ['Date (BS)', 'Date (AD)', 'In or out', 'Head', 'From or to', 'Reference', 'Method', 'Amount'].map(cell).join(','),
                ...all.map((e) => [formatDate(e.date, 'en', 'short'), formatISODate(e.date), e.kind === 'income' ? 'In' : 'Out', e.label, e.party, e.reference, e.method, signed(e).toFixed(2)].map(cell).join(',')),
            ];
            // The BOM makes Excel read Nepali names as UTF-8.
            const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ledger-${range.start}-to-${range.end}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            notify({ tone: 'bad', title: t('ledgerPage.exportFailed'), body: errorText(err, t('peoplePage.error.body')) });
        } finally {
            setExporting(false);
        }
    };

    const headCell = (e: LedgerEntry) => (
        <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 truncate type-small-medium text-ink">
                {e.label}
                {e.amount < 0 && e.kind === 'income' && <Badge tone="warn">{t('financePage.payments.reversal')}</Badge>}
                {e.kind === 'expense' && e.reference.startsWith('VOID') && <Badge tone="neutral">{t('financePage.expenses.voidBadge')}</Badge>}
            </span>
            <span className="truncate type-caption text-muted">{e.party || '—'}</span>
        </span>
    );
    const amountCell = (e: LedgerEntry) => (
        <span className={cn('tabular-nums', signed(e) < 0 ? 'text-bad' : 'text-ok')}>{signed(e) > 0 ? '+' : ''}{formatSignedRs(signed(e), lang)}</span>
    );

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title={filtered ? t('ledgerPage.noMatch') : t('ledgerPage.empty')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('ledgerPage.emptyBody')}
        </EmptyState>
    ) : null;

    const presets = PRESETS.map((p) => ({ value: p, label: t(`ledgerPage.preset.${p}`) }));
    const actions = (
        <>
            <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => navigate('/finances')}>{t('financePage.title')}</Button>
            <Button variant="secondary" leftIcon={Download} loading={exporting} disabled={!total} onClick={() => void exportCsv()}>
                {exporting ? t('ledgerPage.exporting') : t('ledgerPage.export')}
            </Button>
        </>
    );

    return (
        <AppPage title={t('ledgerPage.title')}>
            <PageBar actions={actions}>
                <div className="flex flex-col gap-1">
                    <div className="max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none]">
                        <SegmentedControl options={preset ? presets : [...presets, { value: 'custom' as Preset, label: t('ledgerPage.preset.custom') }]}
                            value={preset ?? ('custom' as Preset)} onChange={(v) => v !== ('custom' as Preset) && setPreset(v)} size="sm" aria-label={t('financePage.period.label')} className="w-max" />
                    </div>
                    <p className="type-small text-muted">{t('financePage.summary.range', { from: df.date(range.start), to: df.date(range.end) })}</p>
                </div>
            </PageBar>
            {noticeUI}

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                <Figure label={t('ledgerPage.opening')} sub={t('ledgerPage.openingSub', { date: df.date(range.start) })}
                    status={before.isPending ? 'loading' : before.isError ? 'error' : 'ready'} value={formatSignedRs(opening, lang)} />
                <Figure label={t('financePage.summary.moneyIn')} sub={t('financePage.summary.receipts', { count: receipts, n: formatCount(receipts, lang) })}
                    status={status} value={`+${formatRs(income, lang)}`} tone="text-ok" sign={Plus} />
                <Figure label={t('financePage.summary.moneyOut')} sub={t('financePage.summary.bills', { count: bills, n: formatCount(bills, lang) })}
                    status={status} value={`−${formatRs(expense, lang)}`} tone="text-bad" sign={Minus} />
                <Figure label={t('ledgerPage.closing')} sub={t('ledgerPage.closingSub', { date: df.date(range.end) })}
                    status={before.isPending || isPending ? 'loading' : before.isError || isError ? 'error' : 'ready'} value={formatSignedRs(opening + income - expense, lang)} strong />
            </div>

            <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
                <div className="flex min-w-0 flex-col gap-3.5">
                    <FilterChips items={VIEWS.map((v) => ({ value: v, label: t(`ledgerPage.view.${v}`) }))} value={view} onChange={setView} aria-label={t('ledgerPage.viewLabel')} />
                    <Toolbar>
                        <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('ledgerPage.search')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
                        {head && <Badge tone="brand">{t('ledgerPage.onlyHead', { head })}</Badge>}
                    </Toolbar>

                    <TableCard className="max-md:hidden" title={title} subtitle={subtitle} action={clearButton}
                        footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                        <Table aria-label={title}>
                            <THead>
                                <SortTh k="date" sort={list.sort} onSort={list.toggleSort}>{t('financePage.col.date')}</SortTh>
                                <SortTh k="label" sort={list.sort} onSort={list.toggleSort}>{t('ledgerPage.head')}</SortTh>
                                <Th>{t('ledgerPage.reference')}</Th>
                                <Th>{t('ledgerPage.method')}</Th>
                                <SortTh k="amount" sort={list.sort} onSort={list.toggleSort} className="text-right">{t('financePage.col.amount')}</SortTh>
                            </THead>
                            <tbody>
                                {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => (
                                    <Tr key={`${e.kind}-${e.id}`}>
                                        <Td className="whitespace-nowrap">{df.date(e.date)}</Td>
                                        <Td className="max-w-[260px]">{headCell(e)}</Td>
                                        <Td className="whitespace-nowrap tabular-nums text-ink-2">{e.reference || '—'}</Td>
                                        <Td className="whitespace-nowrap">{t(methodKey(e.method))}</Td>
                                        <Td className="whitespace-nowrap text-right type-small-semibold">{amountCell(e)}</Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableCard>

                    <div className="flex flex-col gap-2.5 md:hidden">
                        <div className="flex items-center justify-between px-1">
                            <p className="type-small-semibold text-ink-2">{subtitle ?? title}</p>
                            {clearButton}
                        </div>
                        {isPending ? (
                            <ListCard>{Array.from({ length: 6 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-10" /></li>)}</ListCard>
                        ) : message ? (
                            <div className="rounded-card border border-line bg-surface">{message}</div>
                        ) : (
                            <ListCard>
                                {rows.map((e) => (
                                    <ListRow key={`${e.kind}-${e.id}`}>
                                        <span className="min-w-0 flex-1">{headCell(e)}</span>
                                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                                            <span className="type-small-semibold">{amountCell(e)}</span>
                                            <span className="type-caption text-muted">{df.date(e.date, 'dayMonth').replace(/^[^,]*,\s*/, '')}</span>
                                        </span>
                                    </ListRow>
                                ))}
                            </ListCard>
                        )}
                        {paging && <Pagination {...paging} />}
                    </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3.5">
                    {view !== 'expense' && (
                        <Heads title={t('ledgerPage.cameFrom')} total={income} buckets={data?.income_by_head ?? []} tone="ok" status={status}
                            active={head} onPick={(h) => { setHead(h === head ? '' : h); list.setPage(1); if (view === 'net') setParam((p) => p.set('view', 'income')); }} />
                    )}
                    {view !== 'income' && (
                        <Heads title={t('ledgerPage.wentTo')} total={expense} buckets={data?.expense_by_head ?? []} tone="warn" status={status}
                            active={head} onPick={(h) => { setHead(h === head ? '' : h); list.setPage(1); if (view === 'net') setParam((p) => p.set('view', 'expense')); }} />
                    )}
                </div>
            </div>
        </AppPage>
    );
}

function Figure({ label, value, sub, status, tone, sign: Sign, strong }: {
    label: string;
    value: string;
    sub: string;
    status: 'loading' | 'error' | 'ready';
    tone?: string;
    sign?: typeof Plus;
    strong?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div className={cn('flex min-w-0 flex-col gap-1 rounded-card border p-3.5 shadow-e1 lg:px-[18px] lg:py-4', strong ? 'border-primary-soft-line bg-primary-soft' : 'border-line bg-surface')}>
            <p className={cn('flex items-center gap-1.5 type-small-medium', strong ? 'text-primary-text' : 'text-ink-2')}>
                {Sign && <Sign size={14} aria-hidden className="text-muted" />}
                {label}
            </p>
            {status === 'loading' ? <Skeleton className="h-7 w-32" /> : (
                <p className={cn('truncate type-figure-m max-sm:text-[19px] max-sm:font-semibold', status === 'error' ? 'text-muted' : tone ?? 'text-ink')}>
                    {status === 'error' ? t('adminDashboard.notLoaded') : value}
                </p>
            )}
            <p className="truncate type-caption text-muted">{sub}</p>
        </div>
    );
}

function Heads({ title, total, buckets, tone, status, active, onPick }: {
    title: string;
    total: number;
    buckets: LedgerBucket[];
    tone: MeterTone;
    status: 'loading' | 'error' | 'ready';
    active: string;
    onPick: (label: string) => void;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const rows = buckets.filter((b) => Number(b.amount) !== 0);
    return (
        <Card aria-labelledby={titleId} className="gap-3">
            <CardHeader titleId={titleId} title={title} subtitle={status === 'ready' ? formatRs(total, lang) : undefined} />
            {status === 'loading' ? (
                <div className="flex flex-col gap-2.5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
            ) : rows.length === 0 ? (
                <p className="type-small text-muted">{t('ledgerPage.nothing')}</p>
            ) : (
                <ul className="-mx-2 flex flex-col">
                    {rows.map((b) => {
                        const amount = Number(b.amount);
                        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                        const on = b.label === active;
                        return (
                            <li key={b.label}>
                                <button type="button" aria-pressed={on} onClick={() => onPick(b.label)}
                                    className={cn('flex w-full flex-col gap-1.5 rounded-row px-2 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60', on ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className="min-w-0 truncate type-small text-ink-2">{b.label}</span>
                                        <span className="shrink-0 type-small-semibold tabular-nums text-ink">{formatRs(amount, lang)}</span>
                                    </span>
                                    <span className="flex items-center gap-2.5">
                                        <Meter value={pct / 100} tone={tone} label={`${b.label} ${pct}%`} className="flex-1" />
                                        <span className="w-9 shrink-0 text-right type-caption tabular-nums text-muted">{formatCount(pct, lang)}%</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
