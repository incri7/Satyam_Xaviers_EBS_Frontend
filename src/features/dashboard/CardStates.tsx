import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RotateCw, type LucideIcon } from 'lucide-react';

import { Button } from '../../design-system';
import { cn } from '../../utils/cn';

/**
 * Stand-ins for a chart area (Figma B01 "chart empty"): a quiet panel the
 * same size as the chart, so the card keeps its shape in every state.
 */
function ChartPanel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex h-[200px] flex-col items-center justify-center gap-1.5 rounded-row border border-line-subtle bg-surface-2 px-6 text-center', className)}>
            {children}
        </div>
    );
}

export function ChartEmpty({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
    return (
        <ChartPanel className={className}>
            <Icon size={22} className="text-muted" aria-hidden />
            <p className="type-small text-muted">{children}</p>
        </ChartPanel>
    );
}

/** A card whose data failed. Says so, and offers the retry right there. */
export function ChartError({ onRetry, className }: { onRetry: () => void; className?: string }) {
    const { t } = useTranslation();
    return (
        <ChartPanel className={cn('gap-2.5', className)}>
            <AlertCircle size={22} className="text-bad" aria-hidden />
            <p className="type-small-medium text-ink-2">{t('adminDashboard.cardError')}</p>
            <Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={onRetry}>
                {t('adminDashboard.retry')}
            </Button>
        </ChartPanel>
    );
}
