import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { IconTile, type IconTileTone } from './IconTile';

/** On/off switch. Mirrors Figma "Toggle" (40×24). */
export function Toggle({
    checked,
    onChange,
    label,
    disabled,
    id,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    /** Spoken name; visible text usually sits beside it. */
    label: string;
    disabled?: boolean;
    id?: string;
}) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] outline-none transition-colors duration-200 ease-sx',
                'focus-visible:ring-3 focus-visible:ring-focus/60 disabled:opacity-45',
                checked ? 'bg-primary' : 'bg-line',
            )}
        >
            <span
                aria-hidden
                className={cn('size-[18px] rounded-full bg-white shadow-e1 transition-transform duration-200 ease-sx', checked && 'translate-x-4')}
            />
        </button>
    );
}

/** Figma "Toggle row": a setting with its explanation and the switch. */
export function ToggleRow({
    icon,
    tone = 'brand',
    title,
    children,
    checked,
    onChange,
    disabled,
}: {
    icon?: LucideIcon;
    tone?: IconTileTone;
    title: string;
    children?: ReactNode;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-3">
            {icon && <IconTile icon={icon} tone={tone} size={34} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-body-semibold text-ink">{title}</p>
                {children && <p className="type-small text-muted">{children}</p>}
            </div>
            <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
        </div>
    );
}
