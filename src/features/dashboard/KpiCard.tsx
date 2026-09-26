import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

import { IconTile, Skeleton, type IconTileTone } from '../../design-system';
import { cn } from '../../utils/cn';

export interface KpiCardProps {
    icon: LucideIcon;
    tone: IconTileTone;
    label: string;
    /** Formatted figure. */
    value: string;
    /** Context line under the figure: a delta badge, "35 absent", … */
    sub?: ReactNode;
    /** Where the card leads; the whole card is the link. Omit for a plain figure. */
    to?: string;
    /** Runs before navigating, e.g. to preselect a tab on the target page. */
    onNavigate?: () => void;
    /** Money and ratios run long; on phones they drop to 19px (Figma mobile). */
    long?: boolean;
    status: 'loading' | 'error' | 'ready';
    onRetry?: () => void;
}

/**
 * Figure card. Figma B01 "KPI/…": icon tile and label, the figure, one line
 * of context. Loading shows the skeleton card; an error keeps the label and
 * says "Not loaded" with a retry, so a failed figure is never shown as 0.
 */
export function KpiCard({ icon, tone, label, value, sub, to, onNavigate, long, status, onRetry }: KpiCardProps) {
    const { t } = useTranslation();

    if (status === 'loading') {
        return (
            <div
                role="status"
                aria-label={`${label}: ${t('adminDashboard.loading')}`}
                className="flex min-h-[114px] flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-e2 lg:min-h-[128px]"
            >
                <Skeleton className="h-3 w-[110px] max-w-full" />
                <Skeleton className="h-[26px] w-[150px] max-w-full rounded-[10px]" />
                <Skeleton className="h-2.5 w-20" />
            </div>
        );
    }

    const head = (
        <div className="flex items-center gap-2">
            <IconTile icon={icon} tone={tone} size={30} />
            <span className="min-w-0 line-clamp-2 type-small-medium text-ink-2 lg:truncate">{label}</span>
        </div>
    );

    if (status === 'error') {
        return (
            <div className={cardBase}>
                {head}
                <p className={cn(figure(long), 'text-muted')}>{t('adminDashboard.notLoaded')}</p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="w-fit rounded-sm type-small-semibold text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60"
                >
                    {t('adminDashboard.retry')}
                </button>
            </div>
        );
    }

    if (!to) {
        return (
            <div className={cardBase}>
                {head}
                <p className={cn(figure(long), 'text-ink')}>{value}</p>
                {sub && <div className="flex min-h-[22px] min-w-0 items-center gap-1.5 type-small text-muted">{sub}</div>}
            </div>
        );
    }

    return (
        <Link
            to={to}
            onClick={onNavigate}
            className={cn(
                cardBase,
                'outline-none transition-[box-shadow,border-color,translate] duration-200 ease-sx',
                'hover:-translate-y-0.5 hover:border-primary-soft-line hover:shadow-e3 focus-visible:ring-3 focus-visible:ring-focus/60',
            )}
        >
            {head}
            <p className={cn(figure(long), 'text-ink')}>{value}</p>
            {sub && <div className="flex min-h-[22px] min-w-0 items-center gap-1.5 type-small text-muted [&>span]:max-lg:line-clamp-2 [&>span]:max-lg:whitespace-normal">{sub}</div>}
        </Link>
    );
}

const cardBase = 'flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface p-3.5 shadow-e2 lg:px-[18px] lg:py-4';

function figure(long?: boolean) {
    return cn(
        'truncate type-figure-m lg:type-figure-l',
        long && 'max-sm:text-[19px] max-sm:font-semibold max-sm:leading-6',
    );
}
