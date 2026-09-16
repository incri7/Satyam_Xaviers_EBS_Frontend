import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, CalendarPlus, ChevronDown } from 'lucide-react';
import { leavesService, type StaffLeaveBalanceRow } from '../../api/services/leaves.service';
import { cn } from '../../utils/cn';

/**
 * Leave entitlements, set the way the school actually decides them.
 *
 * The first version listed all thirty-two accounts with five editable columns
 * each. But nobody sets leave one person at a time — a contract belongs to a
 * role, and maternity belongs to a gender. Listing every account made the page
 * a register to scroll rather than a decision to make.
 *
 * So the unit here is the group: this many people, of this role and gender,
 * get these days. The summary is the same shape as the form that fills it.
 *
 * Per-person entitlement is still reachable on the API (PUT
 * /leaves/balances/{user_id}) for the one-off contract that does not fit a
 * role, but it is deliberately not on screen — it was the thing making this
 * page dense, and it is not how leave gets decided here.
 */

const ROLES = ['teacher', 'staff', 'coordinator', 'principal', 'accountant', 'admin'] as const;
const GENDERS = [
    { value: 'F', key: 'female' },
    { value: 'M', key: 'male' },
    { value: 'O', key: 'otherGender' },
] as const;

const DAY_FIELDS = [
    { key: 'casual', field: 'casual_total' },
    { key: 'sick', field: 'sick_total' },
    { key: 'earned', field: 'earned_total' },
    { key: 'maternity', field: 'maternity_total' },
] as const;

/** One line of the summary: everyone currently on identical terms. */
interface Group {
    role: string;
    gender: string | null;
    people: number;
    casual: number;
    sick: number;
    earned: number;
    maternity: number;
}

const groupRows = (rows: StaffLeaveBalanceRow[]): Group[] => {
    const byTerms = new Map<string, Group>();
    for (const r of rows) {
        // The unconfigured have no terms to group by; they are counted
        // separately so they are chased rather than averaged away.
        if (!r.configured) continue;
        const key = [r.role, r.gender ?? '-', r.casual_total, r.sick_total,
                     r.earned_total, r.maternity_total].join('|');
        const found = byTerms.get(key);
        if (found) {
            found.people += 1;
        } else {
            byTerms.set(key, {
                role: r.role, gender: r.gender, people: 1,
                casual: r.casual_total, sick: r.sick_total,
                earned: r.earned_total, maternity: r.maternity_total,
            });
        }
    }
    return [...byTerms.values()].sort(
        (a, b) => a.role.localeCompare(b.role) || (a.gender ?? '').localeCompare(b.gender ?? ''),
    );
};

