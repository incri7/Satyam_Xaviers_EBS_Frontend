import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Labelled text input. Mirrors the Figma "Field" pattern: label above,
 * 46px box, optional leading icon, message below.
 *
 * States come from props, not from a `state` enum: `error` shows the error
 * treatment, `disabled` the muted one, and focus is handled by CSS.
 * The error text is wired to the input with aria-describedby, so a screen
 * reader announces it with the field.
 */
export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
    label: string;
    /** Quiet suffix on the label, e.g. "(optional)". */
    optional?: string;
    /** Help text under the field. Hidden while an error is showing. */
    hint?: ReactNode;
    /** Error message. Turns the field red and is announced with the input. */
    error?: string;
    /** Confirmation message (e.g. "Passwords match"). Green field and message. */
    success?: string;
    leftIcon?: LucideIcon;
    /** Something on the right edge inside the box, e.g. a show-password button. */
    endAdornment?: ReactNode;
    /** Something on the right of the label row, e.g. "Forgot password?". */
    labelAction?: ReactNode;
    containerClassName?: string;
}

export function TextField({
    label,
    optional,
    hint,
    error,
    success,
    leftIcon: LeftIcon,
    endAdornment,
    labelAction,
    containerClassName,
    className,
    id,
    disabled,
    ...inputProps
}: TextFieldProps) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = `${inputId}-message`;
    const ok = !error && !!success;
    const message = error ?? success ?? hint;

    return (
        <div className={cn('flex w-full flex-col gap-1.5', containerClassName)}>
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={inputId} className="type-small-semibold text-ink">
                    {label}
                    {optional && <span className="font-normal text-muted"> {optional}</span>}
                </label>
                {labelAction}
            </div>

            <div
                className={cn(
                    'flex h-[46px] items-center gap-2 rounded-field border-[1.5px] px-3',
                    'transition-[border-color,box-shadow] duration-150 ease-sx',
                    disabled
                        ? 'border-line-subtle bg-sunken'
                        : error
                          ? 'border-bad bg-surface shadow-[0_0_0_4px_rgb(216_53_42/0.14)]'
                          : ok
                            ? 'border-ok bg-surface'
                            : 'border-line bg-surface focus-within:border-sx-blue-500 focus-within:shadow-[0_0_0_4px_rgb(44_107_192/0.18)]',
                )}
            >
                {LeftIcon && <LeftIcon size={16} className="shrink-0 text-muted" aria-hidden />}
                <input
                    id={inputId}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={message ? messageId : undefined}
                    className={cn(
                        // 16px on phones stops iOS zooming into the field on focus.
                        'h-full min-w-0 flex-1 bg-transparent font-ui text-base font-medium text-ink outline-none md:text-sm',
                        'placeholder:font-normal placeholder:text-muted disabled:text-muted',
                        className,
                    )}
                    {...inputProps}
                />
                {error && <AlertCircle size={16} className="shrink-0 text-bad" aria-hidden />}
                {ok && <CheckCircle2 size={16} className="shrink-0 text-ok" aria-hidden />}
                {endAdornment}
            </div>

            {message && (
                <p
                    id={messageId}
                    aria-live={ok ? 'polite' : undefined}
                    className={cn('flex items-start gap-1.5 type-caption', error ? 'text-bad' : ok ? 'text-ok' : 'text-muted')}
                >
                    {error && <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />}
                    {ok && <CheckCircle2 size={14} className="mt-px shrink-0" aria-hidden />}
                    <span>{message}</span>
                </p>
            )}
        </div>
    );
}
