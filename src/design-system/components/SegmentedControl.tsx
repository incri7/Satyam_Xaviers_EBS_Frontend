import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../../utils/cn';

/**
 * A small set of mutually exclusive options shown side by side.
 * Mirrors Figma "Segmented". Behaves as a radio group: one tab stop,
 * arrow keys move the selection.
 *
 * Appearance:
 * - default: white pill on a sunken track (tabs, period pickers).
 * - contrast: inverse pill, for compact toggles like the language switch.
 * - onDark: for the navy brand surfaces.
 */
export interface SegmentedOption<T extends string> {
    value: T;
    label: ReactNode;
    /** Spoken name when the visible label is abbreviated (e.g. "ने"). */
    ariaLabel?: string;
    lang?: string;
}

export interface SegmentedControlProps<T extends string> {
    options: SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    'aria-label': string;
    appearance?: 'default' | 'contrast' | 'onDark';
    size?: 'sm' | 'md';
    className?: string;
}

const TRACK = {
    default: 'bg-sunken',
    contrast: 'bg-surface ring-1 ring-inset ring-line',
    onDark: 'bg-white/12 ring-1 ring-inset ring-white/20',
};
const ON = {
    default: 'bg-surface text-ink shadow-e1',
    contrast: 'bg-inverse text-on-inverse',
    onDark: 'bg-white text-sx-blue-800',
};
const OFF = {
    default: 'text-ink-2 hover:text-ink',
    contrast: 'text-ink-2 hover:text-ink',
    onDark: 'text-white/80 hover:text-white',
};

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    appearance = 'default',
    size = 'sm',
    className,
    ...aria
}: SegmentedControlProps<T>) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const i = options.findIndex((o) => o.value === value);
        const next = (i + dir + options.length) % options.length;
        onChange(options[next].value);
        refs.current[next]?.focus();
    };

    return (
        <div
            role="radiogroup"
            aria-label={aria['aria-label']}
            onKeyDown={onKeyDown}
            className={cn('inline-flex items-center gap-0.5 rounded-full p-[3px]', TRACK[appearance], className)}
        >
            {options.map((o, i) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        ref={(el) => { refs.current[i] = el; }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={o.ariaLabel}
                        lang={o.lang}
                        tabIndex={on ? 0 : -1}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'rounded-full outline-none transition-[background-color,color,box-shadow] duration-260 ease-sx',
                            'focus-visible:ring-3 focus-visible:ring-focus/60',
                            size === 'sm' ? 'min-h-7 px-2.5 type-label-s' : 'min-h-9 px-4 type-label',
                            on ? ON[appearance] : OFF[appearance],
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}
