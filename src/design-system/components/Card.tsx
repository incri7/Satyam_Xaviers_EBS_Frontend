import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '../../utils/cn';

/**
 * White panel on the canvas. Mirrors Figma cards: 20px radius, hairline
 * border, elevation 2, 20px padding, 12px between rows.
 */
export function Card({ className, ...rest }: ComponentPropsWithoutRef<'section'>) {
    return (
        <section
            className={cn('flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-e2', className)}
            {...rest}
        />
    );
}

/** Figma "card-head": title and one line of context, an optional action on the right. */
export function CardHeader({
    title,
    subtitle,
    action,
    titleId,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    /** Pass to label the card: <Card aria-labelledby={titleId}>. */
    titleId?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h2 id={titleId} className="type-title text-ink">{title}</h2>
                {subtitle && <p className="type-small text-muted">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
