import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarPlus, Scale } from 'lucide-react';

import {
    Badge, Banner, Button, Card, CardHeader, EmptyState, FilterChips, FormRow, ListCard, ListRow, Person, SearchField, SegmentedControl,
    SelectField, Table, TableCard, TableMessage, TableSkeletonRows, TextField, THead, Td, Th, Tr,
} from '../../design-system';
import { leavesService, type StaffLeaveBalanceRow } from '../../api/services/leaves.service';
import { COUNTED } from '../../features/leave/format';
import { errorText } from '../../features/people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

const ROLES = ['teacher', 'staff', 'coordinator', 'principal', 'accountant', 'admin'] as const;
const GENDERS = ['F', 'M', 'O'] as const;
type Show = 'all' | 'unset';

/** Share of the year's leave still left, across the counted types. Lowest first. */
const leftShare = (r: StaffLeaveBalanceRow) => {
    const total = r.casual_total + r.sick_total + r.earned_total;
    const used = r.casual_used + r.sick_used + r.earned_used;
    return total ? (total - used) / total : 1;
};

/**
 * Figma G03 Leave balances: what everyone has left this year, lowest first,
 * and a form to set entitlements for a group. A contract belongs to a role
 * and maternity to a gender, so entitlements are set per group, not per
 * person. People with no entitlement are flagged: leave approved for them
 * comes off nothing and their balance stays at zero.
 */
