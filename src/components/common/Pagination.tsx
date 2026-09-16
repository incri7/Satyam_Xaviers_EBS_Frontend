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
}> = ({ page, totalPages, totalCount, pageSize, onChange, className }) => {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, totalCount);

    return (
        <nav
            aria-label={t('common.pagination')}
            className={cn(
                'flex flex-col sm:flex-row items-center justify-between gap-3',
                'bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm',
                className,
            )}
        >
            <p className="text-sm font-medium text-slate-500">
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
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('common.previous')}</span>
                </PageButton>

                {pageWindow(page, totalPages).map((p, i) =>
                    p === null ? (
                        <span key={`gap-${i}`} className="px-2 text-slate-300 font-bold select-none">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onChange(p)}
                            aria-current={p === page ? 'page' : undefined}
                            className={cn(
                                'min-w-9 px-3 py-2 rounded-xl text-sm font-bold transition-colors',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                                p === page
                                    ? 'bg-brand text-white shadow-sm shadow-brand/20'
                                    : 'text-slate-600 hover:bg-slate-100',
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
                    <ChevronRight className="w-4 h-4" />
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
            'inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            'text-slate-600 hover:bg-slate-100',
            'disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed',
        )}
    >
        {children}
    </button>
);

/**
 * Up to seven slots: always the first and last page, the current page with a
 * neighbour either side, and `null` where a run is elided.
 */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
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
