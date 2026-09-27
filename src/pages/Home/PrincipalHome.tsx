import { useCallback, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
    BarChart2, Check, ClipboardCheck, Clock, Heart, Receipt, Send, TrendingDown, Umbrella, Users,
} from 'lucide-react';

import {
    Badge, Banner, Button, Card, CardHeader, Person, SegmentedControl, Skeleton,
    Table, TableCard, THead, Td, Th, Tr,
} from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { useClasses, useMonthlyReport, useOutstanding, useTodaySummary } from '../../features/dashboard/queries';
import { ChartEmpty, ChartError } from '../../features/dashboard/CardStates';
import { useLedger } from '../../features/finance/queries';
import { HeroChip, HeroPanel, HeroRow, HomeHero, HeroSkeleton } from '../../features/home/HomeHero';
import { HomeGreeting, InlineEmpty, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { Ring } from '../../features/home/Ring';
import { useWelfareFlags } from '../../features/home/queries';
import { usePendingLeaveCount } from '../../features/shell/usePendingLeaveCount';
import { attendanceService } from '../../api/services/attendance.service';
import { financesService } from '../../api/services/finances.service';
import { leavesService } from '../../api/services/leaves.service';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { errorText } from '../../features/people/format';

const TARGET = 90;
type Range = '3w' | '3m';
interface FeedItem { key: string; className: string; count: number; at: number }

/**
 * Figma B03 Principal home: today at school (live attendance, the registers
 * still open, what has just been saved), the money and people figures, the
 * attendance trend, what needs the principal's attention, and the largest
 * balances.
 *
 * Adapted: "Remind their teachers" is left out (there is no reminder to
 * teachers in the API); "Staff in today" reads approved leave instead of
 * staff attendance; the balance list shows the admission number where the
 * design has the parent's name.
 */
export default function PrincipalHome() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [today] = useState(() => isoLocal(new Date()));

    const summary = useTodaySummary();
    const classes = useClasses();
    const month = useMonthlyReport(0);
    const lastMonth = useMonthlyReport(1);
    const outstanding = useOutstanding();
    const pending = usePendingLeaveCount();
    const flags = useWelfareFlags();
    const onLeave = useQuery({
        queryKey: ['leaves', 'approved', 'today', today],
        queryFn: () => leavesService.listLeaves({ leave_status: 'approved', limit: 200 }),
        select: (res) => res.leaves.filter((l) => l.applicant_type !== 'student' && l.start_date <= today && l.end_date >= today),
        staleTime: 5 * 60 * 1000,
    });
    const recentSince = useMemo(() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 3); return isoLocal(d); }, [today]);
    const reversals = useLedger({ kind: 'income', start_date: recentSince, end_date: today, limit: 100 });

    // Registers saved since the page opened, newest first (WebSocket).
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const classNames = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c.name])), [classes.data]);
    const onSaved = useCallback((e: { payload: Record<string, unknown> }) => {
        void queryClient.invalidateQueries({ queryKey: ['attendance', 'today-summary'] });
        const classId = Number(e.payload.class_id);
        const item = { key: `${classId}-${Date.now()}`, className: classNames.get(classId) ?? t('home.p.aClass'), count: Number(e.payload.count ?? 0), at: Date.now() };
        setFeed((f) => [item, ...f].slice(0, 3));
    }, [queryClient, classNames, t]);
    useWebSocket({ 'attendance.updated': onSaved });

    const s = summary.data;
    const unmarked = s?.unmarked_sections ?? [];
    const noneYet = !!s && s.marked === 0;

    // ---- figures
    const collected = Number(month.data?.total_collected ?? 0);
    const before = Number(lastMonth.data?.total_collected ?? 0);
    const delta = before > 0 ? Math.round(((collected - before) / before) * 100) : null;
    const monthName = df.date(new Date(), 'monthYear').split(' ')[0];
    const owed = outstanding.data;
    const over30 = (owed?.entries ?? []).filter((e) => e.days_overdue > 30).length;
    const waiting = pending.data ?? [];
    const oldest = waiting.reduce<string | null>((o, l) => (!o || l.created_at < o ? l.created_at : o), null);
    const staffOff = onLeave.data ?? [];
    const statusOf = (q: { isPending: boolean; isError: boolean }) => (q.isError ? 'error' : q.isPending ? 'loading' : 'ready') as 'error' | 'loading' | 'ready';

    const remind = useMutation({ mutationFn: () => financesService.sendBulkReminders() });

    return (
        <AppPage title={t('home.title')}>
            <HomeGreeting />
            {summary.isError && (
                <Banner tone="bad" title={t('home.p.liveErrorTitle')}
                    action={<Button variant="quiet" size="sm" onClick={() => void summary.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('home.p.liveErrorBody')}
                </Banner>
            )}

            {/* ---------- Today at school ---------- */}
            {summary.isPending ? <HeroSkeleton label={t('home.p.heroTitle')} /> : s && (
                <HomeHero label={t('home.p.heroTitle')}
                    side={
                        <div className="flex items-center gap-3 lg:w-[300px] lg:flex-col">
                            <Ring value={s.expected ? s.present / s.expected : 0} onDark size={112} stroke={11}
                                label={s.expected ? `${formatCount(Math.round((s.present / s.expected) * 1000) / 10, lang)}%` : '0%'} sub={t('home.p.present')} />
                            <HeroPanel title={t('home.p.justSubmitted')} className="min-w-0 flex-1 lg:w-full">
                                {feed.length === 0 ? (
                                    <p className="type-caption text-white/80">{t('home.p.feedEmpty')}</p>
                                ) : feed.map((f) => (
                                    <HeroRow key={f.key}
                                        icon={<span className="grid size-[22px] place-items-center rounded-[7px] bg-[#5FD3A2]/22"><Check size={13} className="text-[#9BE8C6]" aria-hidden /></span>}
                                        trailing={<span className="type-micro text-white/62">{df.relative(new Date(f.at).toISOString())}</span>}>
                                        <p className="truncate type-caption-semibold">{f.className}</p>
                                        <p className="truncate type-micro text-white/72">{t('home.p.feedCount', { count: f.count, n: formatCount(f.count, lang) })}</p>
                                    </HeroRow>
                                ))}
                            </HeroPanel>
                        </div>
                    }>
                    <HeroChip dot={noneYet ? 'warn' : 'ok'}>{noneYet ? t('home.p.waitingChip') : t('home.p.liveChip')}</HeroChip>
                    {noneYet ? (
                        <>
                            <h2 className="type-h2 lg:type-display-l">{t('home.p.noneTitle')}</h2>
                            <p className="type-body text-white/86">{t('home.p.noneBody')}</p>
                        </>
                    ) : (
                        <>
                            <p className="flex flex-wrap items-baseline gap-2.5">
                                <span className="type-figure-l lg:type-figure-xl">{formatCount(s.present, lang)}</span>
                                <span className="type-h3 text-white/72">{t('home.p.ofPresent', { n: formatCount(s.expected, lang) })}</span>
                            </p>
                            <p className="type-body text-white/86">
                                {unmarked.length ? t('home.p.openBody', { count: unmarked.length, n: formatCount(unmarked.length, lang), absent: formatCount(s.absent, lang) })
                                    : t('home.p.allSavedBody', { absent: formatCount(s.absent, lang) })}
                            </p>
                            {unmarked.length > 0 && (
                                <ul className="flex flex-wrap gap-2" aria-label={t('home.p.openSections')}>
                                    {unmarked.slice(0, 6).map((u) => (
                                        <li key={u.section_id} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 ring-1 ring-inset ring-white/20 type-small-semibold">
                                            <span aria-hidden className="size-1.5 rounded-full bg-sx-gold" />{u.class_name} {u.section_name}
                                        </li>
                                    ))}
                                    {unmarked.length > 6 && <li className="self-center type-caption text-white/80">{t('home.p.andMore', { n: unmarked.length - 6 })}</li>}
                                </ul>
                            )}
                        </>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1.5">
                        <Button variant="white" leftIcon={ClipboardCheck} onClick={() => navigate('/attendance')}>{t('home.p.openAttendance')}</Button>
                    </div>
                </HomeHero>
            )}

            {/* ---------- Figures ---------- */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
                <KpiCard icon={Receipt} tone="ok" label={t('home.p.collectedIn', { month: monthName })} long
                    value={formatRs(collected, lang)} to="/finances" status={statusOf(month)} onRetry={() => void month.refetch()}
                    sub={delta !== null ? <><Badge tone={delta >= 0 ? 'ok' : 'bad'}>{delta >= 0 ? '+' : ''}{formatCount(delta, lang)}%</Badge><span className="truncate">{t('home.p.vsLastMonth')}</span></> : t('home.p.firstMonth')} />
                <KpiCard icon={TrendingDown} tone="bad" label={t('home.p.outstanding')} long
                    value={formatRs(owed?.total_outstanding ?? 0, lang)} to="/finances/outstanding" status={statusOf(outstanding)} onRetry={() => void outstanding.refetch()}
                    sub={<span className="truncate">{owed?.total_count ? t('home.p.families', { count: owed.total_count, n: formatCount(owed.total_count, lang), over: formatCount(over30, lang) }) : t('home.p.noneDue')}</span>} />
                <KpiCard icon={Umbrella} tone="brand" label={t('home.p.leaveRequests')}
                    value={waiting.length ? t('home.p.waitingCount', { n: formatCount(waiting.length, lang) }) : t('home.p.noneWaiting')}
                    to="/leave-approvals" status={statusOf(pending)} onRetry={() => void pending.refetch()}
                    sub={<span className="truncate">{oldest ? t('home.p.oldestSent', { when: df.relative(oldest) }) : t('home.p.caughtUp')}</span>} />
                <KpiCard icon={Users} tone="info" label={t('home.p.staffOnLeave')}
                    value={formatCount(staffOff.length, lang)} status={statusOf(onLeave)} onRetry={() => void onLeave.refetch()}
                    sub={<span className="truncate">{staffOff.length ? t('home.p.approvedToday') : t('home.p.everyoneIn')}</span>} />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
                <AttendanceTrend />
                <Attention
                    loading={flags.isPending || pending.isPending}
                    flags={flags.data ?? []}
                    unmarked={unmarked.length} unmarkedNames={unmarked.slice(0, 3).map((u) => `${u.class_name} ${u.section_name}`)}
                    waiting={waiting.length}
                    reversals={(reversals.data?.entries ?? []).filter((e) => Number(e.amount) < 0).slice(0, 2)}
                />
            </div>

            <Balances entries={owed?.entries ?? []} loading={outstanding.isPending} total={owed?.total_count ?? 0}
                canRemind={can('payments', 'create')} remind={remind} />
        </AppPage>
    );
}

/** Figma B03 "Attendance, last 3 weeks": school-wide percentage per school day. */
function AttendanceTrend() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const titleId = useId();
    const gradientId = useId();
    const [range, setRange] = useState<Range>('3w');
    const [today] = useState(() => new Date());
    const start = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() - (range === '3w' ? 21 : 90)); return isoLocal(d); }, [today, range]);
    const q = useQuery({
        queryKey: ['attendance', 'daily', 'school', start],
        queryFn: () => attendanceService.getDailySummary({ start_date: start, end_date: isoLocal(today) }),
        staleTime: 5 * 60 * 1000,
    });
    const data = (q.data?.days ?? []).filter((d) => d.total > 0 && d.attendance_pct !== null)
        .map((d) => ({ date: d.date, label: df.date(d.date, 'dayMonth').split(', ').pop() ?? d.date, pct: Number(d.attendance_pct) }));
    const avg = data.length ? data.reduce((a, d) => a + d.pct, 0) / data.length : null;

    return (
        <Card aria-labelledby={titleId}>
            <CardHeader titleId={titleId} title={t(range === '3w' ? 'home.p.trend3w' : 'home.p.trend3m')}
                subtitle={avg !== null ? t('home.p.trendSub', { avg: formatCount(Math.round(avg * 10) / 10, lang), target: TARGET }) : undefined}
                action={<SegmentedControl size="sm" value={range} onChange={setRange} aria-label={t('home.p.range')}
                    options={[{ value: '3w', label: t('home.p.weeks3') }, { value: '3m', label: t('home.p.months3') }]} />} />
            {q.isPending ? <Skeleton className="h-[200px] rounded-row" /> : q.isError ? <ChartError onRetry={() => void q.refetch()} /> : data.length < 2 ? (
                <ChartEmpty icon={BarChart2}>{t('home.p.trendEmpty')}</ChartEmpty>
            ) : (
                <div className="h-[210px]" role="img" aria-label={t('home.p.trendAria', { avg: formatCount(Math.round((avg ?? 0) * 10) / 10, lang) })}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--color-line-subtle)" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} minTickGap={24} />
                            <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                                domain={[(min: number) => Math.max(0, Math.floor(Math.min(min, TARGET) - 5)), 100]} tickFormatter={(v: number) => `${formatCount(v, lang)}%`} />
                            <ReferenceLine y={TARGET} stroke="var(--color-warn)" strokeDasharray="6 4" strokeWidth={1.5} />
                            <Tooltip formatter={(v) => [`${formatCount(Number(v), lang)}%`, t('home.p.present')]} labelFormatter={(l) => String(l)}
                                contentStyle={{ borderRadius: 10, border: 'none', background: '#111A24', color: 'white', fontSize: 12 }} itemStyle={{ color: 'white' }} />
                            <Area type="monotone" dataKey="pct" stroke="var(--color-primary)" strokeWidth={2.75} fill={`url(#${gradientId})`}
                                dot={{ r: 3, fill: 'var(--color-surface)', stroke: 'var(--color-primary)', strokeWidth: 2 }} isAnimationActive animationDuration={1000} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}

/** Figma B03 "Needs your attention", most urgent first. */
function Attention({ loading, flags, unmarked, unmarkedNames, waiting, reversals }: {
    loading: boolean;
    flags: { student_id: number; student_name: string; consecutive_absences: number }[];
    unmarked: number;
    unmarkedNames: string[];
    waiting: number;
    reversals: { id: number; reference: string; party: string; amount: number | string; date: string }[];
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const navigate = useNavigate();
    const titleId = useId();
    const go = (to: string, label: string) => <Button variant="ghost" size="sm" className="text-primary-text" onClick={() => navigate(to)}>{label}</Button>;
    const items = [
        ...flags.slice(0, 2).map((f) => (
            <ItemRow key={`f${f.student_id}`} icon={Heart} tone="bad" title={t('home.p.welfare', { name: f.student_name, count: f.consecutive_absences, n: formatCount(f.consecutive_absences, lang) })}
                sub={t('home.p.welfareSub')} trailing={go(`/people/students/${f.student_id}`, t('home.p.checkIn'))} />
        )),
        unmarked > 0 && (
            <ItemRow key="u" icon={Clock} tone="warn" title={t('home.p.unmarked', { count: unmarked, n: formatCount(unmarked, lang) })}
                sub={unmarkedNames.join(', ')} trailing={go('/attendance', t('home.p.open'))} />
        ),
        waiting > 0 && (
            <ItemRow key="l" icon={Umbrella} tone="brand" title={t('home.p.leaveWaiting', { count: waiting, n: formatCount(waiting, lang) })}
                sub={t('home.p.leaveWaitingSub')} trailing={go('/leave-approvals', t('home.p.review'))} />
        ),
        ...reversals.map((r) => (
            <ItemRow key={`r${r.id}`} icon={Receipt} tone="info" title={t('home.p.reversed', { receipt: r.reference || `#${r.id}` })}
                sub={`${r.party || '—'} · ${df.date(r.date)}`} trailing={go('/finances/ledger', t('home.p.view'))} />
        )),
    ].filter(Boolean);

    return (
        <Card aria-labelledby={titleId} className="gap-2">
            <CardHeader titleId={titleId} title={t('home.p.attention')} subtitle={loading ? undefined : items.length ? t('home.p.bySeverity') : t('home.p.nothingNow')} />
            {loading ? <RowsSkeleton rows={3} /> : items.length ? <ul>{items}</ul> : (
                <InlineEmpty icon={Check} title={t('home.p.allClear')}>{t('home.p.allClearBody')}</InlineEmpty>
            )}
        </Card>
    );
}

/** Figma B03 "Largest balances due", oldest first. */
function Balances({ entries, loading, total, canRemind, remind }: {
    entries: { student_id: number; student_name: string; admission_no: string; class_name: string | null; days_overdue: number; risk: 'High' | 'Medium' | 'Low'; balance: number }[];
    loading: boolean;
    total: number;
    canRemind: boolean;
    remind: ReturnType<typeof useMutation<{ message: string }, Error, void>>;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    if (!loading && entries.length === 0) return null;
    const rows = [...entries].sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 5);
    const tone = (r: string) => (r === 'High' ? 'bad' : r === 'Medium' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral';
    const remindButton = canRemind && total > 0 && (
        <Button variant="quiet" size="sm" leftIcon={Send} loading={remind.isPending} onClick={() => remind.mutate()}>
            {t('home.p.remindAll', { count: total, n: formatCount(total, lang) })}
        </Button>
    );
    return (
        <>
            {remind.isSuccess && <Banner tone="ok" title={t('home.p.reminded')}>{remind.data?.message}</Banner>}
            {remind.isError && <Banner tone="bad" title={t('home.p.remindFailed')}>{errorText(remind.error, t('peoplePage.error.body'))}</Banner>}
            <TableCard className="max-md:hidden" title={t('home.p.largest')} subtitle={t('home.p.largestSub')} action={remindButton || undefined}>
                <Table aria-label={t('home.p.largest')}>
                    <THead>
                        <Th>{t('financePage.col.student')}</Th>
                        <Th>{t('home.p.col.class')}</Th>
                        <Th>{t('home.p.col.overdue')}</Th>
                        <Th>{t('home.p.col.risk')}</Th>
                        <Th className="text-right">{t('home.p.col.balance')}</Th>
                    </THead>
                    <tbody>
                        {loading ? Array.from({ length: 4 }, (_, i) => (
                            <Tr key={i}><Td colSpan={5}><Skeleton className="h-8" /></Td></Tr>
                        )) : rows.map((r) => (
                            <Tr key={r.student_id}>
                                <Td><Link to={`/people/students/${r.student_id}`} className="outline-none hover:underline"><Person name={r.student_name} sub={r.admission_no} /></Link></Td>
                                <Td className="type-small text-ink-2">{r.class_name ?? '—'}</Td>
                                <Td className="type-small text-ink-2">{t('home.p.days', { count: r.days_overdue, n: formatCount(r.days_overdue, lang) })}</Td>
                                <Td><Badge tone={tone(r.risk)} dot>{t(`outstandingPage.risk.${r.risk}`)}</Badge></Td>
                                <Td className="text-right type-body-semibold tabular-nums text-ink">{formatRs(r.balance, lang)}</Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>
            <Card className="gap-2 md:hidden">
                <CardHeader title={t('home.p.largest')} subtitle={t('home.p.largestSub')} />
                {loading ? <RowsSkeleton rows={3} /> : (
                    <ul>
                        {rows.slice(0, 4).map((r) => (
                            <li key={r.student_id} className="flex items-center gap-2.5 border-b border-line-subtle py-2.5 last:border-b-0">
                                <div className="min-w-0 flex-1"><Person name={r.student_name} sub={`${r.class_name ?? '—'}, ${t('home.p.days', { count: r.days_overdue, n: formatCount(r.days_overdue, lang) })}`} /></div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="type-body-semibold tabular-nums text-ink">{formatRs(r.balance, lang)}</span>
                                    <Badge tone={tone(r.risk)}>{t(`outstandingPage.risk.${r.risk}`)}</Badge>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {remindButton}
            </Card>
        </>
    );
}
