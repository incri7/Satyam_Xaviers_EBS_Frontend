import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Award, RotateCw, Trash2, X } from 'lucide-react';

import {
    ActionMenu, Badge, Button, EmptyState, ListCard, ListRow, SearchField, Skeleton,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr, type BadgeTone,
} from '../../design-system';
import { Toolbar } from '../layout/AppPage';
import { Pagination } from '../common/Pagination';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { financesService } from '../../api/services/finances.service';
import { ApplyScholarshipDialog } from '../../features/finance/ApplyScholarshipDialog';
import { decodeReason } from '../../features/finance/format';
import { useListControls } from '../../features/people/useListControls';
import { useNotice } from '../../features/people/useNotice';
import { errorText, fullName } from '../../features/people/format';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import type { FeeDiscountRow } from '../../types/finance';

const PAGE_SIZE = 25;
const COLUMNS = 6;

/**
 * Figma E06 Scholarships: every scholarship in the school, searchable by
 * student name or admission number. Applying one opens H04.
 */
export function DiscountManagement({ applying, setApplying }: { applying: boolean; setApplying: (open: boolean) => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const list = useListControls<never>();

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['discounts', 'all', list.search, list.page],
        queryFn: () => financesService.listDiscounts({ search: list.search || undefined, skip: (list.page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
        placeholderData: (prev) => prev,
    });
    const remove = useMutation({
        mutationFn: financesService.deleteDiscount,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); queryClient.invalidateQueries({ queryKey: ['finances', 'outstanding'] }); },
        onError: (err) => notify({ tone: 'bad', title: t('financePage.scholarships.removeFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });

    const today = isoLocal(new Date());
    const day = (v?: string | null) => (v ? v.slice(0, 10) : '');
    const status = (d: FeeDiscountRow): { tone: BadgeTone; label: string } => {
        const from = day(d.valid_from);
        const to = day(d.valid_to);
        if (from && from > today) return { tone: 'info', label: t('financePage.scholarships.starts', { date: df.date(from) }) };
        if (to && to < today) return { tone: 'neutral', label: t('financePage.scholarships.ended') };
        return { tone: 'ok', label: t('financePage.scholarships.active') };
    };
    const valueText = (d: FeeDiscountRow) => {
        if (d.is_percent) return `${formatCount(Number(d.value), lang)}%`;
        return `${formatRs(d.value, lang)}${d.fee_frequency ? ` ${t(`financePage.scholarships.per.${d.fee_frequency}`)}` : ''}`;
    };
    const dates = (d: FeeDiscountRow) => {
        const from = day(d.valid_from);
        const to = day(d.valid_to);
        if (from && to) return t('financePage.scholarships.range', { from: df.date(from), to: df.date(to) });
        if (from) return t('financePage.scholarships.fromOnly', { from: df.date(from) });
        if (to) return t('financePage.scholarships.untilOnly', { to: df.date(to) });
        return t('financePage.scholarships.always');
    };
    const feeName = (d: FeeDiscountRow) => d.fee_name ?? `#${d.fee_structure_id}`;
    const askRemove = (d: FeeDiscountRow) =>
        confirm({
            title: t('financePage.scholarships.removeTitleFor', { name: d.student_name }),
            body: t('financePage.scholarships.removeBody', { value: valueText(d), fee: feeName(d) }),
            confirmLabel: t('financePage.scholarships.remove'),
            onConfirm: () => remove.mutate(d.id),
        });
    const menu = (d: FeeDiscountRow) => (
        <ActionMenu label={t('financePage.payments.more')} items={[
            { label: t('financePage.scholarships.remove'), icon: Trash2, tone: 'bad', onSelect: () => askRemove(d), hidden: !can('finances', 'delete') },
        ]} />
    );

    const rows = data?.discounts ?? [];
    const total = data?.total_count;
    const title = total === undefined ? t('financePage.tabs.discounts') : t('financePage.scholarships.countAll', { count: total, n: formatCount(total, lang) });
    const filtered = Boolean(list.search);
    const clearButton = filtered ? <Button variant="ghost" size="sm" leftIcon={X} onClick={list.resetSearch}>{t('common.clearFilters')}</Button> : undefined;
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page: list.page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: list.setPage } : undefined;

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={Award} title={filtered ? t('financePage.scholarships.noMatch') : t('financePage.scholarships.noneAll')} action={clearButton}>
            {filtered ? t('peoplePage.empty.filtered') : t('financePage.scholarships.noneAllBody')}
        </EmptyState>
    ) : null;

    const what = (d: FeeDiscountRow) => {
        const { type, reason } = decodeReason(d.reason);
        return (
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 type-small-medium text-ink">
                    {feeName(d)}
                    {type && <Badge tone="brand">{t(`financePage.scholarships.types.${type}`)}</Badge>}
                </span>
                {reason && <span className="truncate type-caption text-muted">{reason}</span>}
            </span>
        );
    };

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}
            <Toolbar>
                <SearchField value={list.searchInput} onChange={list.setSearchInput} placeholder={t('financePage.scholarships.search')} clearLabel={t('common.clear')} containerClassName="md:w-[280px]" />
            </Toolbar>

            <TableCard className="max-md:hidden" title={title} subtitle={t('financePage.scholarships.intro')} action={clearButton}
                footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <Th>{t('financePage.col.student')}</Th>
                        <Th>{t('financePage.scholarships.col.what')}</Th>
                        <Th className="text-right">{t('financePage.scholarships.col.value')}</Th>
                        <Th>{t('financePage.scholarships.col.when')}</Th>
                        <Th>{t('financePage.col.status')}</Th>
                        <Th className="text-right">{t('classesPage.col.actions')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((d) => {
                            const s = status(d);
                            return (
                                <Tr key={d.id}>
                                    <Td>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate type-small-semibold text-ink">{d.student_name}</span>
                                            {d.admission_no && <span className="type-caption tabular-nums text-muted">{d.admission_no}</span>}
                                        </span>
                                    </Td>
                                    <Td className="max-w-[280px]">{what(d)}</Td>
                                    <Td className="whitespace-nowrap text-right type-small-semibold tabular-nums">{valueText(d)}</Td>
                                    <Td className="whitespace-nowrap type-small text-ink-2">{dates(d)}</Td>
                                    <Td><Badge tone={s.tone} dot>{s.label}</Badge></Td>
                                    <Td><div className="flex justify-end">{menu(d)}</div></Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            </TableCard>

            <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-center justify-between px-1">
                    <p className="type-small-semibold text-ink-2">{title}</p>
                    {clearButton}
                </div>
                {isPending ? (
                    <ListCard>{Array.from({ length: 5 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-10" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((d) => {
                            const s = status(d);
                            return (
                                <ListRow key={d.id}>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="truncate type-small-semibold text-ink">{d.student_name}</span>
                                        <span className="truncate type-caption text-ink-2">{feeName(d)}, {dates(d)}</span>
                                    </span>
                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="type-small-semibold tabular-nums text-ink">{valueText(d)}</span>
                                        <Badge tone={s.tone} dot>{s.label}</Badge>
                                    </span>
                                    {menu(d)}
                                </ListRow>
                            );
                        })}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>

            {applying && (
                <ApplyScholarshipDialog student={null} onClose={() => setApplying(false)}
                    onDone={(s) => {
                        setApplying(false);
                        queryClient.invalidateQueries({ queryKey: ['discounts'] });
                        notify({ tone: 'ok', title: t('financePage.scholarships.applied', { name: fullName(s) }) });
                    }} />
            )}
        </div>
    );
}
