import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Checkbox with its label. Mirrors Figma "Checkbox" (20px, 6px radius,
 * primary fill when checked). A real <input type="checkbox">, so keyboard,
 * forms and screen readers work without extra wiring.
 */
export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
    label: ReactNode;
}

export function Checkbox({ label, id, className, disabled, ...rest }: CheckboxProps) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
        <label
            htmlFor={inputId}
            className={cn('inline-flex min-h-6 cursor-pointer select-none items-center gap-2.5', disabled && 'cursor-not-allowed', className)}
        >
            <span className="relative grid size-5 shrink-0 place-items-center">
                <input
                    id={inputId}
                    type="checkbox"
                    disabled={disabled}
                    className={cn(
                        'peer size-5 cursor-[inherit] appearance-none rounded-[6px] border-[1.5px] border-line bg-surface outline-none',
                        'transition-colors duration-150 ease-sx checked:border-primary checked:bg-primary',
                        'focus-visible:ring-3 focus-visible:ring-focus/60 disabled:bg-sunken',
                    )}
                    {...rest}
                />
                <Check
                    size={14}
                    strokeWidth={3}
                    aria-hidden
                    className="pointer-events-none absolute text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                />
            </span>
            <span className={cn('type-small', disabled ? 'text-muted' : 'text-ink-2')}>{label}</span>
        </label>
    );
}
