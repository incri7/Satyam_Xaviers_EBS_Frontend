import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Skeleton } from './Skeleton';

/**
 * Register tables. Mirrors Figma "Table": a white card with a title bar
 * (count and what is shown), a quiet header row, 62px rows on hairlines,
 * and pagination at the foot.
 *
 * Primitives rather than one configurable table: each register has its own
 * cells, and on phones the same records render as a list (Figma "list row"),
 * which the caller builds from `ListRow`.
 */
export function TableCard({
    title,
    subtitle,
    action,
    children,
    footer,
    className,
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-e1', className)}>
            {(title || action) && (
                <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3.5 md:px-[18px]">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {title && <h2 className="type-title text-ink">{title}</h2>}
                        {subtitle && <p className="type-small text-muted">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
            {footer && <div className="border-t border-line-subtle">{footer}</div>}
        </section>
    );
}

/** The <table>. Scrolls sideways inside its card rather than stretching the page. */
export function Table({ className, children, ...rest }: ComponentPropsWithoutRef<'table'>) {
    return (
        <div className="min-w-0 overflow-x-auto">
            <table className={cn('w-full border-collapse text-left', className)} {...rest}>
                {children}
            </table>
        </div>
    );
}

export function THead({ children }: { children: ReactNode }) {
    return (
        <thead className="border-b border-line-subtle bg-surface-2">
            <tr>{children}</tr>
        </thead>
    );
}

export function Th({ className, children, ...rest }: ComponentPropsWithoutRef<'th'>) {
    return (
        <th
            scope="col"
            className={cn('whitespace-nowrap px-[7px] py-2.5 align-middle type-caption text-muted first:pl-[18px] last:pr-[18px]', className)}
            {...rest}
        >
            {/* Same box as a sortable header's button, so plain and sortable headers line up. */}
            <span className="inline-flex items-center">{children}</span>
        </th>
    );
}

export function Tr({ className, children, ...rest }: ComponentPropsWithoutRef<'tr'>) {
    return (
        <tr className={cn('border-b border-line-subtle transition-colors last:border-0 hover:bg-surface-2', className)} {...rest}>
            {children}
        </tr>
    );
}

export function Td({ className, children, ...rest }: ComponentPropsWithoutRef<'td'>) {
    return (
        <td className={cn('h-[62px] px-[7px] py-3 align-middle type-body text-ink-2 first:pl-[18px] last:pr-[18px]', className)} {...rest}>
            {children}
        </td>
    );
}

/** Placeholder rows while a page loads, shaped like the real ones. */
export function TableSkeletonRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }, (_, r) => (
                <tr key={r} aria-hidden className="border-b border-line-subtle last:border-0">
                    {Array.from({ length: columns }, (_, c) => (
                        <td key={c} className="h-[62px] px-[7px] first:pl-[18px] last:pr-[18px]">
                            {c === 0 ? (
                                <span className="flex items-center gap-2.5">
                                    <Skeleton className="size-8 shrink-0 rounded-full" />
                                    <Skeleton className="h-3 w-28" />
                                </span>
                            ) : (
                                <Skeleton className="h-3 w-20" />
                            )}
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/** A full-width cell for empty and error states inside the table body. */
export function TableMessage({ columns, children }: { columns: number; children: ReactNode }) {
    return (
        <tr>
            <td colSpan={columns}>{children}</td>
        </tr>
    );
}

/** Phone list container (Figma "Students list"). */
export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
    return <ul className={cn('flex flex-col rounded-card border border-line bg-surface px-4 py-1 shadow-e1', className)}>{children}</ul>;
}

/** Phone list row (Figma "list row"): who, a status, a chevron. */
export function ListRow({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
    const inner = 'flex w-full min-w-0 items-center gap-3 py-3 text-left';
    return (
        <li className={cn('border-b border-line-subtle last:border-0', className)}>
            {onClick ? (
                <button type="button" onClick={onClick} className={cn(inner, 'rounded-[12px] outline-none focus-visible:ring-3 focus-visible:ring-focus/60')}>
                    {children}
                </button>
            ) : (
                <div className={inner}>{children}</div>
            )}
        </li>
    );
}

/**
 * A header that sorts its column: ascending, descending, then back to the
 * default order. The arrow shows on hover and stays while the column is
 * sorted; aria-sort tells a screen reader which way.
 */
export function SortTh<K extends string>({
    k,
    sort,
    onSort,
    children,
    className,
}: {
    k: K;
    sort: { by: K | null; dir: 'asc' | 'desc' };
    onSort: (k: K) => void;
    children: ReactNode;
    className?: string;
}) {
    const active = sort.by === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
    return (
        <th
            scope="col"
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
            className={cn('whitespace-nowrap px-[7px] py-2.5 align-middle type-caption first:pl-[18px] last:pr-[18px]', className)}
        >
            <button
                type="button"
                onClick={() => onSort(k)}
                className={cn(
                    'group inline-flex items-center gap-1 rounded-sm type-caption outline-none transition-colors',
                    'focus-visible:ring-3 focus-visible:ring-focus/60',
                    active ? 'text-ink-2' : 'text-muted hover:text-ink-2',
                )}
            >
                {children}
                <Icon size={13} aria-hidden className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')} />
            </button>
        </th>
    );
}
