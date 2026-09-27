import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, Lock, Plus, Receipt, RotateCcw, Send } from 'lucide-react';

import {
    Badge, Banner, Button, Card, CardHeader, FilterChips, IconButton, Person, Skeleton,
    Table, TableCard, THead, Td, Th, Tr,
} from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { RecordPaymentModal } from '../../components/finances/RecordPaymentModal';
import { financesService, type OutstandingEntry } from '../../api/services/finances.service';
import { useMonthlyReport, useOutstanding } from '../../features/dashboard/queries';
import { HeroChip, HeroSkeleton, HomeHero } from '../../features/home/HomeHero';
import { LeaveBalanceMini } from '../../features/home/LeaveBalanceMini';
import { HomeGreeting, InlineEmpty, InlineError, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

type Risk = 'all' | OutstandingEntry['risk'];
const RISKS = ['High', 'Medium', 'Low'] as const;
const riskTone = (r: string) => (r === 'High' ? 'bad' : r === 'Medium' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral';
const ROWS = 7;

/**
 * Figma E01 Accountant home: today's takings and the month's collection
 * against what is due, then the outstanding list as the main surface with a
 * one-tap reminder, reversals, today's receipts and the accountant's own leave.
 *
 * Adapted: there is no reversal-request workflow in the API (the accountant
 * reverses directly from the ledger), so "Reversal requests" shows this
 * month's reversals instead. "Expected" for the month is what was collected
 * plus what is still owed. Takings refresh every minute: the fee.paid event
 * only reaches parents.
 */
export default function AccountantHome() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const can = usePermissionsStore((s) => s.hasPermission);
    const canRecord = can('payments', 'create');
    const [paying, setPaying] = useState(false);
    const [today] = useState(() => isoLocal(new Date()));

    const takings = useQuery({
        queryKey: ['finances', 'ledger', { kind: 'income', start_date: today, end_date: today, sort_by: 'date', sort_dir: 'desc', limit: 50 }],
        queryFn: () => financesService.getLedger({ kind: 'income', start_date: today, end_date: today, sort_by: 'date', sort_dir: 'desc', limit: 50 }),
        refetchInterval: 60 * 1000,
    });
    const month = useMonthlyReport(0);
    const lastMonth = useMonthlyReport(1);
    const monthReversals = useQuery({
        queryKey: ['finances', 'ledger', 'month-reversals', month.data?.start_date],
        queryFn: () => financesService.getLedger({ kind: 'income', start_date: month.data!.start_date, end_date: today, sort_by: 'amount', sort_dir: 'asc', limit: 20 }),
        select: (res) => res.entries.filter((e) => Number(e.amount) < 0),
        enabled: !!month.data,
        staleTime: 2 * 60 * 1000,
    });
    const outstanding = useOutstanding();

    const day = takings.data;
    const receipts = day?.entries ?? [];
    const reversalsToday = receipts.filter((e) => Number(e.amount) < 0).length;
    const last = receipts.find((e) => Number(e.amount) > 0);
    const m = month.data;
    const collected = Number(m?.total_collected ?? 0);
    const expected = collected + Number(m?.outstanding_balance ?? 0);
    const monthName = df.date(new Date(), 'monthYear').split(' ')[0];
    const lastPct = lastMonth.data && Number(lastMonth.data.total_collected) + Number(lastMonth.data.outstanding_balance) > 0
        ? Math.round((Number(lastMonth.data.total_collected) / (Number(lastMonth.data.total_collected) + Number(lastMonth.data.outstanding_balance))) * 100) : null;

    return (
        <AppPage title={t('home.title')}>
            <HomeGreeting />
            {outstanding.isError && (
                <Banner tone="bad" title={t('home.a.owedErrorTitle')}
                    action={<Button variant="quiet" size="sm" onClick={() => void outstanding.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('home.a.owedErrorBody')}
                </Banner>
            )}

            {takings.isPending ? <HeroSkeleton label={t('home.a.heroLabel')} /> : (
                <HomeHero label={t('home.a.heroLabel')}
                    side={
                        <div className="flex flex-col gap-2.5 rounded-2xl bg-[#0B1A3D]/35 p-3.5 ring-1 ring-inset ring-white/14 lg:w-[400px] lg:p-[18px]">
                            <div className="flex items-center gap-2">
                                <p className="flex-1 type-small-semibold">{t('home.a.target', { month: monthName })}</p>
                                {m && <span className="type-small-semibold text-[#9BE8C6]">{formatCount(expected ? Math.round((collected / expected) * 100) : 0, lang)}%</span>}
                            </div>
                            {month.isPending ? <><Skeleton className="h-6 w-48 bg-white/14" /><Skeleton className="h-2.5 w-full bg-white/14" /></> : month.isError ? (
                                <p className="type-caption text-white/80">{t('home.a.targetError')}</p>
                            ) : m && (
                                <>
                                    <p className="type-small text-white/70"><span className="type-figure-m text-white lg:type-figure-l">{formatRs(collected, lang)}</span> {t('home.a.ofExpected', { amount: formatRs(expected, lang) })}</p>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/18" role="img" aria-label={t('home.a.target', { month: monthName })}>
                                        <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${expected ? Math.min(100, (collected / expected) * 100) : 0}%` }} />
                                    </div>
                                    <p className="type-caption text-white/78">
                                        {collected === 0 ? t('home.a.targetEmpty') : lastPct !== null ? t('home.a.lastMonth', { pct: formatCount(lastPct, lang) }) : t('home.a.receiptsThisMonth', { count: m.transaction_count, n: formatCount(m.transaction_count, lang) })}
                                    </p>
                                    <p className="flex items-center gap-1.5 border-t border-white/14 pt-2 type-caption text-white/86">
                                        {m.receipt_gaps.length ? <AlertTriangle size={14} className="shrink-0 text-sx-gold" aria-hidden /> : <CheckCircle2 size={14} className="shrink-0 text-[#9BE8C6]" aria-hidden />}
                                        <span className="truncate">
                                            {!m.first_receipt ? t('home.a.noReceiptsMonth', { month: monthName })
                                                : m.receipt_gaps.length ? t('home.a.gaps', { count: m.receipt_gaps.length, n: formatCount(m.receipt_gaps.length, lang), list: m.receipt_gaps.slice(0, 3).join(', ') })
                                                    : t('home.a.noGaps', { first: m.first_receipt, last: m.last_receipt })}
                                        </span>
                                    </p>
                                </>
                            )}
                        </div>
                    }>
                    <HeroChip dot={receipts.length ? 'ok' : 'warn'}>{t('home.a.collectedToday')}</HeroChip>
                    {takings.isError ? (
                        <p className="type-body text-white/86">{t('home.a.takingsError')}</p>
                    ) : (
                        <>
                            <p className="flex flex-wrap items-baseline gap-2.5">
                                <span className="type-figure-l lg:type-figure-xl">{formatRs(day?.total_income ?? 0, lang)}</span>
                                <span className="type-h3 text-white/72">{receipts.length ? t('home.a.fromReceipts', { count: day?.total_count ?? 0, n: formatCount(day?.total_count ?? 0, lang) }) : t('home.a.noReceiptsYet')}</span>
                            </p>
                            <p className="type-body text-white/86">
                                {last ? t('home.a.lastOne', { receipt: last.reference, name: last.party, amount: formatRs(last.amount, lang), method: t(`financePage.method.${last.method}`, { defaultValue: last.method }) }) : t('home.a.emptyBody')}
                                {reversalsToday > 0 && ` ${t('home.a.reversalsToday', { count: reversalsToday, n: formatCount(reversalsToday, lang) })}`}
                            </p>
                        </>
                    )}
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                        {canRecord && <Button variant="white" leftIcon={Plus} onClick={() => setPaying(true)}>{t('home.a.record')}</Button>}
                        <Button variant="glass" leftIcon={FileSpreadsheet} className="max-sm:hidden" onClick={() => navigate('/finances/ledger')}>{t('home.a.openLedger')}</Button>
                    </div>
                </HomeHero>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                    <Outstanding q={outstanding} canRemind={canRecord} />
                    <div className="max-lg:hidden"><LeaveBalanceMini /></div>
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <Reversals q={monthReversals} loading={month.isPending || monthReversals.isPending} />
                    <RecentReceipts q={takings} canRecord={canRecord} onRecord={() => setPaying(true)} />
                    <div className="lg:hidden"><LeaveBalanceMini /></div>
                </div>
            </div>

            {canRecord && <RecordPaymentModal isOpen={paying} onClose={() => setPaying(false)} />}
        </AppPage>
    );
}

function Outstanding({ q, canRemind }: { q: ReturnType<typeof useOutstanding>; canRemind: boolean }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const [risk, setRisk] = useState<Risk>('all');
    const [sendingId, setSendingId] = useState<number | null>(null);
    const remind = useMutation({
        mutationFn: (ids?: number[]) => financesService.sendBulkReminders(ids),
        onSettled: () => setSendingId(null),
    });
    const all = useMemo(() => [...(q.data?.entries ?? [])].sort((a, b) => b.days_overdue - a.days_overdue), [q.data]);
    const counts = useMemo(() => Object.fromEntries(RISKS.map((r) => [r, all.filter((e) => e.risk === r).length])), [all]);
    const rows = (risk === 'all' ? all : all.filter((e) => e.risk === risk)).slice(0, ROWS);
    const total = q.data?.total_count ?? 0;
    const sub = q.isPending ? undefined : q.isError ? t('home.a.couldNotLoad') : total === 0 ? t('home.a.nobodyOwes')
        : t('home.a.owedSub', { count: total, n: formatCount(total, lang), amount: formatRs(q.data?.total_outstanding ?? 0, lang) });
    const chips = [
        { value: 'all' as Risk, label: t('home.a.all'), count: formatCount(total, lang) },
        ...RISKS.map((r) => ({ value: r as Risk, label: t(`outstandingPage.risk.${r}`), count: formatCount(counts[r] ?? 0, lang) })),
    ];
    const remindAll = canRemind && total > 0 && (
        <Button leftIcon={Send} loading={remind.isPending && sendingId === null} disabled={remind.isPending} onClick={() => remind.mutate(undefined)} className="max-md:w-full">
            {t('home.a.remindAll', { count: total, n: formatCount(total, lang) })}
        </Button>
    );
    const sendOne = (id: number) => { setSendingId(id); remind.mutate([id]); };
    const footer = total > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 md:px-[18px]">
            <span className="flex-1 type-small text-muted">{t('home.a.showing', { a: formatCount(rows.length, lang), b: formatCount(risk === 'all' ? total : counts[risk] ?? 0, lang) })}</span>
            <Button variant="ghost" size="sm" rightIcon={ArrowRight} className="text-primary-text" onClick={() => navigate('/finances/outstanding')}>{t('home.a.openOutstanding')}</Button>
        </div>
    );
    const body = q.isError ? <InlineError title={t('home.a.listError')} onRetry={() => void q.refetch()} />
        : !q.isPending && total === 0 ? <InlineEmpty icon={CheckCircle2} title={t('home.a.paidUp')}>{t('home.a.paidUpBody')}</InlineEmpty> : null;

    return (
        <>
            {remind.isSuccess && <Banner tone="ok" title={t('home.p.reminded')}>{remind.data?.message}</Banner>}
            {remind.isError && <Banner tone="bad" title={t('home.p.remindFailed')}>{errorText(remind.error, t('peoplePage.error.body'))}</Banner>}

            <TableCard className="max-md:hidden" title={t('home.a.owedTitle')} subtitle={sub} action={remindAll || undefined} footer={body ? undefined : footer || undefined}>
                {body ? <div className="p-4">{body}</div> : (
                    <>
                        <div className="px-[18px] pb-3"><FilterChips aria-label={t('home.a.byRisk')} items={chips} value={risk} onChange={setRisk} /></div>
                        <Table aria-label={t('home.a.owedTitle')}>
                            <THead>
                                <Th>{t('financePage.col.student')}</Th>
                                <Th>{t('home.p.col.overdue')}</Th>
                                <Th>{t('home.p.col.risk')}</Th>
                                <Th className="text-right">{t('home.p.col.balance')}</Th>
                                {canRemind && <Th className="w-12"><span className="sr-only">{t('home.a.remind')}</span></Th>}
                            </THead>
                            <tbody>
                                {q.isPending ? Array.from({ length: 5 }, (_, i) => (
                                    <Tr key={i}><Td colSpan={canRemind ? 5 : 4}><Skeleton className="h-9" /></Td></Tr>
                                )) : rows.map((r) => (
                                    <Tr key={r.student_id}>
                                        <Td><Link to={`/people/students/${r.student_id}`} className="outline-none hover:underline"><Person name={r.student_name} sub={[r.class_name, r.admission_no].filter(Boolean).join(', ')} /></Link></Td>
                                        <Td className="type-small text-ink-2">{t('home.p.days', { count: r.days_overdue, n: formatCount(r.days_overdue, lang) })}</Td>
                                        <Td><Badge tone={riskTone(r.risk)} dot>{t(`outstandingPage.risk.${r.risk}`)}</Badge></Td>
                                        <Td className="text-right type-body-semibold tabular-nums text-ink">{formatRs(r.balance, lang)}</Td>
                                        {canRemind && (
                                            <Td>
                                                <IconButton icon={Send} label={t('home.a.remindOne', { name: r.student_name })} size={32}
                                                    className="bg-primary-soft text-primary-text" disabled={remind.isPending} onClick={() => sendOne(r.student_id)} />
                                            </Td>
                                        )}
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
            </TableCard>

            <Card className="gap-2.5 md:hidden">
                <CardHeader title={t('home.a.owedTitle')} subtitle={sub} />
                {body ?? (
                    <>
                        <FilterChips aria-label={t('home.a.byRisk')} items={chips} value={risk} onChange={setRisk} />
                        {q.isPending ? <RowsSkeleton rows={4} /> : (
                            <ul>
                                {rows.slice(0, 4).map((r) => (
                                    <li key={r.student_id} className="flex items-center gap-2.5 border-b border-line-subtle py-2.5 last:border-b-0">
                                        <div className="min-w-0 flex-1"><Person name={r.student_name} sub={`${r.class_name ?? '—'}, ${t('home.p.days', { count: r.days_overdue, n: formatCount(r.days_overdue, lang) })}`} /></div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className="type-body-semibold tabular-nums text-ink">{formatRs(r.balance, lang)}</span>
                                            <Badge tone={riskTone(r.risk)}>{t(`outstandingPage.risk.${r.risk}`)}</Badge>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {remindAll}
                        {total > 0 && <Button variant="ghost" size="sm" rightIcon={ArrowRight} className="text-primary-text" onClick={() => navigate('/finances/outstanding')}>{t('home.a.seeAll', { n: formatCount(total, lang) })}</Button>}
                    </>
                )}
            </Card>
        </>
    );
}

function Reversals({ q, loading }: { q: { data?: { id: number; reference: string; party: string; amount: number; date: string }[]; isError: boolean; refetch: () => unknown }; loading: boolean }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const list = q.data ?? [];
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('home.a.reversals')} subtitle={loading ? undefined : list.length ? t('home.a.reversalsSub', { count: list.length, n: formatCount(list.length, df.lang) }) : t('home.a.noReversals')}
                action={list.length > 0 && <Badge tone="warn">{formatCount(list.length, df.lang)}</Badge>} />
            {loading ? <RowsSkeleton rows={2} /> : q.isError ? <InlineError title={t('home.a.reversalsError')} onRetry={() => void q.refetch()} /> : list.length > 0 && (
                <ul>
                    {list.slice(0, 3).map((r) => (
                        <ItemRow key={r.id} icon={RotateCcw} tone="warn" title={`${r.reference || `#${r.id}`}, ${formatRs(r.amount, df.lang)}`}
                            sub={`${r.party || '—'}, ${df.date(r.date)}`} />
                    ))}
                </ul>
            )}
            <p className="flex items-start gap-2 rounded-row bg-surface-2 px-3 py-2.5 type-caption text-ink-2">
                <Lock size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden />{t('home.a.immutable')}
            </p>
        </Card>
    );
}

function RecentReceipts({ q, canRecord, onRecord }: { q: { data?: { entries: { id: number; reference: string; party: string; amount: number; method: string }[] }; isPending: boolean; isError: boolean; refetch: () => unknown }; canRecord: boolean; onRecord: () => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const list = q.data?.entries ?? [];
    return (
        <Card className="gap-1">
            <CardHeader title={t('home.a.recent')} subtitle={q.isPending ? undefined : list.length ? t('home.a.today') : t('home.a.noneToday')}
                action={list.length > 0 && <Button variant="ghost" size="sm" className="text-primary-text max-sm:hidden" onClick={() => navigate('/finances/ledger')}>{t('home.a.allPayments')}</Button>} />
            {q.isPending ? <RowsSkeleton rows={4} /> : q.isError ? <InlineError title={t('home.a.takingsError')} onRetry={() => void q.refetch()} /> : list.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                    <span className="grid size-10 place-items-center rounded-[12px] bg-primary-soft text-primary-text"><Receipt size={18} aria-hidden /></span>
                    <p className="max-w-[260px] type-small text-muted">{t('home.a.receiptsEmpty')}</p>
                    {canRecord && <Button variant="secondary" size="sm" leftIcon={Plus} onClick={onRecord}>{t('home.a.record')}</Button>}
                </div>
            ) : (
                <ul>
                    {list.slice(0, 5).map((r) => {
                        const neg = Number(r.amount) < 0;
                        return (
                            <li key={r.id} className="flex items-center gap-2.5 border-b border-line-subtle py-2.5 last:border-b-0">
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 type-small-semibold text-ink">{r.reference || `#${r.id}`}{neg && <Badge tone="bad">{t('home.a.reversal')}</Badge>}</span>
                                    <span className="truncate type-caption text-muted">{r.party}</span>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                    <span className={cn('type-small-semibold tabular-nums', neg ? 'text-bad' : 'text-ink')}>{formatRs(r.amount, lang)}</span>
                                    <span className="type-caption text-muted">{t(`financePage.method.${r.method}`, { defaultValue: r.method })}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
