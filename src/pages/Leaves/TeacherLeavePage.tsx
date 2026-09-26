import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarPlus, Plane, RotateCw, Send } from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, EmptyState, FilterChips, FormRow, Meter, SegmentedControl, Skeleton, TextAreaField, TextField } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { leavesService, type LeaveRead, type LeaveStatus, type LeaveType } from '../../api/services/leaves.service';
import { COUNTED, LEAVE_TYPES, LIMITED, STATUS_TONE, leaveDays, remaining } from '../../features/leave/format';
import { errorText } from '../../features/people/format';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';

type Filter = 'all' | LeaveStatus;

/**
 * Figma G01 My leave: what is left this year, a request form, and the
 * history of requests. Every staff role files leave here; a teacher files
 * against their teacher record, everyone else against their account.
 */
const TeacherLeavePage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const applicantType = user?.role === 'teacher' ? 'teacher' : 'staff';
    // The list shows admin and principal everyone's leave; this page is theirs only.
    const seesAll = user?.role === 'admin' || user?.role === 'principal';

    const [type, setType] = useState<LeaveType>('casual');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [reason, setReason] = useState('');
    const [tried, setTried] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; title: string; body?: string } | null>(null);
    const [filter, setFilter] = useState<Filter>('all');

    const balance = useQuery({ queryKey: ['leaves', 'my-balance'], queryFn: () => leavesService.getMyBalance() });
    const history = useQuery({ queryKey: ['leaves', 'my-history'], queryFn: () => leavesService.listLeaves({ limit: 200 }) });

    const mine: LeaveRead[] = (history.data?.leaves ?? [])
        .filter((l) => !seesAll || l.applicant_user_id === user?.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const shown = mine.filter((l) => filter === 'all' || l.status === filter);
    const days = leaveDays(from, to);
    const left = remaining(balance.data, type);
    const after = left ? left.left - days : null;
    // Casual and sick leave cannot go past what is left; the server refuses it.
    const blocked = after != null && after < 0 && LIMITED.includes(type);
    const datesOk = !!from && !!to && to >= from;

    const submit = useMutation({
        mutationFn: () => leavesService.submitLeave({ applicant_type: applicantType, leave_type: type, start_date: from, end_date: to, reason: reason.trim() || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            setFrom(''); setTo(''); setReason(''); setTried(false);
            setNotice({ tone: 'ok', title: t('leavePage.mine.sent'), body: t('leavePage.mine.sentBody') });
        },
        onError: (err) => setNotice({ tone: 'bad', title: t('leavePage.mine.failed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const send = () => {
        setTried(true);
        setNotice(null);
        if (!datesOk || blocked) return;
        submit.mutate();
    };

    const typeLabel = (k: LeaveType) => t(`leavePage.type.${k}`);
    const range = (l: LeaveRead) => (l.start_date === l.end_date ? df.date(l.start_date) : t('leavePage.range', { from: df.date(l.start_date), to: df.date(l.end_date) }));
    const counts: Record<Filter, number> = { all: mine.length, pending: 0, approved: 0, rejected: 0 };
    mine.forEach((l) => { counts[l.status] += 1; });

    return (
        <AppPage title={t('leavePage.mine.title')}>
            {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}

            {/* What is left this year, per type */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                {balance.isPending ? COUNTED.map((k) => <Skeleton key={k} className="h-[118px] rounded-card" />)
                    : balance.isError ? (
                        <Card className="col-span-full"><EmptyState icon={AlertCircle} tone="bad" title={t('leavePage.mine.balanceError')}
                            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void balance.refetch()}>{t('classesPage.action.retry')}</Button>} /></Card>
                    ) : COUNTED.filter((k) => k !== 'maternity' || balance.data!.maternity_total > 0).map((k) => {
                        const b = remaining(balance.data, k)!;
                        const used = b.total - b.left;
                        return (
                            <div key={k} className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface p-3.5 shadow-e1 lg:px-[18px] lg:py-4">
                                <p className="type-small-medium text-ink-2">{typeLabel(k)}</p>
                                <p className="flex items-baseline gap-1.5">
                                    <span className="type-figure-m tabular-nums text-ink">{formatCount(b.left, lang)}</span>
                                    <span className="type-small text-muted">{t('leavePage.mine.ofLeft', { n: formatCount(b.total, lang) })}</span>
                                </p>
                                <Meter value={b.total ? b.left / b.total : 0} tone={b.total && b.left / b.total < 0.25 ? 'warn' : 'brand'} label={typeLabel(k)} />
                                <p className="type-caption text-muted">{b.total === 0 ? t('leavePage.mine.none') : t('leavePage.mine.used', { n: formatCount(used, lang) })}</p>
                            </div>
                        );
                    })}
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <Card className="gap-4">
                    <CardHeader title={t('leavePage.mine.ask')} subtitle={t('leavePage.mine.askSub')} />
                    <div className="flex flex-col gap-2">
                        <p className="type-small-semibold text-ink">{t('leavePage.mine.type')}</p>
                        <div className="max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:[scrollbar-width:none]">
                            <SegmentedControl options={LEAVE_TYPES.map((k) => ({ value: k, label: typeLabel(k) }))} value={type} onChange={setType}
                                aria-label={t('leavePage.mine.type')} className="w-max sm:flex sm:w-full sm:[&>*]:flex-1" />
                        </div>
                    </div>
                    <FormRow>
                        <TextField label={t('leaves.from')} type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to && e.target.value > to) setTo(e.target.value); }}
                            hint={from ? df.date(from, 'long') : undefined} error={tried && !from ? t('leavePage.mine.pickFrom') : undefined} />
                        <TextField label={t('leaves.to')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                            hint={to ? df.date(to, 'long') : undefined} error={tried && (!to || (from && to < from)) ? t('leavePage.mine.pickTo') : undefined} />
                    </FormRow>
                    {days > 0 && (
                        <Banner tone={blocked ? 'bad' : after != null && after < 0 ? 'warn' : 'info'} icon={CalendarPlus}
                            title={t('leavePage.mine.days', { count: days, n: formatCount(days, lang) })}>
                            {after == null ? t('leavePage.mine.unpaidNote')
                                : after < 0 ? t(blocked ? 'leavePage.mine.overLimit' : 'leavePage.mine.over', { type: typeLabel(type), n: formatCount(-after, lang), left: formatCount(left!.left, lang) })
                                    : t('leavePage.mine.after', { type: typeLabel(type), n: formatCount(after, lang), of: formatCount(left!.total, lang) })}
                        </Banner>
                    )}
                    <TextAreaField label={t('leavePage.mine.reason')} optional={t('peopleForms.optional')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder={t('leaves.reasonPlaceholder')} />
                    <div className="flex flex-wrap justify-end gap-2">
                        {(from || to || reason) && <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setReason(''); setTried(false); }}>{t('leavePage.mine.clear')}</Button>}
                        <Button leftIcon={Send} loading={submit.isPending} disabled={blocked} onClick={send}>{t('leavePage.mine.send')}</Button>
                    </div>
                </Card>

                <Card className="gap-3">
                    <CardHeader title={t('leavePage.mine.history')} subtitle={t('leavePage.mine.historySub')} />
                    {mine.length > 0 && (
                        <FilterChips aria-label={t('leavePage.mine.history')} value={filter} onChange={setFilter}
                            items={(['all', 'pending', 'approved', 'rejected'] as Filter[]).filter((f) => f === 'all' || f === filter || counts[f] > 0)
                                .map((f) => ({ value: f, label: f === 'all' ? t('financePage.expenses.all') : t(`leavePage.status.${f}`), count: formatCount(counts[f], lang) }))} />
                    )}
                    {history.isPending ? (
                        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                    ) : history.isError ? (
                        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void history.refetch()}>{t('classesPage.action.retry')}</Button>} />
                    ) : shown.length === 0 ? (
                        <EmptyState icon={Plane} title={t('leaves.noLeaves')}>{t('leavePage.mine.noneBody')}</EmptyState>
                    ) : (
                        <ul className="flex flex-col divide-y divide-line-subtle">
                            {shown.map((l) => {
                                const n = l.days ?? leaveDays(l.start_date, l.end_date);
                                return (
                                    <li key={l.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="type-small-semibold text-ink">{t('leavePage.mine.row', { type: typeLabel(l.leave_type), count: n, n: formatCount(n, lang) })}</span>
                                            <span className="type-caption text-ink-2">{range(l)}{l.reason ? `. ${l.reason}` : ''}</span>
                                            <span className="type-caption text-muted">
                                                {l.status === 'pending' ? t('leavePage.mine.sentOn', { when: df.relative(l.created_at) }) : l.decided_at ? t('leavePage.mine.decidedOn', { when: df.date(l.decided_at) }) : ''}
                                            </span>
                                        </span>
                                        <Badge tone={STATUS_TONE[l.status]} dot>{t(`leavePage.status.${l.status}`)}</Badge>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
        </AppPage>
    );
};

export default TeacherLeavePage;
