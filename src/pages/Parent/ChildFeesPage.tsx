import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Download, Landmark, Receipt, RotateCcw, WifiOff } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, IconButton, IconTile, Meter, Skeleton, Table, TableCard, THead, Td, Th, Tr } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { parentService, type FeeBalanceResponse, type FeeRecord } from '../../api/services/parent.service';
import { InlineEmpty, RowsSkeleton } from '../../features/home/parts';
import { ChildHeader } from '../../features/parent/ChildHeader';
import { useChildFees } from '../../features/parent/queries';
import { errorText } from '../../features/people/format';
import { useChildParam } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';

/**
 * Figma D05 Child fees: what is due now (navy) or "No fees due" (green),
 * where to pay, the receipts with a download each, and this year's fees
 * with what is paid against each.
 *
 * Adapted: fees have no due dates or per-month schedule in the data, so the
 * schedule is the list of assigned fees (name, how often, amount, paid,
 * balance) rather than twelve months. Reversals show as their own negative
 * line, never as an edit.
 */
export default function ChildFeesPage() {
    const { t } = useTranslation();
    const { id, child } = useChildParam();
    const q = useChildFees(id);

    return (
        <AppPage title={t('childPage.fees')}>
            <ChildHeader title={t('childPage.fees')} />
            {q.isError ? (
                <EmptyState icon={WifiOff} tone="bad" title={t('childPage.feesErrorTitle', { name: child?.first_name ?? '' })}
                    action={<Button variant="quiet" onClick={() => void q.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('parentHome.errorBody')}
                </EmptyState>
            ) : (
                <div className="grid min-w-0 gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-[18px]">
                    <div className="order-2 min-w-0 lg:order-1"><FeeLines data={q.data} loading={q.isPending} /></div>
                    <div className="order-1 flex min-w-0 flex-col gap-3.5 lg:order-2 lg:gap-[18px]">
                        {q.isPending ? <Skeleton className="h-[200px] rounded-[20px]" /> : <BalanceHero data={q.data!} />}
                        <PayNote />
                        <Receipts data={q.data} loading={q.isPending} studentId={id} />
                    </div>
                </div>
            )}
        </AppPage>
    );
}

function BalanceHero({ data }: { data: FeeBalanceResponse }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const due = Number(data.total_due);
    const lines = data.fees.filter((f) => Number(f.balance) > 0);
    if (due <= 0) {
        return (
            <section aria-label={t('childPage.balance')} className="flex flex-col gap-1.5 rounded-[20px] bg-[linear-gradient(140deg,#0F8A5F,#0A6246)] p-[18px] text-white shadow-[0_16px_30px_-16px_rgb(10_98_70/0.6)] lg:p-6">
                <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-white/20"><Check size={18} aria-hidden /></span>
                    <h2 className="type-h1">{t('childPage.noFeesDue')}</h2>
                </div>
                <p className="type-body text-white/88">
                    {Number(data.credit) > 0 ? t('childPage.paidAhead', { amount: formatRs(data.credit, lang) }) : t('childPage.everythingPaid')}
                </p>
            </section>
        );
    }
    return (
        <section aria-label={t('childPage.balance')} className="flex flex-col gap-1.5 rounded-[20px] bg-hero p-[18px] text-white shadow-glow-primary lg:p-6">
            <p className="type-small text-white/80">{t('childPage.balanceDue')}</p>
            <p className="type-figure-l lg:type-figure-xl">{formatRs(due, lang)}</p>
            {lines.length > 0 && (
                <ul className="mt-1 flex flex-col gap-2 rounded-[12px] bg-[#0B1A3D]/30 px-3.5 py-3">
                    {lines.map((f, i) => (
                        <li key={`${f.fee_name}-${i}`} className="flex justify-between gap-3">
                            <span className="min-w-0 truncate type-small text-white/88">{f.fee_name}</span>
                            <span className="shrink-0 type-small-semibold">{formatRs(f.balance, lang)}</span>
                        </li>
                    ))}
                    {Number(data.other_paid) > 0 && (
                        <li className="flex justify-between gap-3 border-t border-white/14 pt-2">
                            <span className="min-w-0 truncate type-small text-white/88">{t('childPage.otherPaid')}</span>
                            <span className="shrink-0 type-small-semibold">−{formatRs(data.other_paid, lang)}</span>
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

function PayNote() {
    const { t } = useTranslation();
    return (
        <div className="flex items-start gap-2.5 rounded-row bg-primary-soft px-3.5 py-3 ring-1 ring-inset ring-primary-soft-line">
            <Landmark size={18} className="mt-px shrink-0 text-primary-text" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="type-body-semibold text-ink">{t('childPage.payAtOffice')}</p>
                <p className="type-small text-ink-2">{t('childPage.payNote')}</p>
            </div>
        </div>
    );
}

function Receipts({ data, loading, studentId }: { data?: FeeBalanceResponse; loading: boolean; studentId: number }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [busy, setBusy] = useState<number | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [all, setAll] = useState(false);
    const list = data?.payment_history ?? [];
    const shown = all ? list : list.slice(0, 5);
    const save = async (paymentId: number, receiptNo: string) => {
        setBusy(paymentId); setFailed(null);
        try { await parentService.downloadReceipt(studentId, paymentId, receiptNo); }
        catch (err) { setFailed(errorText(err, t('childPage.receiptFailed'))); }
        finally { setBusy(null); }
    };
    return (
        <Card className="gap-1">
            <CardHeader title={t('childPage.receipts')} subtitle={data ? t('childPage.receiptsCount', { count: list.length, n: list.length }) : undefined} />
            {failed && <Banner tone="bad" title={t('childPage.receiptFailed')}>{failed}</Banner>}
            {loading ? <RowsSkeleton rows={2} /> : list.length === 0 ? (
                <InlineEmpty icon={Receipt} title={t('childPage.noReceipts')}>{t('childPage.noReceiptsBody')}</InlineEmpty>
            ) : (
                <>
                    <ul>
                        {shown.map((p) => {
                            const reversal = Number(p.amount) < 0;
                            return (
                                <li key={p.id} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-b-0">
                                    <IconTile icon={reversal ? RotateCcw : Receipt} tone={reversal ? 'bad' : 'ok'} size={38} />
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <p className={cn('type-body-semibold', reversal ? 'text-bad' : 'text-ink')}>
                                            {reversal ? t('childPage.reversed', { amount: formatRs(p.amount, df.lang) }) : t('childPage.paid', { amount: formatRs(p.amount, df.lang) })}
                                        </p>
                                        <p className="truncate type-small text-muted">{t('childPage.receiptLine', { date: df.date(p.paid_at, 'dayMonth').split(', ').pop(), no: p.receipt_no })}</p>
                                    </div>
                                    <IconButton icon={Download} size={40} label={t('childPage.downloadReceipt', { no: p.receipt_no })}
                                        disabled={busy !== null} onClick={() => void save(p.id, p.receipt_no)} />
                                </li>
                            );
                        })}
                    </ul>
                    {list.length > 5 && <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>{all ? t('home.t.showLess') : t('childPage.seeAllReceipts', { n: list.length })}</Button>}
                </>
            )}
        </Card>
    );
}

function FeeLines({ data, loading }: { data?: FeeBalanceResponse; loading: boolean }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const fees = data?.fees ?? [];
    const billed = fees.reduce((s, f) => s + Number(f.amount), 0);
    const paid = Math.min(Number(data?.total_paid ?? 0), billed);
    const often = (f: FeeRecord) => {
        const kind = t(`childPage.often.${f.frequency}`, { defaultValue: f.frequency });
        return f.periods > 1 && f.unit_amount != null ? t('childPage.periodsOf', { kind, n: formatCount(f.periods, lang), amount: formatRs(f.unit_amount, lang) }) : kind;
    };
    const scholarship = (f: FeeRecord) => Number(f.scholarship) > 0
        && <span className="block type-caption text-ok">{t('childPage.scholarshipOff', { amount: formatRs(f.scholarship, lang) })}</span>;
    const status = (f: FeeRecord) => Number(f.balance) <= 0
        ? <Badge tone="ok">{t('childPage.paidInFull')}</Badge>
        : Number(f.paid_amount) > 0 ? <Badge tone="warn">{t('childPage.partPaid', { amount: formatRs(f.balance, lang) })}</Badge>
            : <Badge tone="neutral">{t('childPage.notPaid')}</Badge>;
    const head = (
        <div className="flex flex-col gap-2.5">
            {billed > 0 && (
                <>
                    <div className="flex justify-between gap-2">
                        <span className="type-small-semibold text-ink">{t('childPage.paidAmount', { amount: formatRs(paid, lang) })}</span>
                        <span className="type-small text-muted">{t('childPage.ofYear', { amount: formatRs(billed, lang) })}</span>
                    </div>
                    <Meter value={paid / billed} tone="ok" height={8} label={t('childPage.paidSoFar')} />
                </>
            )}
        </div>
    );
    if (!loading && fees.length === 0) {
        return <Card className="gap-3"><CardHeader title={t('childPage.feesYear')} /><InlineEmpty icon={Receipt} title={t('childPage.noFeesSet')}>{t('childPage.noFeesSetBody')}</InlineEmpty></Card>;
    }
    return (
        <>
            <TableCard className="max-md:hidden" title={t('childPage.feesYear')} subtitle={head}>
                <Table aria-label={t('childPage.feesYear')}>
                    <THead>
                        <Th>{t('childPage.col.fee')}</Th>
                        <Th>{t('childPage.col.often')}</Th>
                        <Th className="text-right">{t('childPage.col.amount')}</Th>
                        <Th className="text-right">{t('childPage.col.paid')}</Th>
                        <Th>{t('childPage.col.status')}</Th>
                    </THead>
                    <tbody>
                        {loading ? Array.from({ length: 4 }, (_, i) => <Tr key={i}><Td colSpan={5}><Skeleton className="h-7" /></Td></Tr>)
                            : fees.map((f, i) => (
                                <Tr key={`${f.fee_name}-${i}`} className={cn(Number(f.balance) > 0 && 'bg-warn-soft/40')}>
                                    <Td className="type-body-semibold text-ink">{f.fee_name}</Td>
                                    <Td className="type-small text-ink-2">{often(f)}{scholarship(f)}</Td>
                                    <Td className="text-right type-body-semibold tabular-nums text-ink">{formatRs(f.amount, lang)}</Td>
                                    <Td className="text-right tabular-nums text-ink-2">{formatRs(f.paid_amount, lang)}</Td>
                                    <Td>{status(f)}</Td>
                                </Tr>
                            ))}
                    </tbody>
                </Table>
            </TableCard>
            <Card className="gap-2 md:hidden">
                <CardHeader title={t('childPage.feesYear')} />
                {head}
                {loading ? <RowsSkeleton rows={3} /> : (
                    <ul>
                        {fees.map((f, i) => (
                            <li key={`${f.fee_name}-${i}`} className="flex items-center gap-2.5 border-t border-line-subtle py-2.5">
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <p className="type-body-semibold text-ink">{f.fee_name}</p>
                                    <p className="type-caption text-muted">{often(f)}</p>
                                    {scholarship(f)}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="type-body-semibold text-ink">{formatRs(f.amount, lang)}</span>
                                    {status(f)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </>
    );
}
