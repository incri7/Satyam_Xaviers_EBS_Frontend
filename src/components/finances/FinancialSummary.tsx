import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart2, PiggyBank, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { Badge, Card, CardHeader, Meter, SegmentedControl, Skeleton, type MeterTone } from '../../design-system';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { ChartEmpty, ChartError } from '../../features/dashboard/CardStates';
import { useLedger, useMonthlyTotals, usePeriodRange } from '../../features/finance/queries';
import { methodKey } from '../../features/finance/format';
import type { Period } from '../../features/finance/period';
import type { LedgerBucket } from '../../api/services/finances.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';

const PERIOD_KEY = 'finances_summary_period';
const AXIS_TICK = { fontSize: 11, fontWeight: 500, fill: 'var(--color-muted)', fontFamily: 'var(--font-ui)' };
/** Method colours, in the order the stacked share bar draws them. */
const METHOD_SWATCH = ['bg-primary', 'bg-ok', 'bg-warn', 'bg-info', 'bg-muted'];
/** The ledger caps a page at 500 rows; the method split is read from them. */
const METHOD_SAMPLE = 500;

/**
 * Figma E02 "Fees and payments summary". Every figure comes from one
 * /finances/ledger call for the chosen period, so the cards, the breakdowns
 * and the ledger they drill into cannot disagree. The monthly chart asks
 * /finances/summary once per Nepali month of the year so far.
 */
export function FinancialSummary() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const [period, setPeriodState] = useState<Period>(() => {
        try {
            const saved = localStorage.getItem(PERIOD_KEY);
            return saved === 'month' || saved === 'term' || saved === 'year' ? saved : 'year';
        } catch {
            return 'year';
        }
    });
    const setPeriod = (p: Period) => {
        setPeriodState(p);
        try { localStorage.setItem(PERIOD_KEY, p); } catch { /* not remembered */ }
    };

    const { range: chosen, termAvailable } = usePeriodRange(period);
    // A remembered "This term" with no term set up falls back to the year.
    const effective: Period = period === 'term' && !termAvailable ? 'year' : period;
    const { range: fallback } = usePeriodRange('year');
    const range = effective === period ? chosen : fallback;

    const ledger = useLedger({ start_date: range?.start, end_date: range?.end, kind: 'income', limit: METHOD_SAMPLE }, !!range);
    const data = ledger.data;
    const status = ledger.isPending ? 'loading' : ledger.isError ? 'error' : 'ready';
    const retry = () => void ledger.refetch();

    const income = Number(data?.total_income ?? 0);
    const expense = Number(data?.total_expense ?? 0);
    const net = income - expense;
    const receipts = (data?.income_by_head ?? []).reduce((n, b) => n + b.count, 0);
    const bills = (data?.expense_by_head ?? []).reduce((n, b) => n + b.count, 0);
    const span = range ? `&start=${range.start}&end=${range.end}` : '';
    const rangeText = range ? t('financePage.summary.range', { from: df.date(range.start), to: df.date(range.end) }) : '';

    const periods = [
        { value: 'month' as const, label: t('financePage.period.month') },
        ...(termAvailable ? [{ value: 'term' as const, label: t('financePage.period.term') }] : []),
        { value: 'year' as const, label: t('financePage.period.year') },
    ];

    return (
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-[18px]">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                <p className="type-small text-muted">{rangeText}</p>
                <div className="max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none]">
                    <SegmentedControl options={periods} value={effective} onChange={setPeriod} size="sm" aria-label={t('financePage.period.label')} className="w-max" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-4">
                <KpiCard icon={TrendingUp} tone="ok" label={t('financePage.summary.moneyIn')} value={formatRs(income, lang)} long status={status} onRetry={retry}
                    sub={<span>{t('financePage.summary.receipts', { count: receipts, n: formatCount(receipts, lang) })}</span>}
                    to={`/finances/ledger?view=income${span}`} />
                <KpiCard icon={TrendingDown} tone="bad" label={t('financePage.summary.moneyOut')} value={formatRs(expense, lang)} long status={status} onRetry={retry}
                    sub={<span>{t('financePage.summary.bills', { count: bills, n: formatCount(bills, lang) })}</span>}
                    to={`/finances/ledger?view=expense${span}`} />
                <div className="col-span-2 lg:col-span-1">
                    <KpiCard icon={Scale} tone="brand" label={t('financePage.summary.net')} value={`${net < 0 ? '−' : ''}${formatRs(Math.abs(net), lang)}`} long status={status} onRetry={retry}
                        sub={<><Badge tone={net < 0 ? 'bad' : 'ok'} dot>{net < 0 ? t('financePage.summary.deficit') : t('financePage.summary.surplus')}</Badge><span className="truncate">{t('financePage.summary.netSub')}</span></>}
                        to={`/finances/ledger?view=net${span}`} />
                </div>
            </div>

            <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-4">
                <MonthlyChart />
                <MethodCard status={status} onRetry={retry} entries={data?.entries ?? []} total={data?.total_count ?? 0} />
            </div>

            <div className="grid min-w-0 gap-3.5 lg:grid-cols-2 lg:gap-4">
                <BarListCard icon={PiggyBank} title={t('financePage.summary.byFeeType')} total={income} buckets={data?.income_by_head ?? []} tone="brand"
                    status={status} onRetry={retry} empty={t('financePage.summary.noIncome')} />
                <BarListCard icon={Wallet} title={t('financePage.summary.whereWent')} total={expense} buckets={data?.expense_by_head ?? []} tone="warn"
                    status={status} onRetry={retry} empty={t('financePage.summary.noExpense')} />
            </div>
        </div>
    );
}

