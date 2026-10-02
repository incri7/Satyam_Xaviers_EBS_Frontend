import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { fieldBox } from './fieldBox';

/**
 * Form fields that sit beside TextField in dialogs: a native select (the
 * phone's own picker is the best one there is) and a textarea. Same label,
 * 46px box, message and error treatment as TextField.
 */
interface FieldFrameProps {
    label: string;
    hint?: ReactNode;
    error?: string;
    optional?: string;
    id: string;
    children: ReactNode;
    className?: string;
}

function FieldFrame({ label, hint, error, optional, id, children, className }: FieldFrameProps) {
    const message = error ?? hint;
    return (
        <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
            <label htmlFor={id} className="type-small-semibold text-ink">
                {label}
                {optional && <span className="font-normal text-muted"> {optional}</span>}
            </label>
            {children}
            {message && (
                <p id={`${id}-message`} className={cn('flex items-start gap-1.5 type-caption', error ? 'text-bad' : 'text-muted')}>
                    {error && <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />}
                    <span>{message}</span>
                </p>
            )}
        </div>
    );
}


export interface SelectFieldProps extends Omit<ComponentPropsWithRef<'select'>, 'size'> {
    label: string;
    hint?: ReactNode;
    error?: string;
    optional?: string;
    leftIcon?: LucideIcon;
    /** Shown first and not selectable once a value is chosen. */
    placeholder?: string;
    options: { value: string | number; label: string; disabled?: boolean }[];
    containerClassName?: string;
}

export function SelectField({ label, hint, error, optional, leftIcon: Icon, placeholder, options, containerClassName, className, id, disabled, ...rest }: SelectFieldProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <FieldFrame label={label} hint={hint} error={error} optional={optional} id={fieldId} className={containerClassName}>
            <div className="relative">
                {Icon && <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />}
                <select
                    id={fieldId}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error || hint ? `${fieldId}-message` : undefined}
                    className={cn(fieldBox(error, disabled), 'h-[46px] w-full appearance-none pr-9', Icon ? 'pl-9' : 'pl-3', className)}
                    {...rest}
                >
                    {placeholder !== undefined && <option value="">{placeholder}</option>}
                    {options.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" aria-hidden />
            </div>
        </FieldFrame>
    );
}

export interface TextAreaFieldProps extends ComponentPropsWithRef<'textarea'> {
    label: string;
    hint?: ReactNode;
    error?: string;
    optional?: string;
    containerClassName?: string;
}

export function TextAreaField({ label, hint, error, optional, containerClassName, className, id, disabled, rows = 4, ...rest }: TextAreaFieldProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <FieldFrame label={label} hint={hint} error={error} optional={optional} id={fieldId} className={containerClassName}>
            <textarea
                id={fieldId}
                rows={rows}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={error || hint ? `${fieldId}-message` : undefined}
                className={cn(fieldBox(error, disabled), 'w-full resize-y px-3 py-2.5 leading-5 placeholder:font-normal placeholder:text-muted', className)}
                {...rest}
            />
        </FieldFrame>
    );
}

/** Two fields side by side from sm up, stacked on phones (Figma "row", 12px apart). */
export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('grid gap-3 sm:grid-cols-2', className)}>{children}</div>;
}

/** A labelled group of fields inside a longer form. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-1 type-caption-semibold text-muted">{title}</legend>
            {children}
        </fieldset>
    );
}
