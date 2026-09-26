import { useRef, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

export interface TabItem<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
    count?: number | string;
}

/**
 * Section tabs. Mirrors Figma "People tabs":
 *
 * - From md up: pills in a white track, the active one inverse.
 * - Phone: a scrolling underline row with count badges.
 *
 * A tab list with arrow-key movement; the panels are the caller's.
 */
export function Tabs<T extends string>({
    items,
    value,
    onChange,
    'aria-label': ariaLabel,
    variant = 'pill',
    className,
}: {
    items: TabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    'aria-label': string;
    /** "underline" at every size (Figma "Profile tabs"); "pill" from md up. */
    variant?: 'pill' | 'underline';
    className?: string;
}) {
    const under = variant === 'underline';
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const onKey = (e: KeyboardEvent, index: number) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (index + step + items.length) % items.length;
        refs.current[next]?.focus();
        onChange(items[next].value);
    };

    return (
        <div
            className={cn(
                under
                    ? 'overflow-x-auto border-b border-line [scrollbar-width:none] max-md:-mx-4 max-md:px-4'
                    : cn(
                        'max-md:-mx-4 max-md:overflow-x-auto max-md:border-b max-md:border-line max-md:px-4 max-md:[scrollbar-width:none]',
                        'md:w-fit md:rounded-full md:bg-surface md:p-1 md:ring-1 md:ring-inset md:ring-line',
                    ),
                className,
            )}
        >
            <div role="tablist" aria-label={ariaLabel} className={cn('flex w-max', under ? 'gap-[26px]' : 'gap-[18px] md:gap-0.5')}>
                {items.map((item, i) => {
                    const on = item.value === value;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.value}
                            ref={(el) => { refs.current[i] = el; }}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            tabIndex={on ? 0 : -1}
                            onClick={() => onChange(item.value)}
                            onKeyDown={(e) => onKey(e, i)}
                            className={cn(
                                'flex shrink-0 items-center gap-2 whitespace-nowrap type-body-semibold outline-none transition-colors duration-150',
                                'focus-visible:ring-3 focus-visible:ring-focus/60',
                                under
                                    ? cn('-mb-px border-b-2 px-0.5 pt-3 pb-[11px]', on ? 'border-primary text-primary-text' : 'border-transparent text-ink-2 hover:text-ink')
                                    : cn(
                                        // phone: underline
                                        'max-md:-mb-px max-md:border-b-2 max-md:px-0.5 max-md:pt-3 max-md:pb-[11px]',
                                        on ? 'max-md:border-primary max-md:text-primary-text' : 'max-md:border-transparent max-md:text-ink-2',
                                        // md+: pill
                                        'md:h-9 md:rounded-full md:px-3.5',
                                        on ? 'md:bg-inverse md:text-on-inverse' : 'md:text-ink-2 md:hover:bg-sunken',
                                    ),
                            )}
                        >
                            {Icon && !under && <Icon size={16} aria-hidden className="max-md:hidden" />}
                            {item.label}
                            {item.count !== undefined && (
                                <span
                                    className={cn(
                                        'rounded-full px-[7px] py-px type-caption-semibold max-md:px-2.5 max-md:py-[3px]',
                                        under
                                            ? cn('px-2.5 py-[3px]', on ? 'bg-primary-soft text-primary-text' : 'bg-sunken text-ink-2')
                                            : on ? 'max-md:bg-primary-soft max-md:text-primary-text md:bg-white/20 md:text-on-inverse' : 'bg-sunken text-ink-2',
                                    )}
                                >
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
