import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart2 } from 'lucide-react';

import { Card, CardHeader, Skeleton } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal, toNepaliDigits } from '../../utils/nepaliDate';
import { ChartEmpty, ChartError } from './CardStates';

const AXIS_TICK = { fontSize: 11, fontWeight: 500, fill: 'var(--color-muted)', fontFamily: 'var(--font-ui)' };

/**
 * Fees month by month through the school year (Baisakh to Chaitra): what fell
 * due, after scholarships, against what came in. A monthly fee counts in
 * every month it is due, so the bars show where collection falls behind.
 */
export function FeeYearCard() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const titleId = useId();
    const q = useQuery({ queryKey: ['finances', 'year-report'], queryFn: () => financesService.getYearReport(), staleTime: 5 * 60 * 1000 });
    const today = isoLocal(new Date());
    const data = (q.data?.months ?? []).map((m) => ({
        label: df.monthShort(m.start),
        charged: m.start <= today ? Number(m.charged) : null,
        collected: m.start <= today ? Number(m.collected) : null,
    }));
    const r = q.data;
    const short = (v: number) => {
        const s = v >= 100000 ? `${Math.round(v / 10000) / 10}L` : v >= 1000 ? `${Math.round(v / 100) / 10}K` : String(v);
        return lang === 'ne' ? toNepaliDigits(s) : s;
    };
    const nothing = r && Number(r.charged) === 0 && Number(r.collected) === 0;

    return (
        <Card aria-labelledby={titleId} className="gap-3">
            <CardHeader titleId={titleId} title={t('feeYear.title', { year: r ? (lang === 'ne' ? toNepaliDigits(r.bs_year) : r.bs_year) : '' })}
                subtitle={r && !nothing ? t('feeYear.sub', { collected: formatRs(r.collected, lang), charged: formatRs(r.charged, lang), owed: formatRs(r.outstanding, lang) }) : undefined} />
            {q.isPending ? <Skeleton className="h-[240px]" /> : q.isError ? <ChartError onRetry={() => void q.refetch()} /> : nothing ? (
                <ChartEmpty icon={BarChart2}>{t('feeYear.empty')}</ChartEmpty>
            ) : (
                <div className="h-[240px]" role="img"
                    aria-label={t('feeYear.aria', { list: data.filter((d) => d.charged !== null).map((d) => `${d.label} ${formatRs(d.collected ?? 0, lang)} / ${formatRs(d.charged ?? 0, lang)}`).join(', ') })}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -6 }} barCategoryGap="22%">
                            <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval={0} />
                            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(v) => short(Number(v))} width={44} />
                            <Tooltip formatter={(v, name) => [formatRs(Number(v), lang), name === 'charged' ? t('feeYear.charged') : t('feeYear.collected')]}
                                cursor={{ fill: 'var(--color-sunken)' }} />
                            <Legend formatter={(v) => (v === 'charged' ? t('feeYear.charged') : t('feeYear.collected'))} wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="charged" fill="var(--color-sx-blue-200)" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="collected" fill="var(--color-ok)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {r && !nothing && (
                <p className="type-caption text-muted">{t('feeYear.note', { pct: formatCount(Number(r.charged) ? Math.round((Number(r.collected) / Number(r.charged)) * 100) : 0, lang) })}</p>
            )}
        </Card>
    );
}
