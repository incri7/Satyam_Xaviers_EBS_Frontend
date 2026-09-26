import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Award, Plus, RotateCw, Trash2 } from 'lucide-react';

import { ActionMenu, Badge, Button, Card, CardHeader, EmptyState, Skeleton, type BadgeTone } from '../../design-system';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { financesService } from '../../api/services/finances.service';
import { StudentPicker } from '../../features/people/StudentPicker';
import { ApplyScholarshipDialog } from '../../features/finance/ApplyScholarshipDialog';
import { decodeReason } from '../../features/finance/format';
import { useFeeStructures } from '../../features/finance/queries';
import { useNotice } from '../../features/people/useNotice';
import { errorText, fullName } from '../../features/people/format';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import type { FeeDiscount } from '../../types/finance';
import type { Student } from '../../types/people';

/**
 * Figma E06 Scholarships, adapted: the API lists scholarships per student
 * (there is no school-wide list), so the tab looks one student up and
 * shows theirs. Applying one opens H04 with that student already picked.
 */
export function DiscountManagement({ applying, setApplying }: { applying: boolean; setApplying: (open: boolean) => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const titleId = useId();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [student, setStudent] = useState<Student | null>(null);
    const fees = useFeeStructures(false);

    const discounts = useQuery({
        queryKey: ['discounts', student?.id],
        queryFn: () => financesService.getStudentDiscounts(student!.id),
        enabled: !!student,
    });
    const remove = useMutation({
        mutationFn: financesService.deleteDiscount,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); queryClient.invalidateQueries({ queryKey: ['finances', 'outstanding'] }); },
        onError: (err) => notify({ tone: 'bad', title: t('financePage.scholarships.removeFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const today = isoLocal(new Date());
    const day = (v?: string) => (v ? v.slice(0, 10) : '');
    const status = (d: FeeDiscount): { tone: BadgeTone; label: string } => {
        const from = day(d.valid_from);
        const to = day(d.valid_to);
        if (from && from > today) return { tone: 'info', label: t('financePage.scholarships.starts', { date: df.date(from) }) };
        if (to && to < today) return { tone: 'neutral', label: t('financePage.scholarships.ended') };
        return { tone: 'ok', label: t('financePage.scholarships.active') };
    };
    const feeOf = (d: FeeDiscount) => fees.data?.find((f) => f.id === d.fee_structure_id);
    const valueText = (d: FeeDiscount) => {
        if (d.is_percent) return `${formatCount(Number(d.value), lang)}%`;
        const fee = feeOf(d);
        return `${formatRs(d.value, lang)}${fee ? ` ${t(`financePage.scholarships.per.${fee.frequency}`)}` : ''}`;
    };
    const dates = (d: FeeDiscount) => {
        const from = day(d.valid_from);
        const to = day(d.valid_to);
        if (from && to) return t('financePage.scholarships.range', { from: df.date(from), to: df.date(to) });
        if (from) return t('financePage.scholarships.fromOnly', { from: df.date(from) });
        if (to) return t('financePage.scholarships.untilOnly', { to: df.date(to) });
        return t('financePage.scholarships.always');
    };
    const askRemove = (d: FeeDiscount) =>
        confirm({
            title: t('financePage.scholarships.removeTitle'),
            body: t('financePage.scholarships.removeBody', { value: valueText(d), fee: feeOf(d)?.name ?? `#${d.fee_structure_id}` }),
            confirmLabel: t('financePage.scholarships.remove'),
            onConfirm: () => remove.mutate(d.id),
        });

    const list = discounts.data ?? [];

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}
            <p className="type-small text-muted">{t('financePage.scholarships.intro')}</p>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                <Card className="gap-3">
                    <StudentPicker label={t('financePage.scholarships.lookUp')} value={student} onChange={setStudent} />
                </Card>

                <Card aria-labelledby={titleId} className="gap-3">
                    {!student ? (
                        <EmptyState icon={Award} title={t('financePage.scholarships.pickTitle')}>{t('financePage.scholarships.pickBody')}</EmptyState>
                    ) : (
                        <>
                            <CardHeader titleId={titleId} title={fullName(student)}
                                subtitle={discounts.data ? t('financePage.scholarships.count', { count: list.length, n: formatCount(list.length, lang) }) : student.admission_no}
                                action={can('finances', 'create') && <Button variant="quiet" size="sm" leftIcon={Plus} onClick={() => setApplying(true)}>{t('financePage.scholarships.apply')}</Button>} />
                            {discounts.isPending ? (
                                <div className="flex flex-col gap-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
                            ) : discounts.isError ? (
                                <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void discounts.refetch()}>{t('classesPage.action.retry')}</Button>}>
                                    {t('peoplePage.error.body')}
                                </EmptyState>
                            ) : list.length === 0 ? (
                                <EmptyState icon={Award} title={t('financePage.scholarships.none')}>{t('financePage.scholarships.noneBody')}</EmptyState>
                            ) : (
                                <ul className="flex flex-col divide-y divide-line-subtle">
                                    {list.map((d) => {
                                        const { type, reason } = decodeReason(d.reason);
                                        const s = status(d);
                                        return (
                                            <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                                    <span className="flex flex-wrap items-center gap-2 type-small-semibold text-ink">
                                                        {feeOf(d)?.name ?? `#${d.fee_structure_id}`}
                                                        {type && <Badge tone="brand">{t(`financePage.scholarships.types.${type}`)}</Badge>}
                                                    </span>
                                                    {reason && <span className="type-small text-ink-2">{reason}</span>}
                                                    <span className="type-caption text-muted">{dates(d)}</span>
                                                </span>
                                                <span className="flex shrink-0 flex-col items-end gap-1">
                                                    <span className="type-body-semibold tabular-nums text-ink">{valueText(d)}</span>
                                                    <Badge tone={s.tone} dot>{s.label}</Badge>
                                                </span>
                                                <ActionMenu label={t('financePage.payments.more')} items={[
                                                    { label: t('financePage.scholarships.remove'), icon: Trash2, tone: 'bad', onSelect: () => askRemove(d), hidden: !can('finances', 'delete') },
                                                ]} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                </Card>
            </div>

            {applying && (
                <ApplyScholarshipDialog key={student?.id ?? 'new'} student={student} onClose={() => setApplying(false)}
                    onDone={(s) => { setApplying(false); setStudent(s); notify({ tone: 'ok', title: t('financePage.scholarships.applied', { name: fullName(s) }) }); }} />
            )}
        </div>
    );
}