export const LeaveBalances: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const thisYear = new Date().getFullYear();
    const [year, setYear] = useState(thisYear);
    const [search, setSearch] = useState('');
    const [show, setShow] = useState<Show>('all');
    const [role, setRole] = useState('');
    const [gender, setGender] = useState('');
    const [days, setDays] = useState<Record<string, string>>({});
    const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; title: string; body?: string } | null>(null);

    const { data: all, isPending, isError } = useQuery({
        queryKey: ['leave-balances', year],
        queryFn: () => leavesService.listLeaveBalances({ year }),
        placeholderData: keepPreviousData,
    });
    // Only to say how many people a grant would touch.
    const { data: target } = useQuery({
        queryKey: ['leave-balances', year, role, gender],
        queryFn: () => leavesService.listLeaveBalances({ year, role: role || undefined, gender: gender || undefined }),
        enabled: canEdit,
        placeholderData: keepPreviousData,
    });
    const { data: defaults } = useQuery({ queryKey: ['leave-entitlement-defaults'], queryFn: leavesService.getEntitlementDefaults, staleTime: 5 * 60 * 1000 });

    const field = (k: string) => `${k}_total` as const;
    const dayValue = (k: string) => days[field(k)] ?? String((defaults as Record<string, number> | undefined)?.[field(k)] ?? 0);
    const grant = useMutation({
        mutationFn: () => leavesService.grantLeaveEntitlement({
            year,
            role: role || undefined,
            gender: gender || undefined,
            // Setting terms for a group replaces them, or a policy change would miss everyone it already covered.
            overwrite_existing: true,
            ...Object.fromEntries(Object.entries(days).map(([k, v]) => [k, Number(v) || 0])),
        }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            setNotice({ tone: 'ok', title: t('leaveBalances.applied', { count: res.created + res.updated, year: res.year }) });
        },
        onError: (err) => setNotice({ tone: 'bad', title: t('leavePage.bal.failed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (all?.rows ?? [])
            .filter((r) => (show === 'unset' ? !r.configured : true))
            .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q))
            .sort((a, b) => Number(a.configured) - Number(b.configured) || leftShare(a) - leftShare(b) || a.name.localeCompare(b.name));
    }, [all, search, show]);
    const unset = all?.unconfigured_count ?? 0;
    const wouldTouch = target?.total_count ?? 0;

    const genderLabel = (g: string | null) => t(g === 'F' ? 'leaveBalances.female' : g === 'M' ? 'leaveBalances.male' : g ? 'leaveBalances.otherGender' : 'leaveBalances.genderUnknown');
    const who = (r: StaffLeaveBalanceRow) => `${t(`leavePage.bal.role.${r.role}`, { defaultValue: r.role })}, ${genderLabel(r.gender).toLowerCase()}`;
    const cell = (r: StaffLeaveBalanceRow, k: (typeof COUNTED)[number]) => {
        const total = r[`${k}_total`];
        const left = total - r[`${k}_used`];
        if (!total) return <span className="text-muted">—</span>;
        return (
            <span className="flex items-baseline justify-end gap-1 tabular-nums">
                <span className={cn('type-small-semibold', left <= 0 ? 'text-bad' : left / total < 0.25 ? 'text-warn' : 'text-ink')}>{formatCount(left, lang)}</span>
                <span className="type-caption text-muted">/ {formatCount(total, lang)}</span>
            </span>
        );
    };
    const typeLabel = (k: string) => t(`leavePage.type.${k}`);
    const title = t('leavePage.bal.left', { year });

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
                <SegmentedControl size="sm" value={String(year)} onChange={(v) => setYear(Number(v))} aria-label={t('leaveBalances.year')}
                    options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) }))} />
                <SearchField value={search} onChange={setSearch} placeholder={t('leavePage.bal.search')} clearLabel={t('common.clear')} containerClassName="md:w-[260px]" />
            </div>
            {notice && <Banner tone={notice.tone} title={notice.title}>{notice.body}</Banner>}
            {unset > 0 && (
                <Banner tone="warn" icon={AlertTriangle} title={t('leaveBalances.missingWarning', { count: unset })}
                    action={show === 'all' ? <Button variant="quiet" size="sm" onClick={() => setShow('unset')}>{t('leavePage.bal.showThem')}</Button> : undefined} />
            )}

            <div className={cn('grid min-w-0 gap-4 lg:items-start', canEdit && 'lg:grid-cols-[minmax(0,1fr)_360px]')}>
                <div className="flex min-w-0 flex-col gap-2.5">
                    {unset > 0 && (
                        <FilterChips aria-label={t('leavePage.bal.who')} value={show} onChange={setShow}
                            items={[{ value: 'all' as Show, label: t('financePage.expenses.all'), count: formatCount(all?.total_count ?? 0, lang) }, { value: 'unset' as Show, label: t('leavePage.bal.notSet'), count: formatCount(unset, lang) }]} />
                    )}
                    <TableCard className="max-md:hidden" title={title} subtitle={t('leavePage.bal.sub')}>
                        <Table aria-label={title}>
                            <THead>
                                <Th>{t('leavePage.bal.staff')}</Th>
                                {COUNTED.map((k) => <Th key={k} className="text-right">{typeLabel(k)}</Th>)}
                            </THead>
                            <tbody>
                                {isPending ? <TableSkeletonRows columns={5} /> : isError ? (
                                    <TableMessage columns={5}><EmptyState icon={AlertTriangle} tone="bad" title={t('peoplePage.error.title')}>{t('peoplePage.error.body')}</EmptyState></TableMessage>
                                ) : rows.length === 0 ? (
                                    <TableMessage columns={5}><EmptyState icon={Scale} title={search ? t('peoplePage.empty.filtered') : t('leaveBalances.nothingSet', { year })} /></TableMessage>
                                ) : rows.map((r) => (
                                    <Tr key={r.user_id}>
                                        <Td><Person name={r.name} sub={who(r)} /></Td>
                                        {r.configured ? COUNTED.map((k) => <Td key={k} className="text-right">{cell(r, k)}</Td>) : (
                                            <Td colSpan={4} className="text-right"><Badge tone="warn" dot>{t('leavePage.bal.notSet')}</Badge></Td>
                                        )}
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableCard>
                    <ListCard className="md:hidden">
                        {rows.map((r) => (
                            <ListRow key={r.user_id}>
                                <span className="min-w-0 flex-1"><Person name={r.name} sub={who(r)} size={36} /></span>
                                {r.configured ? (
                                    <span className="flex shrink-0 flex-col items-end gap-0.5 type-caption text-muted">
                                        {COUNTED.slice(0, 3).map((k) => <span key={k} className="flex gap-1.5">{typeLabel(k)} {cell(r, k)}</span>)}
                                    </span>
                                ) : <Badge tone="warn" dot>{t('leavePage.bal.notSet')}</Badge>}
                            </ListRow>
                        ))}
                    </ListCard>
                </div>

                {canEdit && (
                    <Card className="gap-4 lg:sticky lg:top-0">
                        <CardHeader title={t('leaveBalances.setTitle')} subtitle={t('leavePage.bal.setSub', { year })} />
                        <FormRow>
                            <SelectField label={t('leaveBalances.role')} value={role} onChange={(e) => setRole(e.target.value)}
                                options={[{ value: '', label: t('leaveBalances.allRoles') }, ...ROLES.map((r) => ({ value: r, label: t(`leavePage.bal.role.${r}`) }))]} />
                            <SelectField label={t('leaveBalances.gender')} value={gender} onChange={(e) => setGender(e.target.value)}
                                options={[{ value: '', label: t('leaveBalances.allGenders') }, ...GENDERS.map((g) => ({ value: g, label: genderLabel(g) }))]} />
                        </FormRow>
                        <p className="type-small text-ink-2">{t('leavePage.bal.match', { count: wouldTouch, n: formatCount(wouldTouch, lang) })}</p>
                        {gender && (target?.unknown_gender_count ?? 0) > 0 && (
                            <p className="type-caption text-warn">{t('leaveBalances.unknownGender', { count: target!.unknown_gender_count })}</p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            {COUNTED.map((k) => (
                                <TextField key={k} label={typeLabel(k)} inputMode="numeric" value={dayValue(k)}
                                    onChange={(e) => setDays((p) => ({ ...p, [field(k)]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                                    endAdornment={<span className="type-small text-muted">{t('leavePage.bal.days')}</span>} />
                            ))}
                        </div>
                        <Button leftIcon={CalendarPlus} loading={grant.isPending} disabled={wouldTouch === 0} onClick={() => grant.mutate()}>
                            {t('leaveBalances.applyTo', { count: wouldTouch })}
                        </Button>
                        <p className="type-caption text-muted">{t('leaveBalances.setNote')}</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default LeaveBalances;
