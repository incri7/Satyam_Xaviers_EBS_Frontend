import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookMarked, ChevronRight, ClipboardCheck, Link2, Megaphone, Phone, Umbrella, Wallet, WifiOff } from 'lucide-react';

import { Avatar, Button, Card, CardHeader, EmptyState, Skeleton } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { noticesService } from '../../api/services/notices.service';
import type { ChildSummary } from '../../api/services/parent.service';
import { InlineError, ItemRow, RowsSkeleton } from '../../features/home/parts';
import { InfoTile, StatusPanel } from '../../features/parent/parts';
import { useWelcome } from '../../features/shell/identity';
import { useWebSocket } from '../../hooks/useWebSocket';
import { childClass, childName, lookOf, useChildren, useSchoolPhone } from '../../features/parent/helpers';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';

/**
 * Figma D01 Parent home: zero taps to each child's status. Laptop shows a
 * card per child (status, fees, latest exam, this month's attendance, quick
 * links); phones switch between children with chips and flag any other
 * child who is absent. Refreshes live as registers are saved.
 *
 * Adapted: no roll number or "marked by" in the data, so the status line
 * names the class teacher; the fee tile shows what is due (fees have no due
 * date); "unread" notices are not tracked, so the latest three are shown.
 */
export default function ParentHome() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const welcome = useWelcome();
    const kids = useChildren();
    const phone = useSchoolPhone();
    const [pick, setPick] = useState<number | null>(null);

    const refresh = useCallback(() => { void qc.invalidateQueries({ queryKey: ['parent', 'my-children'] }); }, [qc]);
    useWebSocket({ 'attendance.updated': refresh });

    const list = kids.data ?? [];
    const current = list.find((c) => c.student_id === pick) ?? list[0];
    const leaveFor = (c: ChildSummary) => () => {
        const today = isoLocal(new Date());
        navigate(`/parent/child/${c.student_id}/leave?start=${today}&end=${today}`);
    };
    const summary = list.map((c) => {
        const look = lookOf(c);
        return look === 'present' || look === 'half' ? t('parentHome.inSchool', { name: c.first_name })
            : look === 'absent' ? t('parentHome.isAbsent', { name: c.first_name })
                : look === 'leave' ? t('parentHome.isOnLeave', { name: c.first_name }) : null;
    }).filter(Boolean).join(' ');

    return (
        <AppPage title={t('home.title')} noSidebarOffset className="mx-auto w-full max-w-[1080px]">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h1 className="type-h2 text-ink lg:type-h1">{welcome.greeting}, {welcome.name}</h1>
                    <p className="type-small text-muted">{[df.date(new Date(), 'long') + '.', summary].filter(Boolean).join(' ')}</p>
                </div>
                {list.length > 0 && (
                    <Button variant="secondary" leftIcon={Umbrella} className="max-sm:hidden" onClick={() => navigate(`/parent/child/${current!.student_id}/leave`)}>
                        {t('parentHome.askLeave')}
                    </Button>
                )}
            </div>

            {kids.isPending ? <HomeSkeleton /> : kids.isError ? (
                <EmptyState icon={WifiOff} tone="bad" title={t('parentHome.errorTitle')}
                    action={<Button variant="quiet" onClick={() => void kids.refetch()}>{t('classesPage.action.retry')}</Button>}>
                    {t('parentHome.errorBody')}
                </EmptyState>
            ) : list.length === 0 ? <NoChildren phone={phone} /> : (
                <>
                    {/* Phones: one child at a time, others flagged if absent */}
                    <div className="flex flex-col gap-3.5 lg:hidden">
                        {list.length > 1 && (
                            <div role="tablist" aria-label={t('parentHome.children')} className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                                {list.map((c) => {
                                    const on = c.student_id === current!.student_id;
                                    return (
                                        <button key={c.student_id} type="button" role="tab" aria-selected={on} onClick={() => setPick(c.student_id)}
                                            className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full py-[5px] pr-3.5 pl-[5px] outline-none focus-visible:ring-3 focus-visible:ring-focus/60',
                                                on ? 'bg-inverse text-on-inverse' : 'bg-surface text-ink ring-1 ring-inset ring-line')}>
                                            <Avatar name={childName(c)} size={30} />
                                            <span className="type-body-semibold">{c.first_name}</span>
                                            {c.today_status === 'A' && <span aria-label={t('parentHome.isAbsent', { name: c.first_name })} className="size-2 rounded-full bg-bad" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {list.filter((c) => c !== current && c.today_status === 'A').map((c) => (
                            <button key={c.student_id} type="button" onClick={() => setPick(c.student_id)}
                                className="flex items-center gap-3 rounded-2xl bg-bad-soft p-3 text-left ring-1 ring-inset ring-bad-line outline-none focus-visible:ring-3 focus-visible:ring-focus/60">
                                <Avatar name={childName(c)} size={36} />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="type-body-semibold text-bad">{t('parentHome.isAbsent', { name: c.first_name })}</span>
                                    <span className="type-caption text-ink-2">{t('parentHome.absentAlertSub', { cls: childClass(c) })}</span>
                                </span>
                                <ChevronRight size={18} className="shrink-0 text-bad" aria-hidden />
                            </button>
                        ))}
                        <div className="relative flex flex-col gap-2.5">
                            <StatusPanel child={current!} schoolPhone={phone} onLeave={leaveFor(current!)} />
                            <div className="grid grid-cols-2 gap-2.5">
                                <FeeTile child={current!} />
                                <MarksTile child={current!} />
                            </div>
                            <OpenChildLink child={current!} className="self-center after:rounded-[20px]" />
                        </div>
                        <QuickLinks child={current!} />
                    </div>

                    {/* Laptop: a card per child */}
                    <div className="hidden flex-col gap-[18px] lg:flex">
                        {list.map((c) => <ChildCard key={c.student_id} child={c} phone={phone} onLeave={leaveFor(c)} />)}
                    </div>
                </>
            )}

            {list.length > 0 && <Notices />}
        </AppPage>
    );
}

/**
 * "Open Aarohi's page", stretched over its card: the whole card opens the
 * child's page, yet it stays one link for keyboards and screen readers.
 * Controls inside the card (call, leave, quick links) sit above it.
 */
function OpenChildLink({ child, className }: { child: ChildSummary; className?: string }) {
    const { t } = useTranslation();
    return (
        <Link to={`/parent/child/${child.student_id}/dashboard`}
            className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 type-small-semibold text-primary-text outline-none hover:bg-primary-soft',
                'after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-focus/60', className)}>
            {t('parentHome.openPage', { name: child.first_name })}
            <ChevronRight size={16} aria-hidden />
        </Link>
    );
}

function ChildCard({ child, phone, onLeave }: { child: ChildSummary; phone: string | null; onLeave: () => void }) {
    return (
        <Card className="relative flex-row gap-[22px] p-2.5 transition-shadow duration-200 hover:shadow-e3">
            <StatusPanel child={child} schoolPhone={phone} onLeave={onLeave} className="w-[430px] shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-3.5 py-3.5 pr-3.5">
                <div className="flex items-center gap-3">
                    <Avatar name={childName(child)} size={44} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h2 className="truncate type-h3 text-ink">{childName(child)}</h2>
                        <p className="truncate type-small text-muted">{[childClass(child), child.admission_no].filter(Boolean).join(', ')}</p>
                    </div>
                    <OpenChildLink child={child} className="after:rounded-card" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <FeeTile child={child} />
                    <MarksTile child={child} />
                    <AttendanceTile child={child} />
                </div>
                <QuickLinks child={child} />
            </div>
        </Card>
    );
}

function FeeTile({ child }: { child: ChildSummary }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const due = Number(child.fee_due);
    return (
        <InfoTile icon={Wallet} tone={due > 0 ? 'warn' : 'ok'} label={due > 0 ? t('parentHome.feesDue') : t('parentHome.fees')}
            value={formatRs(due, df.lang)}
            badge={due > 0 ? t('parentHome.payAtOffice') : child.last_paid_at ? t('parentHome.paidOn', { date: df.date(child.last_paid_at, 'dayMonth').split(', ').pop() }) : t('parentHome.allPaid')}
            badgeTone={due > 0 ? 'warn' : 'ok'} />
    );
}

function MarksTile({ child }: { child: ChildSummary }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const e = child.latest_exam;
    if (!e || e.percent === null) {
        return <InfoTile icon={BookMarked} tone="brand" label={t('parentHome.marks')} value="—" badge={t('parentHome.noExamYet')} />;
    }
    const diff = e.previous_percent !== null ? Math.round((e.percent - e.previous_percent) * 10) / 10 : null;
    return (
        <InfoTile icon={BookMarked} tone="brand" label={e.exam_name} value={`${formatCount(e.percent, lang)}%`}
            badge={diff === null ? t('parentHome.firstExam') : Math.abs(diff) < 1 ? t('parentHome.sameAsLast') : diff > 0 ? t('parentHome.upBy', { n: formatCount(diff, lang) }) : t('parentHome.downBy', { n: formatCount(-diff, lang) })}
            badgeTone={diff === null || Math.abs(diff) < 1 ? 'neutral' : diff > 0 ? 'ok' : 'bad'} />
    );
}

function AttendanceTile({ child }: { child: ChildSummary }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const days = child.month_school_days;
    const pct = days ? Math.round((child.month_present / days) * 1000) / 10 : null;
    return (
        <InfoTile icon={ClipboardCheck} tone="info" label={t('parentHome.thisMonth')} value={pct === null ? '—' : `${formatCount(pct, lang)}%`}
            badge={days ? t('parentHome.daysOf', { a: formatCount(child.month_present, lang), b: formatCount(days, lang) }) : t('parentHome.monthNotStarted')}
            badgeTone={pct === null ? 'neutral' : pct >= 75 ? 'ok' : 'warn'} />
    );
}

function QuickLinks({ child }: { child: ChildSummary }) {
    const { t } = useTranslation();
    const links: [typeof Wallet, string, string][] = [
        [ClipboardCheck, t('home.parent.attendance'), 'attendance'],
        [BookMarked, t('home.parent.marks'), 'marks'],
        [Wallet, t('home.parent.fees'), 'fees'],
        [Umbrella, t('home.parent.leave'), 'leave'],
    ];
    return (
        <nav aria-label={t('parentHome.linksFor', { name: child.first_name })} className="relative z-10 flex flex-wrap gap-2">
            {links.map(([Icon, label, to]) => (
                <Link key={to} to={`/parent/child/${child.student_id}/${to}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunken px-3 type-small-semibold text-ink outline-none hover:bg-line-subtle focus-visible:ring-3 focus-visible:ring-focus/60">
                    <Icon size={15} aria-hidden />{label}
                </Link>
            ))}
        </nav>
    );
}

function Notices() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const q = useQuery({ queryKey: ['notices', 'home', 3], queryFn: () => noticesService.getNotices({ limit: 3 }), staleTime: 2 * 60 * 1000 });
    return (
        <Card className="gap-1">
            <CardHeader title={t('home.t.notices')} />
            {q.isPending ? <RowsSkeleton rows={3} /> : q.isError ? <InlineError title={t('home.t.noticesError')} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
                <p className="type-small text-muted">{t('parentHome.noNotices')}</p>
            ) : (
                <ul>
                    {q.data.slice(0, 3).map((n, i) => (
                        <ItemRow key={n.id} icon={Megaphone} tone={i === 0 ? 'brand' : 'neutral'} title={n.title} sub={df.relative(n.created_at)} />
                    ))}
                </ul>
            )}
        </Card>
    );
}

function NoChildren({ phone }: { phone: string | null }) {
    const { t } = useTranslation();
    const steps: [typeof Phone, string][] = [[Phone, t('parentHome.link.step1')], [Link2, t('parentHome.link.step2')], [ClipboardCheck, t('parentHome.link.step3')]];
    return (
        <>
            <EmptyState icon={Link2} title={t('parentHome.emptyTitle')}
                action={phone ? <a href={`tel:${phone}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 type-label text-on-primary outline-none hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-focus/60"><Phone size={16} aria-hidden />{t('parentHome.callSchool')}</a> : undefined}>
                {t('parentHome.emptyBody')}
            </EmptyState>
            <Card className="gap-2.5">
                <CardHeader title={t('parentHome.link.title')} />
                <ol className="flex flex-col gap-2.5">
                    {steps.map(([Icon, text]) => (
                        <li key={text} className="flex items-center gap-2.5 type-body text-ink-2">
                            <span className="grid size-[30px] shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary-text"><Icon size={16} aria-hidden /></span>{text}
                        </li>
                    ))}
                </ol>
            </Card>
        </>
    );
}

function HomeSkeleton() {
    return (
        <div role="status" className="flex flex-col gap-3.5">
            <Skeleton className="h-[220px] rounded-[20px]" />
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3"><Skeleton className="h-[110px]" /><Skeleton className="h-[110px]" /><Skeleton className="h-[110px] max-lg:hidden" /></div>
        </div>
    );
}
