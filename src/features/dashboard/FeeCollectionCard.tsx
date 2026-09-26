import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Button, Card, CardHeader, Skeleton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { ChartError } from './CardStates';
import { useMonthlyReport, useOutstanding } from './queries';

/**
 * Figma B01 "Fee collection": this month's payments against what is still
 * owed, as a ring (collected, ok) on the outstanding track (bad at 75%).
 *
 * "This month" is the Nepali month. Adapted: the outstanding list counts
 * students rather than families.
 */
export function FeeCollectionCard() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const titleId = useId();
    const month = useMonthlyReport(0);
    const outstanding = useOutstanding();

    const isPending = month.isPending || outstanding.isPending;
    const isError = month.isError || outstanding.isError;
    const collected = Number(month.data?.total_collected ?? 0);
    const owed = Number(outstanding.data?.total_outstanding ?? 0);
    const total = collected + owed;
    const share = total > 0 ? collected / total : 0;
    const noFees = !isPending && !isError && total === 0;
    const payments = month.data?.transaction_count ?? 0;
    const due = outstanding.data?.total_count ?? 0;
    const over30 = (outstanding.data?.entries ?? []).filter((e) => e.days_overdue > 30).length;

    const goOutstanding = () => navigate('/finances/outstanding');
    const retry = () => { void month.refetch(); void outstanding.refetch(); };

    const subtitle = isPending
        ? t('adminDashboard.loading')
        : isError
            ? t('adminDashboard.cardError')
            : noFees
                ? t('adminDashboard.fees.emptyTitle')
                : t('adminDashboard.fees.subtitle', { total: formatRs(total, lang) });

    return (
        <Card aria-labelledby={titleId} className="gap-3.5">
            <CardHeader
                titleId={titleId}
                title={t('adminDashboard.fees.title')}
                subtitle={subtitle}
                action={
                    !isError && !noFees && (
                        <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={goOutstanding} className="hidden sm:inline-flex">
                            {t('adminDashboard.fees.open')}
                        </Button>
                    )
                }
            />

            {isPending ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
                    <Skeleton className="size-[150px] rounded-full sm:size-[168px]" />
                    <div className="flex w-full flex-1 flex-col gap-3">
                        <Skeleton className="h-9" />
                        <Skeleton className="h-9" />
                    </div>
                </div>
            ) : isError ? (
                <ChartError onRetry={retry} className="h-[168px]" />
            ) : (
                <>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
                        <Ring share={share} label={t('adminDashboard.fees.centre')} lang={lang} />
                        <dl className="flex w-full min-w-0 flex-1 flex-col gap-3">
                            <LegendRow
                                swatch="bg-ok"
                                label={t('adminDashboard.fees.collected')}
                                sub={t('adminDashboard.fees.payments', { count: payments, n: formatCount(payments, lang) })}
                                amount={formatRs(collected, lang)}
                            />
                            <div className="h-px bg-line-subtle" />
                            <LegendRow
                                swatch="bg-bad"
                                label={t('adminDashboard.fees.outstanding')}
                                sub={t('adminDashboard.fees.outstandingSub', { n: formatCount(due, lang), over: formatCount(over30, lang) })}
                                amount={formatRs(owed, lang)}
                            />
                        </dl>
                    </div>
                    {noFees ? (
                        <Button variant="secondary" fullWidth onClick={() => navigate('/finances')}>
                            {t('adminDashboard.fees.setUp')}
                        </Button>
                    ) : (
                        <Button variant="secondary" fullWidth rightIcon={ArrowRight} onClick={goOutstanding} className="sm:hidden">
                            {t('adminDashboard.fees.open')}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}

function LegendRow({ swatch, label, sub, amount }: { swatch: string; label: string; sub: string; amount: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span aria-hidden className={`size-2.5 shrink-0 rounded-[3px] ${swatch}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
                <dt className="type-small text-ink-2">{label}</dt>
                <dd className="truncate type-caption text-muted">{sub}</dd>
            </div>
            <dd className="shrink-0 type-body-semibold tabular-nums text-ink">{amount}</dd>
        </div>
    );
}

/**
 * Figma "Ring": inner radius 78.6% of the outer, so the band is 18px on the
 * 168px ring. The arc starts at twelve o'clock and sweeps in over 1.2s.
 */
function Ring({ share, label, lang }: { share: number; label: string; lang: 'en' | 'ne' }) {
    const size = 168;
    const band = 18;
    const r = (size - band) / 2;
    const c = 2 * Math.PI * r;
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(share));
        return () => cancelAnimationFrame(id);
    }, [share]);
    const pct = Math.round(share * 100);

    return (
        <div className="relative size-[150px] shrink-0 sm:size-[168px]">
            <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bad)" strokeOpacity={share < 1 ? 0.75 : 0} strokeWidth={band} />
                {share === 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={band} />}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--color-ok)"
                    strokeWidth={band}
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - shown)}
                    className="transition-[stroke-dashoffset] duration-[1200ms] ease-sx"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="type-figure-m text-ink">{formatCount(pct, lang)}%</span>
                <span className="type-micro text-muted">{label}</span>
            </div>
        </div>
    );
}