/** Figma "Money in and out by month": grouped bars, Baisakh to this month. */
function MonthlyChart() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const titleId = useId();
    const { months, isPending, isError, refetch } = useMonthlyTotals();
    const rows = months.map((m) => ({ label: df.monthShort(m.mid), full: df.date(m.mid, 'monthYear'), income: m.income, expense: m.expense, partial: m.partial }));
    const empty = !isPending && !isError && rows.every((r) => r.income === 0 && r.expense === 0);
    const current = rows[rows.length - 1];

    return (
        <Card aria-labelledby={titleId} className="gap-3.5">
            <CardHeader titleId={titleId} title={t('financePage.summary.byMonth')}
                subtitle={current?.partial ? t('financePage.summary.byMonthSub', { month: current.full }) : undefined} />
            {isPending ? (
                <Skeleton className="h-[220px] rounded-row" />
            ) : isError ? (
                <ChartError onRetry={refetch} className="h-[220px]" />
            ) : empty ? (
                <ChartEmpty icon={BarChart2} className="h-[220px]">{t('financePage.summary.noMonths')}</ChartEmpty>
            ) : (
                <>
                    <div role="img" className="h-[220px]"
                        aria-label={`${t('financePage.summary.byMonth')}. ${rows.map((r) => `${r.full}: ${formatRs(r.income, df.lang)} / ${formatRs(r.expense, df.lang)}`).join(', ')}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="26%" barGap={4}>
                                <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={6} interval={0} />
                                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={52} tickFormatter={(v: number) => compactRs(v, df.lang)} />
                                <Tooltip cursor={{ fill: 'var(--color-sunken)' }} content={<ChartTip />} />
                                <Bar dataKey="income" name={t('financePage.summary.moneyIn')} fill="var(--color-primary)" radius={[5, 5, 0, 0]} maxBarSize={16} animationDuration={480} />
                                <Bar dataKey="expense" name={t('financePage.summary.moneyOut')} fill="var(--color-warn)" radius={[5, 5, 0, 0]} maxBarSize={16} animationDuration={480} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                        <Legend swatch="bg-primary">{t('financePage.summary.moneyIn')}</Legend>
                        <Legend swatch="bg-warn">{t('financePage.summary.moneyOut')}</Legend>
                    </div>
                </>
            )}
        </Card>
    );
}

interface TipProps {
    active?: boolean;
    payload?: { name?: string; value?: number; color?: string; payload?: { full: string } }[];
}

function ChartTip({ active, payload }: TipProps) {
    const { lang } = useDateFormat();
    if (!active || !payload?.length) return null;
    return (
        <div className="flex flex-col gap-1 rounded-row border border-line bg-surface px-3 py-2 shadow-e3">
            <p className="type-caption-semibold text-ink">{payload[0].payload?.full}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2 type-caption text-ink-2">
                    <span aria-hidden className="size-2 rounded-[2px]" style={{ background: p.color }} />
                    {p.name}: <span className="tabular-nums text-ink">{formatRs(p.value ?? 0, lang)}</span>
                </p>
            ))}
        </div>
    );
}

/** Axis labels: "Rs 1.2M" is unreadable to most parents, so lakh and crore. */
function compactRs(v: number, lang: 'en' | 'ne') {
    if (v >= 1e7) return `${formatCount(Math.round(v / 1e6) / 10, lang)}${lang === 'ne' ? ' क' : 'Cr'}`;
    if (v >= 1e5) return `${formatCount(Math.round(v / 1e4) / 10, lang)}${lang === 'ne' ? ' ला' : 'L'}`;
    if (v >= 1e3) return `${formatCount(Math.round(v / 1e3), lang)}K`;
    return formatCount(v, lang);
}

function Legend({ swatch, children }: { swatch: string; children: ReactNode }) {
    return (
        <span className="flex items-center gap-1.5 type-caption text-ink-2">
            <span aria-hidden className={`size-2 rounded-[2px] ${swatch}`} />
            {children}
        </span>
    );
}

/** Figma "Collected by fee type" / "Where the money went": label, amount, share. */
function BarListCard({ icon, title, total, buckets, tone, status, onRetry, empty }: {
    icon: typeof Wallet;
    title: string;
    total: number;
    buckets: LedgerBucket[];
    tone: MeterTone;
    status: 'loading' | 'error' | 'ready';
    onRetry: () => void;
    empty: string;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const rows = buckets.filter((b) => Number(b.amount) > 0);
    const top = Math.max(...rows.map((b) => Number(b.amount)), 1);

    return (
        <Card aria-labelledby={titleId} className="gap-3.5">
            <CardHeader titleId={titleId} title={title}
                subtitle={status === 'ready' && rows.length > 0 ? t('financePage.summary.inPeriod', { amount: formatRs(total, lang) }) : undefined} />
            {status === 'loading' ? (
                <div className="flex flex-col gap-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : status === 'error' ? (
                <ChartError onRetry={onRetry} />
            ) : rows.length === 0 ? (
                <ChartEmpty icon={icon}>{empty}</ChartEmpty>
            ) : (
                <ul className="flex flex-col gap-3">
                    {rows.slice(0, 8).map((b) => {
                        const amount = Number(b.amount);
                        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                        return (
                            <li key={b.label} className="flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="min-w-0 truncate type-small text-ink-2">{b.label}</span>
                                    <span className="shrink-0 type-small-semibold tabular-nums text-ink">{formatRs(amount, lang)}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Meter value={amount / top} tone={tone} label={`${b.label} ${pct}%`} className="flex-1" />
                                    <span className="w-10 shrink-0 text-right type-caption tabular-nums text-muted">{formatCount(pct, lang)}%</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}

/** Figma "How families pay": share of the period's receipts by method. */
function MethodCard({ status, onRetry, entries, total }: {
    status: 'loading' | 'error' | 'ready';
    onRetry: () => void;
    entries: { method: string; amount: number }[];
    total: number;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const byMethod = new Map<string, number>();
    for (const e of entries) byMethod.set(e.method, (byMethod.get(e.method) ?? 0) + Number(e.amount));
    const rows = [...byMethod.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const sum = rows.reduce((n, [, v]) => n + v, 0);
    const sampled = total > entries.length;

    return (
        <Card aria-labelledby={titleId} className="gap-3.5">
            <CardHeader titleId={titleId} title={t('financePage.summary.methods')}
                subtitle={status === 'ready' && rows.length > 0 ? (sampled ? t('financePage.summary.methodsSampled', { n: formatCount(entries.length, lang) }) : t('financePage.summary.methodsSub')) : undefined} />
            {status === 'loading' ? (
                <div className="flex flex-col gap-3"><Skeleton className="h-3" /><Skeleton className="h-20" /></div>
            ) : status === 'error' ? (
                <ChartError onRetry={onRetry} />
            ) : rows.length === 0 ? (
                <ChartEmpty icon={Wallet}>{t('financePage.summary.noIncome')}</ChartEmpty>
            ) : (
                <>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
                        {rows.map(([m, v], i) => <span key={m} className={METHOD_SWATCH[i % METHOD_SWATCH.length]} style={{ width: `${(v / sum) * 100}%` }} />)}
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {rows.map(([m, v], i) => (
                            <div key={m} className="flex min-w-0 flex-col gap-0.5">
                                <dt className="flex items-center gap-1.5 type-caption text-ink-2">
                                    <span aria-hidden className={`size-2 rounded-[2px] ${METHOD_SWATCH[i % METHOD_SWATCH.length]}`} />
                                    {t(methodKey(m))}
                                </dt>
                                <dd className="type-h3 tabular-nums text-ink">{formatCount(Math.round((v / sum) * 100), lang)}%</dd>
                                <dd className="truncate type-caption tabular-nums text-muted">{formatRs(v, lang)}</dd>
                            </div>
                        ))}
                    </dl>
                </>
            )}
        </Card>
    );
}
