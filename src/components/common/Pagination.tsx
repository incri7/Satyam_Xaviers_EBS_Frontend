import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../utils/cn';

/**
 * Page through a long list.
 *
 * Leads with the record range rather than the page number, because "1–100 of
 * 401" answers the question people actually have — how much is there, and how
 * much am I looking at. "Page 1 of 5" only makes sense once you already know
 * the page size.
 *
 * Page numbers are shown so a specific page can be reached directly; with
 * more than seven pages the middle collapses to an ellipsis so the control
 * never wraps.
 */
export const Pagination: React.FC<{
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onChange: (page: number) => void;
    className?: string;
    /** "inset" sits in a table card's footer; "card" stands alone. */
    variant?: 'card' | 'inset';
}> = ({ page, totalPages, totalCount, pageSize, onChange, className, variant = 'card' }) => {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, totalCount);

    return (
        <nav
            aria-label={t('common.pagination')}
            className={cn(
                'flex flex-col items-center justify-between gap-3 px-4 py-2.5 font-ui sm:flex-row md:px-[18px]',
                variant === 'card' && 'rounded-card border border-line bg-surface shadow-e1',
                className,
            )}
        >
            <p className="type-small text-muted">
                {t('common.showingRange', {
                    first,
                    last,
                    total: totalCount,
                    defaultValue: `Showing ${first}–${last} of ${totalCount}`,
                })}
            </p>

            <div className="flex items-center gap-1">
                <PageButton
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    label={t('common.previous')}
                >
                    <ChevronLeft size={14} aria-hidden />
                    <span className="hidden sm:inline">{t('common.previous')}</span>
                </PageButton>

                {pageWindow(page, totalPages).map((p, i) =>
                    p === null ? (
                        <span key={`gap-${i}`} aria-hidden className="w-6 select-none text-center type-small-semibold text-muted">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onChange(p)}
                            aria-current={p === page ? 'page' : undefined}
                            className={cn(
                                'grid h-[34px] min-w-[34px] place-items-center rounded-full px-1.5 type-small-semibold tabular-nums outline-none transition-colors',
                                'focus-visible:ring-3 focus-visible:ring-focus/60',
                                p === page ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-sunken',
                            )}
                        >
                            {p}
                        </button>
                    ),
                )}

                <PageButton
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    label={t('common.next')}
                >
                    <span className="hidden sm:inline">{t('common.next')}</span>
                    <ChevronRight size={14} aria-hidden />
                </PageButton>
            </div>
        </nav>
    );
};

const PageButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    label: string;
    children: React.ReactNode;
}> = ({ onClick, disabled, label, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
            'inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 type-label-s text-ink-2 outline-none transition-colors',
            'hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
    >
        {children}
    </button>
);

/**
 * Up to seven slots: always the first and last page, the current page with a
 * neighbour either side, and `null` where a run is elided.
 */
function pageWindow(page: number, totalPages: number): (number | null)[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const out: (number | null)[] = [1];
    const from = Math.max(2, page - 1);
    const to = Math.min(totalPages - 1, page + 1);
    if (from > 2) out.push(null);
    for (let p = from; p <= to; p++) out.push(p);
    if (to < totalPages - 1) out.push(null);
    out.push(totalPages);
    return out;
}

export default Pagination;
