import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

import { Card, CardHeader, Skeleton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { ChartEmpty, ChartError } from './CardStates';
import { useEnrolmentTrend } from './queries';

const AXIS_TICK = { fontSize: 11, fontWeight: 500, fill: 'var(--color-muted)', fontFamily: 'var(--font-ui)' };

/** Figma B01 "Enrolment trend": enrolments per academic year, oldest first. */
export function EnrolmentTrendCard() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const gradientId = useId();
    const { points, isPending, isError, refetch } = useEnrolmentTrend();

    // Years before the school started using the system are missing data,
    // not zero enrolments: the line starts at the first year with students.
    const first = points.findIndex((p) => p.count > 0);
    const data = (first < 0 ? [] : points.slice(first)).map((p) => ({
        label: academicYearLabel(p.year, lang),
        count: p.count,
    }));
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    let subtitle: string = t('adminDashboard.loading');
    if (isError) subtitle = t('adminDashboard.cardError');
    else if (!isPending && !latest) subtitle = t('adminDashboard.enrolment.emptyTitle');
    else if (latest && previous) {
        const pct = Math.round((Math.abs(latest.count - previous.count) / previous.count) * 1000) / 10;
        const key = latest.count > previous.count ? 'summaryUp' : latest.count < previous.count ? 'summaryDown' : 'summarySame';
        subtitle = t(`adminDashboard.enrolment.${key}`, { count: latest.count, n: formatCount(latest.count, lang), pct, prev: previous.label });
    } else if (latest) {
        subtitle = t('adminDashboard.enrolment.summaryOnly', { count: latest.count, n: formatCount(latest.count, lang) });
    }

    return (
        <Card aria-labelledby={titleId}>
            <CardHeader titleId={titleId} title={t('adminDashboard.enrolment.title')} subtitle={subtitle} />
            {isPending ? (
                <Skeleton className="h-[200px] rounded-row" />
            ) : isError ? (
                <ChartError onRetry={refetch} />
            ) : data.length === 0 ? (
                <ChartEmpty icon={LineChartIcon}>{t('adminDashboard.enrolment.emptyBody')}</ChartEmpty>
            ) : (
                <div role="img" aria-label={`${t('adminDashboard.enrolment.title')}. ${data.map((d) => `${d.label}: ${d.count}`).join(', ')}`} className="h-[206px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 22, right: 18, bottom: 0, left: -8 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.26} />
                                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} interval={0} padding={{ left: 14, right: 14 }} />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={AXIS_TICK}
                                width={44}
                                tickCount={4}
                                domain={[(min: number) => Math.max(0, Math.floor((min * 0.9) / 10) * 10), (max: number) => Math.ceil((max * 1.03) / 10) * 10]}
                                tickFormatter={(v: number) => formatCount(v, lang)}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="var(--color-primary)"
                                strokeWidth={2.75}
                                fill={`url(#${gradientId})`}
                                dot={{ r: 4.5, fill: 'var(--color-surface)', stroke: 'var(--color-primary)', strokeWidth: 2.5 }}
                                activeDot={false}
                                isAnimationActive
                                animationDuration={1400}
                                animationEasing="ease-out"
                            >
                                <LabelList
                                    dataKey="count"
                                    position="top"
                                    offset={12}
                                    content={({ x, y, value, index }) => (
                                        <text
                                            x={Number(x)}
                                            y={Number(y) - 12}
                                            textAnchor="middle"
                                            fontSize={11}
                                            fontWeight={700}
                                            fontFamily="var(--font-ui)"
                                            fill={index === data.length - 1 ? 'var(--color-primary-text)' : 'var(--color-ink-2)'}
                                        >
                                            {formatCount(Number(value), lang)}
                                        </text>
                                    )}
                                />
                            </Area>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}
