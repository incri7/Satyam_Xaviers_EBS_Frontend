import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, CheckCircle2, ClipboardCheck, Loader2, RotateCw, Scale, X } from 'lucide-react';

import { Avatar, Badge, Banner, Button, Card, EmptyState, FilterChips, Skeleton, Tabs } from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { leavesService, type LeaveApplicantType, type LeaveStatus, type PendingLeaveRead } from '../../api/services/leaves.service';
import { leaveDays } from '../../features/leave/format';
import { errorText } from '../../features/people/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useUrlState } from '../../hooks/useUrlState';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';
import { LeaveBalances } from './LeaveBalances';

type Filter = 'all' | LeaveApplicantType;

/**
 * Figma G02 Leave requests and G03 Leave balances. Deciding leave and
 * setting how much exists are the same person's job, so they share a page.
 * Your own request never appears here: it goes to someone else.
 */
const LeaveApprovalsPage: React.FC = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const [tab, setTab] = useUrlState<'pending' | 'balances'>('tab', 'pending', { allowed: ['pending', 'balances'] });
    // Coordinators approve leave; how much leave exists is a contract decision.
    const canSetEntitlements = user?.role === 'admin' || user?.role === 'principal';
    const [filter, setFilter] = useState<Filter>('all');
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; title: string; body?: string } | null>(null);

    const { data, isPending, isError, refetch } = useQuery({ queryKey: ['leaves', 'pending'], queryFn: () => leavesService.getPendingLeaves() });
    const pending = (data ?? []).filter((l) => l.applicant_user_id !== user?.id);

    const decide = useMutation({
        mutationFn: ({ leave, status, substitute }: { leave: PendingLeaveRead; status: LeaveStatus; substitute: number | null }) =>
            leavesService.updateLeaveStatus(leave.id, { status, substitute_teacher_id: substitute ?? undefined }),
        onSuccess: (_r, { leave, status }) => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            setNotice({ tone: 'ok', title: t(status === 'approved' ? 'leavePage.req.approved' : 'leavePage.req.declined', { name: leave.applicant_name }) });
        },
        onError: (err) => setNotice({ tone: 'bad', title: t('leavePage.req.failed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const counts: Record<Filter, number> = { all: pending.length, teacher: 0, staff: 0, student: 0 };
    pending.forEach((l) => { counts[l.applicant_type] += 1; });
    const shown = pending.filter((l) => filter === 'all' || l.applicant_type === filter);

    const askDecline = (leave: PendingLeaveRead) => confirm({
        title: t('leavePage.req.declineTitle', { name: leave.applicant_name }),
        body: t('leavePage.req.declineBody'),
        confirmLabel: t('leavePage.req.decline'),
        onConfirm: () => decide.mutate({ leave, status: 'rejected', substitute: null }),
    });

    return (
        <AppPage title={t('leavePage.req.title')}>
            {confirmUI}
            <PageBar>
                <Tabs value={tab} onChange={(v) => setTab(v)} aria-label={t('leavePage.req.tabsLabel')}
                    items={[
                        { value: 'pending', label: t('leavePage.req.tab'), icon: ClipboardCheck, count: data ? formatCount(pending.length, lang) : undefined },
                        { value: 'balances', label: t('leavePage.bal.tab'), icon: Scale },
                    ]} />
            </PageBar>

            {tab === 'balances' ? <LeaveBalances canEdit={canSetEntitlements} /> : (
                <>
                    {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}
                    {pending.length > 0 && (
                        <FilterChips aria-label={t('leavePage.req.filter')} value={filter} onChange={setFilter}
                            items={(['all', 'teacher', 'staff', 'student'] as Filter[]).filter((f) => f === 'all' || f === filter || counts[f] > 0)
                                .map((f) => ({ value: f, label: t(`leavePage.req.who.${f}`), count: formatCount(counts[f], lang) }))} />
                    )}
                    {isPending ? (
                        <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-[220px] rounded-card" />)}</div>
                    ) : isError ? (
                        <Card><EmptyState icon={AlertCircle} tone="bad" title={t('home.coordinator.loadFailed')}
                            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>{t('peoplePage.error.body')}</EmptyState></Card>
                    ) : shown.length === 0 ? (
                        <Card><EmptyState icon={CheckCircle2} title={t('leavePage.req.allClear')}>{t('leavePage.req.allClearBody')}</EmptyState></Card>
                    ) : (
                        <ul className="grid gap-3.5 xl:grid-cols-2">
                            {shown.map((leave) => (
                                <li key={leave.id}>
                                    <RequestCard leave={leave} busy={decide.isPending && decide.variables?.leave.id === leave.id}
                                        onApprove={(substitute) => decide.mutate({ leave, status: 'approved', substitute })} onDecline={() => askDecline(leave)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </AppPage>
    );
};

/** Figma G02 request card: who, what, when, why, a substitute, and the decision. */
function RequestCard({ leave, busy, onApprove, onDecline }: {
    leave: PendingLeaveRead;
    busy: boolean;
    onApprove: (substitute: number | null) => void;
    onDecline: () => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const [substitute, setSubstitute] = useState<number | null>(null);
    const isTeacher = leave.applicant_type === 'teacher';
    const { data: subs, isPending: loadingSubs } = useQuery({
        queryKey: ['leaves', leave.id, 'substitutes'],
        queryFn: () => leavesService.getSuggestedSubstitutes(leave.id),
        enabled: isTeacher,
    });
    const days = leaveDays(leave.start_date, leave.end_date);
    const dates = leave.start_date === leave.end_date ? df.date(leave.start_date) : t('leavePage.range', { from: df.date(leave.start_date), to: df.date(leave.end_date) });

    return (
        <Card className="h-full gap-3.5">
            <div className="flex items-start gap-3">
                <Avatar name={leave.applicant_name} size={42} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate type-body-semibold text-ink">{leave.applicant_name}</p>
                    <p className="type-caption text-muted">{t(`leavePage.req.one.${leave.applicant_type}`)}</p>
                </div>
                <Badge tone="brand">{t(`leavePage.type.${leave.leave_type}`)}</Badge>
            </div>
            <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-row bg-surface-2 p-3">
                <div className="flex min-w-0 flex-col"><dt className="type-caption text-muted">{t('leavePage.req.dates')}</dt><dd className="type-small-semibold text-ink">{dates}</dd></div>
                <div className="flex flex-col"><dt className="type-caption text-muted">{t('leavePage.req.days')}</dt><dd className="type-small-semibold tabular-nums text-ink">{formatCount(days, lang)}</dd></div>
                <div className="flex flex-col"><dt className="type-caption text-muted">{t('leavePage.req.sent')}</dt><dd className="type-small-semibold text-ink">{df.relative(leave.created_at)}</dd></div>
            </dl>
            {leave.reason && <p className="type-small text-ink-2">{leave.reason}</p>}

            {isTeacher ? (
                <div className="flex flex-col gap-2">
                    <p className="type-small-semibold text-ink">{t('leavePage.req.substitute')}</p>
                    {loadingSubs ? (
                        <p className="flex items-center gap-2 type-caption text-muted"><Loader2 size={14} className="animate-spin" aria-hidden />{t('home.coordinator.loadingSuggestions')}</p>
                    ) : !subs?.length ? (
                        <p className="type-caption text-muted">{t('home.coordinator.noSubstitutes')}</p>
                    ) : (
                        <div role="radiogroup" aria-label={t('leavePage.req.substitute')} className="flex flex-col gap-1.5">
                            {subs.slice(0, 4).map((s) => {
                                const on = substitute === s.teacher_id;
                                return (
                                    <button key={s.teacher_id} type="button" role="radio" aria-checked={on} onClick={() => setSubstitute(on ? null : s.teacher_id)}
                                        className={cn('flex items-center gap-3 rounded-row border-[1.5px] px-3 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                            on ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-surface-2')}>
                                        <Avatar name={s.name} size={30} />
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate type-small-semibold text-ink">{s.name}</span>
                                            <span className="truncate type-caption text-muted">
                                                {s.shared_subjects.length ? t('leavePage.req.teaches', { list: s.shared_subjects.slice(0, 3).join(', ') }) : s.designation ?? t('leavePage.req.freeThen')}
                                            </span>
                                        </span>
                                        {on && <Check size={16} className="shrink-0 text-primary-text" aria-hidden />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : leave.applicant_type === 'staff' && <p className="type-caption text-muted">{t('leavePage.req.noSubNeeded')}</p>}

            <div className="mt-auto flex justify-end gap-2 border-t border-line-subtle pt-3">
                <Button variant="quiet" leftIcon={X} disabled={busy} onClick={onDecline}>{t('leavePage.req.decline')}</Button>
                <Button variant="success" leftIcon={Check} loading={busy} onClick={() => onApprove(substitute)}>
                    {substitute ? t('leavePage.req.approveWith') : t('home.coordinator.approve')}
                </Button>
            </div>
        </Card>
    );
}

export default LeaveApprovalsPage;
