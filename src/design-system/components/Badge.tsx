import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';

/** Status pill. Mirrors Figma "Badge": soft fill, 12px semibold, optional dot. */
export type BadgeTone = 'ok' | 'bad' | 'warn' | 'info' | 'brand' | 'neutral';

const TONE: Record<BadgeTone, { box: string; dot: string }> = {
    ok: { box: 'bg-ok-soft text-ok', dot: 'bg-ok' },
    bad: { box: 'bg-bad-soft text-bad', dot: 'bg-bad' },
    warn: { box: 'bg-warn-soft text-warn', dot: 'bg-warn' },
    info: { box: 'bg-info-soft text-info', dot: 'bg-info' },
    brand: { box: 'bg-primary-soft text-primary-text', dot: 'bg-primary' },
    neutral: { box: 'bg-sunken text-ink-2', dot: 'bg-muted' },
};

export interface BadgeProps {
    tone?: BadgeTone;
    dot?: boolean;
    children: ReactNode;
    className?: string;
}

export function Badge({ tone = 'neutral', dot = false, children, className }: BadgeProps) {
    const t = TONE[tone];
    return (
        <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] type-caption-semibold', t.box, className)}>
            {dot && <span aria-hidden className={cn('size-1.5 rounded-full', t.dot)} />}
            {children}
        </span>
    );
}

/**
 * Small red count, e.g. "3" leave requests waiting. Mirrors Figma "Count".
 * `label` is what a screen reader hears instead of the bare number.
 */
export function CountPill({ count, label, className }: { count: number; label: string; className?: string }) {
    if (count <= 0) return null;
    return (
        <span
            aria-label={label}
            className={cn('inline-flex min-w-[22px] shrink-0 items-center justify-center rounded-full bg-crest px-[7px] py-px type-micro-bold text-white', className)}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}
