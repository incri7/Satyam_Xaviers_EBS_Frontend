import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { BarChart2 } from 'lucide-react';

import { Card, CardHeader, Skeleton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { ChartEmpty, ChartError } from './CardStates';
import { useAttendanceByClass } from './queries';

/** The school's daily attendance target (Figma B01: "the 90% target"). */
export const ATTENDANCE_TARGET = 90;

const AXIS_TICK = { fontSize: 11, fontWeight: 500, fill: 'var(--color-muted)', fontFamily: 'var(--font-ui)' };

/**
 * Figma B01 "Attendance by class": share present in each class today, in
 * school order, amber below the target.
 */
export function AttendanceByClassCard() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const titleId = useId();
    const { rows, isPending, isError, refetch } = useAttendanceByClass();
    const below = rows.filter((r) => r.pct < ATTENDANCE_TARGET);
    const empty = !isPending && !isError && rows.length === 0;

    return (
        <Card aria-labelledby={titleId}>
            <CardHeader
                titleId={titleId}
                title={t('adminDashboard.attendance.title')}
                subtitle={
                    isPending ? t('adminDashboard.loading')
                        : isError ? t('adminDashboard.cardError')
                            : empty ? t('adminDashboard.attendance.emptyTitle')
                                : t('adminDashboard.attendance.subtitle')
                }
            />
            {isPending ? (
                <Skeleton className="h-[200px] rounded-row" />
            ) : isError ? (
                <ChartError onRetry={refetch} />
            ) : empty ? (
                <ChartEmpty icon={BarChart2}>{t('adminDashboard.attendance.emptyBody')}</ChartEmpty>
            ) : (
                <>
                    <div
                        role="img"
                        aria-label={`${t('adminDashboard.attendance.title')}. ${rows.map((r) => `${r.name}: ${r.pct}%`).join(', ')}`}
                        className="h-[202px]"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} margin={{ top: 18, right: 4, bottom: 0, left: -4 }} barCategoryGap="28%">
                                <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                                <XAxis dataKey="short" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={6} interval={0} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={AXIS_TICK}
                                    width={44}
                                    domain={[0, 100]}
                                    ticks={[0, 25, 50, 75, 100]}
                                    tickFormatter={(v: number) => `${formatCount(v, lang)}%`}
                                />
                                <ReferenceLine
                                    y={ATTENDANCE_TARGET}
                                    stroke="var(--color-warn)"
                                    strokeWidth={1.25}
                                    strokeDasharray="6 4"
                                    ifOverflow="extendDomain"
                                />
                                <Bar
                                    dataKey="pct"
                                    maxBarSize={28}
                                    radius={[6, 6, 0, 0]}
                                    isAnimationActive
                                    animationDuration={480}
                                    animationEasing="ease-out"
                                >
                                    {rows.map((r) => (
                                        <Cell key={r.classId} fill={r.pct < ATTENDANCE_TARGET ? 'var(--color-warn)' : 'var(--color-ok)'} />
                                    ))}
                                    <LabelList
                                        dataKey="pct"
                                        content={({ x, y, width, value }) => {
                                            const pct = Number(value);
                                            return (
                                                <text
                                                    x={Number(x) + Number(width) / 2}
                                                    y={Number(y) - 6}
                                                    textAnchor="middle"
                                                    fontSize={11}
                                                    fontWeight={700}
                                                    fontFamily="var(--font-ui)"
                                                    fill={pct < ATTENDANCE_TARGET ? 'var(--color-warn)' : 'var(--color-ink-2)'}
                                                >
                                                    {formatCount(pct, lang)}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                        <Legend swatch="bg-ok">{t('adminDashboard.attendance.atTarget')}</Legend>
                        {below.length > 0 ? (
                            <Legend swatch="bg-warn">
                                {t('adminDashboard.attendance.below', { classes: below.map((r) => r.name).join(', ') })}
                            </Legend>
                        ) : null}
                    </div>
                </>
            )}
        </Card>
    );
}

function Legend({ swatch, children }: { swatch: string; children: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 type-caption text-ink-2">
            <span aria-hidden className={`size-2 shrink-0 rounded-[3px] ${swatch}`} />
            {children}
        </span>
    );
}
