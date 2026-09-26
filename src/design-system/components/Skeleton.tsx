import type { CSSProperties } from 'react';

import { cn } from '../../utils/cn';

/**
 * Placeholder block while data loads. Mirrors Figma "skeleton": a soft
 * sweep over the sunken tone. Hidden from screen readers; the card that
 * holds it says "Loading" in words.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <span
            aria-hidden
            style={style}
            className={cn(
                'block animate-shimmer rounded-lg bg-[length:200%_100%]',
                'bg-[linear-gradient(90deg,var(--color-sunken)_25%,var(--color-line-subtle)_50%,var(--color-sunken)_75%)]',
                className,
            )}
        />
    );
}
