import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Round icon-only button. Mirrors Figma "Action/…" (32, outlined, in table
 * rows) and "IconButton" (36/40). The label is required: it is the only name
 * a screen reader has, and it doubles as the tooltip.
 */
export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
    icon: LucideIcon;
    label: string;
    size?: 32 | 36 | 40;
    variant?: 'outline' | 'soft' | 'ghost' | 'danger';
}

const VARIANT = {
    outline: 'bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-sunken hover:text-ink',
    soft: 'bg-surface-2 text-ink-2 hover:bg-sunken',
    ghost: 'text-ink-2 hover:bg-sunken',
    danger: 'bg-surface text-bad ring-1 ring-inset ring-line hover:bg-bad-soft hover:ring-bad-line',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { icon: Icon, label, size = 32, variant = 'outline', className, type = 'button', ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            style={{ width: size, height: size }}
            className={cn(
                'grid shrink-0 place-items-center rounded-full outline-none transition-colors duration-150',
                'focus-visible:ring-3 focus-visible:ring-focus/60 disabled:pointer-events-none disabled:opacity-45',
                VARIANT[variant],
                className,
            )}
            {...rest}
        >
            <Icon size={size >= 40 ? 18 : 16} aria-hidden />
        </button>
    );
});