export const LeaveBalances: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const thisYear = new Date().getFullYear();

    const [year, setYear] = useState(thisYear);
    const [role, setRole] = useState('');
    const [gender, setGender] = useState('');
    const [days, setDays] = useState<Record<string, number>>({});
    const [feedback, setFeedback] = useState('');

    // Everyone, unfiltered — the summary describes the whole school.
    const { data: all, isLoading } = useQuery({
        queryKey: ['leave-balances', year],
        queryFn: () => leavesService.listLeaveBalances({ year }),
        placeholderData: keepPreviousData,
    });

    // The filtered set exists only to say how many the grant would touch, so
    // the button states a real number instead of "apply".
    const { data: target } = useQuery({
        queryKey: ['leave-balances', year, role, gender],
        queryFn: () => leavesService.listLeaveBalances({
            year, role: role || undefined, gender: gender || undefined,
        }),
        enabled: canEdit,
        placeholderData: keepPreviousData,
    });

    const { data: defaults } = useQuery({
        queryKey: ['leave-entitlement-defaults'],
        queryFn: leavesService.getEntitlementDefaults,
        staleTime: 5 * 60 * 1000,
    });

    const grant = useMutation({
        mutationFn: () => leavesService.grantLeaveEntitlement({
            year,
            role: role || undefined,
            gender: gender || undefined,
            // Setting terms for a group means setting them, not only filling
            // the gaps — otherwise changing a policy would miss everyone it
            // already applied to.
            overwrite_existing: true,
            ...days,
        }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            setFeedback(t('leaveBalances.applied', {
                count: res.created + res.updated, year: res.year,
            }));
            setTimeout(() => setFeedback(''), 6000);
        },
    });

    const groups = useMemo(() => groupRows(all?.rows ?? []), [all]);
    const missing = all?.unconfigured_count ?? 0;
    const wouldTouch = target?.total_count ?? 0;
    const unknownGender = target?.unknown_gender_count ?? 0;

    const dayValue = (f: string) => days[f] ?? (defaults ? (defaults as any)[f] : 0) ?? 0;
    const genderLabel = (g: string | null) =>
        g ? t('leaveBalances.' + (GENDERS.find((x) => x.value === g)?.key ?? 'otherGender'))
          : t('leaveBalances.genderUnknown');

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('leaveBalances.year')}
                </span>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors',
                                year === y ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            {feedback && (
                <div className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
                    {feedback}
                </div>
            )}

            {/* Nobody notices a missing entitlement on their own: the leave is
                approved, the balance stays at zero, and nothing errors. */}
            {missing > 0 && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm font-bold">{t('leaveBalances.missingWarning', { count: missing })}</p>
                </div>
            )}

            {canEdit && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-900">{t('leaveBalances.setTitle')}</h3>
                        <p className="text-sm font-medium text-slate-500">{t('leaveBalances.setExplain')}</p>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {t('leaveBalances.role')}
                            </span>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="pl-3 pr-9 py-2.5 bg-slate-50 rounded-xl text-sm font-medium capitalize appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">{t('leaveBalances.allRoles')}</option>
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {t('leaveBalances.gender')}
                            </span>
                            <div className="relative">
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="pl-3 pr-9 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">{t('leaveBalances.allGenders')}</option>
                                    {GENDERS.map((g) => (
                                        <option key={g.value} value={g.value}>{t('leaveBalances.' + g.key)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </label>

                        <span className="h-10 w-px bg-slate-100 hidden md:block" />

                        {DAY_FIELDS.map(({ key, field }) => (
                            <label key={field} className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {t('profile.leaveType.' + key, key)}
                                </span>
                                <input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={dayValue(field)}
                                    onChange={(e) => setDays((p) => ({ ...p, [field]: Number(e.target.value) }))}
                                    className="w-20 px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-brand/20"
                                />
                            </label>
                        ))}
                    </div>

                    {/* Gender lives on the Teacher/Staff profile, so anyone without
                        one matches no gender and would be skipped unannounced. */}
                    {gender && unknownGender > 0 && (
                        <p className="text-xs font-bold text-amber-700">
                            {t('leaveBalances.unknownGender', { count: unknownGender })}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => grant.mutate()}
                            disabled={grant.isPending || wouldTouch === 0}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold text-sm rounded-xl shadow-lg shadow-brand/20 hover:opacity-95 disabled:opacity-50"
                        >
                            {grant.isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CalendarPlus className="w-4 h-4" />}
                            {t('leaveBalances.applyTo', { count: wouldTouch })}
                        </button>
                        <p className="text-xs font-medium text-slate-400">
                            {t('leaveBalances.setNote')}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">
                        {t('leaveBalances.currentTitle', { year })}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {[t('leaveBalances.role'), t('leaveBalances.gender')].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        {h}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('leaveBalances.people')}
                                </th>
                                {DAY_FIELDS.map(({ key }) => (
                                    <th key={key} className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        {t('profile.leaveType.' + key, key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={7} className="px-4 py-3">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : groups.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-14 text-center text-sm font-medium text-slate-400">
                                        {t('leaveBalances.nothingSet', { year })}
                                    </td>
                                </tr>
                            ) : groups.map((g) => (
                                <tr
                                    key={[g.role, g.gender, g.casual, g.sick, g.earned, g.maternity].join('|')}
                                    className="hover:bg-slate-50/70 transition-colors"
                                >
                                    <td className="px-4 py-2.5 text-sm font-bold text-slate-800 capitalize">{g.role}</td>
                                    <td className="px-4 py-2.5 text-sm font-medium text-slate-600">
                                        {genderLabel(g.gender)}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm font-black text-slate-900 text-right tabular-nums">
                                        {g.people}
                                    </td>
                                    {(['casual', 'sick', 'earned', 'maternity'] as const).map((k) => (
                                        <td key={k} className={cn(
                                            'px-3 py-2.5 text-sm text-right tabular-nums',
                                            g[k] === 0 ? 'text-slate-300' : 'font-bold text-slate-700',
                                        )}>
                                            {g[k]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs font-medium text-slate-400 px-1">{t('leaveBalances.groupNote')}</p>
        </div>
    );
};

export default LeaveBalances;
