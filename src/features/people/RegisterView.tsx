import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RotateCw, X, type LucideIcon } from 'lucide-react';

import {
    Button,
    EmptyState,
    ListCard,
    Skeleton,
    Table,
    TableCard,
    TableMessage,
    TableSkeletonRows,
} from '../../design-system';
import { Toolbar } from '../../components/layout/AppPage';
import { Pagination } from '../../components/common/Pagination';
import { ViewToggle, type ViewMode } from '../../components/common/ViewToggle';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';

export type RegisterKind = 'students' | 'teachers' | 'staff' | 'parents' | 'users';

interface Paging {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onChange: (page: number) => void;
}

/**
 * One People register (Figma F01–F05), in whichever shape fits the screen:
 *
 * - md and up: a table (Figma "Table") or a card grid (Figma "Teacher
 *   card"), as the person last chose;
 * - phones: list rows (Figma "Students list"), always.
 *
 * Each tab supplies its toolbar, columns and cells; this owns the frame and
 * the loading, empty and error states, so the five tabs cannot drift apart.
 */
export function RegisterView<T>({
    kind,
    emptyIcon,
    total,
    filtered,
    onClearFilters,
    toolbar,
    view,
    onViewChange,
    isLoading,
    isError,
    onRetry,
    rows,
    columns,
    head,
    row,
    card,
    listRow,
    paging,
    notice,
}: {
    kind: RegisterKind;
    emptyIcon: LucideIcon;
    total: number | undefined;
    filtered: boolean;
    onClearFilters: () => void;
    toolbar: ReactNode;
    /** Omit for a register that is only ever a table (User accounts). */
    view?: ViewMode;
    onViewChange?: (mode: ViewMode) => void;
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    rows: T[];
    columns: number;
    head: ReactNode;
    row: (item: T) => ReactNode;
    card?: (item: T) => ReactNode;
    listRow: (item: T) => ReactNode;
    paging?: Paging;
    notice?: ReactNode;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const shown = view ?? 'table';
    const count = total ?? 0;
    const title = total === undefined ? t(`peoplePage.tabs.${kind}`) : t(`peoplePage.count.${kind}`, { count, n: formatCount(count, lang) });
    const subtitle = filtered ? t('peoplePage.subtitle.filtered') : t(`peoplePage.subtitle.${kind}`);
    const empty = !isLoading && !isError && rows.length === 0;

    const clear = filtered ? (
        <Button variant="ghost" size="sm" leftIcon={X} onClick={onClearFilters}>
            {t('common.clearFilters')}
        </Button>
    ) : undefined;

    const message = isError ? (
        <EmptyState
            icon={AlertCircle}
            tone="bad"
            title={t('peoplePage.error.title')}
            action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={onRetry}>{t('peoplePage.error.retry')}</Button>}
        >
            {t('peoplePage.error.body')}
        </EmptyState>
    ) : empty ? (
        <EmptyState icon={emptyIcon} title={t('peoplePage.empty.title')} action={clear}>
            {filtered ? t('peoplePage.empty.filtered') : t('peoplePage.empty.none')}
        </EmptyState>
    ) : null;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {notice}

            <Toolbar end={view && onViewChange ? <ViewToggle value={view} onChange={onViewChange} /> : undefined}>
                {toolbar}
            </Toolbar>

            {/* Laptop and tablet: table */}
            {shown === 'table' && (
                <TableCard
                    className="max-md:hidden"
                    title={title}
                    subtitle={subtitle}
                    action={clear}
                    footer={paging && paging.totalPages > 1 ? <Pagination variant="inset" {...paging} /> : undefined}
                >
                    <Table aria-label={title}>
                        {head}
                        <tbody>
                            {isLoading ? (
                                <TableSkeletonRows columns={columns} />
                            ) : message ? (
                                <TableMessage columns={columns}>{message}</TableMessage>
                            ) : (
                                rows.map(row)
                            )}
                        </tbody>
                    </Table>
                </TableCard>
            )}

            {/* Laptop and tablet: cards */}
            {shown === 'cards' && card && (
                <div className="flex flex-col gap-3.5 max-md:hidden">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <p className="type-body-semibold text-ink-2">{title}</p>
                        {clear}
                    </div>
                    {isLoading ? (
                        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[228px] rounded-card" />)}
                        </div>
                    ) : message ? (
                        <div className="rounded-card border border-line bg-surface">{message}</div>
                    ) : (
                        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{rows.map(card)}</div>
                    )}
                    {paging && <Pagination {...paging} />}
                </div>
            )}

            {/* Phone: list rows */}
            <div className="flex flex-col gap-2.5 md:hidden">
                <div className="flex items-center justify-between gap-3 px-1">
                    <p className="type-small-semibold text-ink-2">{title}</p>
                    {clear}
                </div>
                {isLoading ? (
                    <ListCard>
                        {Array.from({ length: 6 }, (_, i) => (
                            <li key={i} aria-hidden className="flex items-center gap-3 border-b border-line-subtle py-3 last:border-0">
                                <Skeleton className="size-10 shrink-0 rounded-full" />
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <Skeleton className="h-3 w-2/3" />
                                    <Skeleton className="h-2.5 w-1/3" />
                                </div>
                            </li>
                        ))}
                    </ListCard>
                ) : message ? (
                    <div className="rounded-card border border-line bg-surface">{message}</div>
                ) : (
                    <ListCard>{rows.map(listRow)}</ListCard>
                )}
                {paging && <Pagination {...paging} />}
            </div>
        </div>
    );
}
