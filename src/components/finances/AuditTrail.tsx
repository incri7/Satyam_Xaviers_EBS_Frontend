import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, History, Lock, RotateCw } from 'lucide-react';

import {
    Banner, Button, EmptyState, FilterChips, ListCard, ListRow, Skeleton,
    Table, TableCard, TableMessage, TableSkeletonRows, THead, Td, Th, Tr,
} from '../../design-system';
import { Pagination } from '../common/Pagination';
import { financesService } from '../../api/services/finances.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { AuditEntry, AuditGroup } from '../../types/finance';

const PAGE_SIZE = 25;
const COLUMNS = 4;
type Filter = 'all' | AuditGroup;
const FILTERS: Filter[] = ['all', 'payments', 'expenses', 'fees', 'scholarships'];

type Snap = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v));

/**
 * Every money action, newest first, from the append-only audit log: who
 * recorded, reversed, edited or voided what, and when. Nothing here can
 * change an entry; the page only reads.
 */
export function AuditTrail() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const [filter, setFilter] = useState<Filter>('all');
    const [page, setPage] = useState(1);

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['finances', 'audit', filter, page],
        queryFn: () => financesService.getAuditLog({ group: filter === 'all' ? undefined : filter, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
        placeholderData: (prev) => prev,
    });

    const money = (v: unknown) => (v === null || v === undefined || v === '' ? '' : formatRs(String(v), lang));
    const fieldValue = (field: string, v: unknown) => {
        if (v === null || v === undefined || v === '') return t('financePage.audit.empty');
        if (typeof v === 'boolean') return t(v ? 'financePage.audit.yes' : 'financePage.audit.no');
        if (field === 'amount' || field === 'value') return money(v);
        if (/date|valid_/.test(field) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return df.date(String(v).slice(0, 10));
        return String(v);
    };
    const changes = (s: Snap) => Object.entries((s.changes as Record<string, [unknown, unknown]>) ?? {})
        .map(([f, [a, b]]) => t('financePage.audit.change', {
            field: t(`financePage.audit.field.${f}`, { defaultValue: f.replace(/_/g, ' ') }),
            from: fieldValue(f, a),
            to: fieldValue(f, b),
        }))
        .join('; ');

    /** The event as a sentence, a detail line and the amount it moved. */
    const describe = (e: AuditEntry): { what: string; detail: string; amount: string; negative?: boolean } => {
        const s: Snap = e.snapshot ?? {};
        const join = (...parts: string[]) => parts.filter(Boolean).join(' · ');
        switch (e.event_type) {
            case 'payment_created':
                return { what: t('financePage.audit.ev.payment_created'), amount: money(s.amount),
                    detail: join(e.student_name ?? '', e.fee_name ?? '', s.receipt_no ? t('financePage.audit.receipt', { no: s.receipt_no }) : '') };
            case 'payment_reversed':
                return { what: t('financePage.audit.ev.payment_reversed'), amount: money(s.amount), negative: true, detail: str(e.notes ?? s.reason) };
            case 'expense_recorded':
                return { what: t('financePage.audit.ev.expense_recorded'), amount: money(s.amount), negative: true,
                    detail: join(str(s.category), str(s.vendor_name), str(s.invoice_no)) };
            case 'expense_voided':
                return { what: t('financePage.audit.ev.expense_voided'), amount: money(s.amount), detail: join(str(s.category), str(s.invoice_no)) };
            case 'expense_updated':
                return { what: t('financePage.audit.ev.expense_updated'), amount: '', detail: join(str(s.invoice_no), changes(s)) };
            case 'fee_structure_created':
                return { what: t('financePage.audit.ev.fee_structure_created'), amount: money(s.amount), detail: e.fee_name ?? str(s.name) };
            case 'fee_structure_updated':
                return { what: t('financePage.audit.ev.fee_structure_updated'), amount: '', detail: join(e.fee_name ?? str(s.name), changes(s)) };
            case 'fee_structure_stopped':
                return { what: t('financePage.audit.ev.fee_structure_stopped'), amount: '', detail: e.fee_name ?? str(s.name) };
            case 'discount_applied':
                return { what: t('financePage.audit.ev.discount_applied'), detail: join(e.student_name ?? '', e.fee_name ?? ''),
                    amount: s.is_percent ? `${formatCount(Number(s.value), lang)}%` : money(s.value) };
            case 'discount_updated':
                return { what: t('financePage.audit.ev.discount_updated'), amount: '', detail: join(e.student_name ?? '', changes(s)) };
            case 'discount_revoked':
                return { what: t('financePage.audit.ev.discount_revoked'), amount: '', detail: e.student_name ?? '' };
            default:
                return { what: e.event_type.replace(/_/g, ' '), amount: '', detail: '' };
        }
    };

    const rows = data?.entries ?? [];
    const total = data?.total_count;
    const title = total === undefined ? t('financePage.tabs.activity') : t('financePage.audit.count', { count: total, n: formatCount(total, lang) });
    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const paging = totalPages > 1 ? { page, totalPages, totalCount: total!, pageSize: PAGE_SIZE, onChange: setPage } : undefined;
    const when = (e: AuditEntry) => `${df.date(e.performed_at)}, ${new Date(e.performed_at).toLocaleTimeString(lang === 'ne' ? 'ne-NP' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    const message = isError ? (
        <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('classesPage.action.retry')}</Button>}>
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : !isPending && rows.length === 0 ? (
        <EmptyState icon={History} title={t('financePage.audit.none')}>{t('financePage.audit.noneBody')}</EmptyState>
    ) : null;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            <Banner tone="info" icon={Lock} title={t('financePage.audit.ruleTitle')}>{t('financePage.audit.ruleBody')}</Banner>
            <FilterChips aria-label={t('financePage.audit.filter')} value={filter} onChange={(f) => { setFilter(f); setPage(1); }}
                items={FILTERS.map((f) => ({ value: f, label: t(`financePage.audit.group.${f}`) }))} />

            <TableCard className="max-md:hidden" title={title} footer={paging ? <Pagination variant="inset" {...paging} /> : undefined}>
                <Table aria-label={title}>
                    <THead>
                        <Th>{t('financePage.audit.col.when')}</Th>
                        <Th>{t('financePage.audit.col.who')}</Th>
                        <Th>{t('financePage.audit.col.what')}</Th>
                        <Th className="text-right">{t('financePage.col.amount')}</Th>
                    </THead>
                    <tbody>
                        {isPending ? <TableSkeletonRows columns={COLUMNS} /> : message ? <TableMessage columns={COLUMNS}>{message}</TableMessage> : rows.map((e) => {
                            const d = describe(e);
                            return (
                                <Tr key={e.id}>
                                    <Td className="whitespace-nowrap type-small text-ink-2">{when(e)}</Td>
                                    <Td className="type-small-medium text-ink">{e.performed_by_name ?? `#${e.performed_by}`}</Td>
                                    <Td className="max-w-[420px]">
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span className="type-small-semibold text-ink">{d.what}</span>
                                            {d.detail && <span className="type-caption text-muted">{d.detail}</span>}
                                        </span>
                                    </Td>
                                    <Td className={cn('whitespace-nowrap text-right type-small-semibold tabular-nums', d.negative ? 'text-bad' : 'text-ink')}>{d.amount}</Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            </TableCard>

            <div className="flex flex-col gap-2.5 md:hidden">
                <p className="px-1 type-small-semibold text-ink-2">{title}</p>
                {isPending ? (
                    <ListCard>{Array.from({ length: 6 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-10" /></li>)}</ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>
                        {rows.map((e) => {
                            const d = describe(e);
                            return (
                                <ListRow key={e.id}>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="type-small-semibold text-ink">{d.what}</span>
                                        {d.detail && <span className="type-caption text-ink-2">{d.detail}</span>}
                                        <span className="type-caption text-muted">{e.performed_by_name ?? `#${e.performed_by}`}, {when(e)}</span>
                                    </span>
                                    {d.amount && <span className={cn('shrink-0 type-small-semibold tabular-nums', d.negative ? 'text-bad' : 'text-ink')}>{d.amount}</span>}
                                </ListRow>
                            );
                        })}
                    </ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>
        </div>
    );
}
