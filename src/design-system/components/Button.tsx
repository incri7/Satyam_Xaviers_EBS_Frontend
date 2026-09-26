import type { ComponentPropsWithRef } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Pill button. Mirrors the Figma "Button" component set (Variant × Size × State).
 *
 * - primary: the one main action in a view.
 * - secondary / quiet: supporting actions; quiet sits on cards.
 * - ghost: inside toolbars and list rows.
 * - danger / success: destructive or confirming steps only.
 * - white / glass: on the navy hero surfaces.
 *
 * `loading` swaps the leading icon for a spinner and disables the button.
 * Pass the in-progress wording as children ("Signing in") so the label says
 * what is happening, not just that something is.
 */
export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'quiet'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'inverse'
    | 'white'
    | 'glass';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: LucideIcon;
    rightIcon?: LucideIcon;
    loading?: boolean;
    fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-primary shadow-glow-primary hover:bg-primary-hover',
    secondary: 'bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-soft-line hover:bg-primary-soft-line',
    quiet: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-sunken',
    ghost: 'text-ink-2 hover:bg-sunken',
    danger: 'bg-bad text-white hover:brightness-95',
    success: 'bg-ok text-white hover:brightness-95',
    inverse: 'bg-inverse text-on-inverse hover:opacity-90',
    white: 'bg-white text-sx-blue-700 hover:shadow-e2',
    glass: 'bg-white/14 text-white ring-1 ring-inset ring-white/26 hover:bg-white/22',
};

const SIZE: Record<ButtonSize, { box: string; icon: number }> = {
    sm: { box: 'h-[34px] gap-1.5 px-3 type-label-s', icon: 14 },
    md: { box: 'h-10 gap-2 px-4 type-label', icon: 16 },
    lg: { box: 'h-12 gap-2 px-5 type-label text-[15px]', icon: 18 },
};

export function Button({
    variant = 'primary',
    size = 'md',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    loading = false,
    fullWidth = false,
    disabled,
    type = 'button',
    className,
    children,
    ...rest
}: ButtonProps) {
    const s = SIZE[size];
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full',
                'transition-[background-color,box-shadow,transform,opacity] duration-150 ease-sx',
                'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
                'outline-none focus-visible:ring-3 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                VARIANT[variant],
                s.box,
                fullWidth && 'w-full',
                className,
            )}
            {...rest}
        >
            {loading ? (
                <Loader2 size={s.icon} className="animate-spin" aria-hidden />
            ) : (
                LeftIcon && <LeftIcon size={s.icon} aria-hidden />
            )}
            {children}
            {RightIcon && !loading && <RightIcon size={s.icon} aria-hidden />}
        </button>
    );
}
