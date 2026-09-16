import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    financesService,
    type LedgerBucket,
    type LedgerParams,
} from '../../api/services/finances.service';
import {
    ArrowLeft, ArrowDownLeft, ArrowUpRight, Scale, Search, X,
    ArrowUpDown, Loader2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';
import { Pagination } from '../../components/common/Pagination';

const PAGE_SIZE = 50;

type View = 'income' | 'expense' | 'net';
const VIEWS: View[] = ['income', 'expense', 'net'];

/** A view names which rows to list; the totals always span the whole period. */
const KIND_FOR: Record<View, LedgerParams['kind']> = {
    income: 'income',
    expense: 'expense',
    net: 'all',
};

type SortKey = 'date' | 'amount' | 'label' | 'party';

const iso = (d: Date) => {
    // Local calendar day, not UTC — toISOString() would roll back a day in
    // Kathmandu for anything before 05:45.
    const p = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

const PRESETS = ['last30', 'thisMonth', 'last3Months', 'thisYear'] as const;
type Preset = (typeof PRESETS)[number];

const rangeFor = (preset: Preset): { start: string; end: string } => {
    const today = new Date();
    const end = iso(today);
    if (preset === 'thisMonth') {
        return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end };
    }
    if (preset === 'last3Months') {
        const s = new Date(today);
        s.setMonth(s.getMonth() - 3);
        return { start: iso(s), end };
    }
    if (preset === 'thisYear') {
        // The Nepali academic year opens in Baisakh, mid-April.
        const y = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        return { start: iso(new Date(y, 3, 14)), end };
    }
    const s = new Date(today);
    s.setDate(s.getDate() - 30);
    return { start: iso(s), end };
};

const TONE: Record<string, { text: string; bg: string; ring: string; bar: string }> = {
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-500', bar: 'bg-emerald-500' },
    rose: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-500', bar: 'bg-rose-500' },
    sky: { text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-500', bar: 'bg-sky-500' },
    amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-500', bar: 'bg-amber-500' },
};

const LedgerPage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [params, setParams] = useSearchParams();

    const view: View = VIEWS.includes(params.get('view') as View)
        ? (params.get('view') as View)
        : 'net';

    // The summary cards hand over their own window, so the figure the founder
    // tapped is the figure this page opens on.
    const startParam = params.get('start');
    const endParam = params.get('end');
    const preset = PRESETS.includes(params.get('preset') as Preset)
        ? (params.get('preset') as Preset)
        : null;

    const range = useMemo(() => {
        if (startParam && endParam) return { start: startParam, end: endParam };
        return rangeFor(preset ?? 'last30');
    }, [startParam, endParam, preset]);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [head, setHead] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(id);
    }, [searchInput]);

    // A head from one view is meaningless in another.
    useEffect(() => {
        setHead('');
        setPage(1);
    }, [view]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['finances', 'ledger', { ...range, view, search, head, sortBy, sortDir, page }],
        queryFn: () => financesService.getLedger({
            start_date: range.start,
            end_date: range.end,
            kind: KIND_FOR[view],
            sort_by: sortBy,
            sort_dir: sortDir,
            skip: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            ...(search ? { search } : {}),
            ...(head ? { label: head } : {}),
        }),
        placeholderData: keepPreviousData,
    });

    const setView = (next: View) => {
        const p = new URLSearchParams(params);
        p.set('view', next);
        setParams(p, { replace: true });
    };

    const setPreset = (next: string) => {
        const p = new URLSearchParams(params);
        p.set('preset', next);
        // A preset supersedes whatever explicit window brought us here.
        p.delete('start');
        p.delete('end');
        setParams(p, { replace: true });
        setPage(1);
    };

    const money = (n: number) =>
        new Intl.NumberFormat('en-NP', {
            style: 'currency', currency: 'NPR', maximumFractionDigits: 0,
        }).format(n);

    const entries = data?.entries ?? [];
    const totalCount = data?.total_count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const income = data?.total_income ?? 0;
    const expense = data?.total_expense ?? 0;
    const net = data?.net_balance ?? 0;

    const cards = [
        { id: 'income' as View, label: t('ledger.income'), value: income, icon: ArrowDownLeft, tone: 'emerald' },
        { id: 'expense' as View, label: t('ledger.expense'), value: expense, icon: ArrowUpRight, tone: 'rose' },
        { id: 'net' as View, label: t('ledger.net'), value: net, icon: Scale, tone: net >= 0 ? 'sky' : 'amber' },
    ];

    // Which breakdown sits beside the table, and against which total.
    const breakdowns: Array<{ title: string; buckets: LedgerBucket[]; total: number; tone: string }> =
        view === 'income'
            ? [{ title: t('ledger.cameFrom'), buckets: data?.income_by_head ?? [], total: income, tone: 'emerald' }]
            : view === 'expense'
                ? [{ title: t('ledger.wentTo'), buckets: data?.expense_by_head ?? [], total: expense, tone: 'rose' }]
                : [
                    { title: t('ledger.cameFrom'), buckets: data?.income_by_head ?? [], total: income, tone: 'emerald' },
                    { title: t('ledger.wentTo'), buckets: data?.expense_by_head ?? [], total: expense, tone: 'rose' },
                ];

    const toggleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(key);
            setSortDir(key === 'date' || key === 'amount' ? 'desc' : 'asc');
        }
        setPage(1);
    };

    const Th: React.FC<{ k?: SortKey; align?: 'right'; children: React.ReactNode }> = ({ k, align, children }) => (
        <th className={cn(
            'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500',
            align === 'right' ? 'text-right' : 'text-left',
        )}>
            {k ? (
                <button
                    onClick={() => toggleSort(k)}
                    className={cn(
                        'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
                        sortBy === k && 'text-slate-900',
                    )}
                >
                    {children}
                    <ArrowUpDown className={cn('w-3 h-3', sortBy === k ? 'opacity-100' : 'opacity-30')} />
                </button>
            ) : children}
        </th>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div>
                        <Link
                            to="/finances"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('ledger.backToFinances')}
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                            {t('ledger.title')}
                        </h1>
                        <p className="text-slate-500 font-medium">{t('ledger.subtitle')}</p>
                    </div>

                    {/* Period */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-2">
                            {t('ledger.period')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map((p) => {
                                const active = !startParam && (preset ?? 'last30') === p;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPreset(p)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                                            active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
                                        )}
                                    >
                                        {t('ledger.' + p)}
                                    </button>
                                );
                            })}
                        </div>
                        <span className="ml-auto text-sm font-bold text-slate-700 pr-2">
                            {df.date(data?.start_date ?? range.start)} — {df.date(data?.end_date ?? range.end)}
                        </span>
                    </div>

                    {/* The three figures. The selected one drives the table below. */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {cards.map((c) => {
                            const Icon = c.icon;
                            const active = view === c.id;
                            const tone = TONE[c.tone];
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setView(c.id)}
                                    aria-pressed={active}
                                    className={cn(
                                        'text-left bg-white p-6 rounded-3xl border transition-all',
                                        active
                                            ? cn('border-transparent ring-2 shadow-lg', tone.ring)
                                            : 'border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5',
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', tone.bg, tone.text)}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        {c.id === 'net' && (
                                            <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', tone.bg, tone.text)}>
                                                {net >= 0 ? t('ledger.surplus') : t('ledger.deficit')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 font-bold text-[11px] uppercase tracking-widest mb-1">
                                        {c.label}
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                                        {money(c.value)}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Breakdown by head */}
                    <div className={cn('grid gap-4', breakdowns.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1')}>
                        {breakdowns.map((b) => {
                            const tone = TONE[b.tone];
                            const max = Math.max(...b.buckets.map((x) => Math.abs(x.amount)), 1);
                            return (
                                <div key={b.title} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">{b.title}</h3>
                                    {b.buckets.length === 0 ? (
                                        <p className="text-sm text-slate-400 font-medium">{t('ledger.noEntries')}</p>
                                    ) : (
                                        <ul className="space-y-2.5">
                                            {b.buckets.map((x) => {
                                                const share = b.total ? Math.round((x.amount / b.total) * 100) : 0;
                                                const selected = head === x.label;
                                                const width = Math.max(2, (Math.abs(x.amount) / max) * 100);
                                                return (
                                                    <li key={x.label}>
                                                        <button
                                                            onClick={() => { setHead(selected ? '' : x.label); setPage(1); }}
                                                            className={cn(
                                                                'w-full text-left rounded-xl px-2 py-1.5 -mx-2 transition-colors',
                                                                selected ? 'bg-slate-100' : 'hover:bg-slate-50',
                                                            )}
                                                        >
                                                            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                                                                <span className="text-sm font-bold text-slate-700 truncate">{x.label}</span>
                                                                <span className="text-sm font-black text-slate-900 tabular-nums shrink-0">
                                                                    {money(x.amount)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn('h-full rounded-full transition-all', tone.bar)}
                                                                        style={{ width: width + '%' }}
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-400 tabular-nums w-16 text-right shrink-0">
                                                                    {share}% · {x.count}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Entries */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 shrink-0">
                                {view === 'income'
                                    ? t('ledger.incomeEntries')
                                    : view === 'expense'
                                        ? t('ledger.expenseEntries')
                                        : t('ledger.allEntries')}
                            </h3>
                            {head && (
                                <button
                                    onClick={() => { setHead(''); setPage(1); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold shrink-0"
                                >
                                    {t('ledger.filteredBy')}: {head}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <div className="relative md:ml-auto md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder={t('ledger.searchPlaceholder')}
                                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                                />
                                {isFetching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <Th k="date">{t('ledger.date')}</Th>
                                        <Th k="label">{t('ledger.head')}</Th>
                                        <Th k="party">{t('ledger.party')}</Th>
                                        <Th>{t('ledger.reference')}</Th>
                                        <Th>{t('ledger.method')}</Th>
                                        <Th k="amount" align="right">{t('ledger.amount')}</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={6} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-16 text-center text-sm font-medium text-slate-400">
                                                {t('ledger.noEntries')}
                                            </td>
                                        </tr>
                                    ) : entries.map((e) => (
                                        <tr key={e.kind + '-' + e.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                {df.date(e.date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className={cn(
                                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                                        e.kind === 'income' ? 'bg-emerald-500' : 'bg-rose-500',
                                                    )} />
                                                    <span className="text-sm font-bold text-slate-800">{e.label}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-600 max-w-[220px] truncate">
                                                {e.party || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-400">
                                                {e.reference || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-500 capitalize whitespace-nowrap">
                                                {e.method.replace(/_/g, ' ')}
                                            </td>
                                            <td className={cn(
                                                'px-4 py-3 text-sm font-black text-right tabular-nums whitespace-nowrap',
                                                e.kind === 'income' ? 'text-emerald-700' : 'text-rose-700',
                                            )}>
                                                {e.kind === 'income' ? '+' : '−'}{money(Math.abs(e.amount))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            pageSize={PAGE_SIZE}
                            onChange={setPage}
                            className="p-4 border-t border-slate-100"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LedgerPage;
