import { cn } from '../../utils/cn';

export interface FilterChip<T extends string> {
    value: T;
    label: string;
    count?: number | string;
}

/**
 * Figma "Filter chips": one choice from a short list, each with its count
 * ("All 8 · Salaries 1 · Utilities 2"). Scrolls sideways on phones rather
 * than wrapping into a second row.
 */
export function FilterChips<T extends string>({ items, value, onChange, 'aria-label': ariaLabel, className }: {
    items: FilterChip<T>[];
    value: T;
    onChange: (value: T) => void;
    'aria-label': string;
    className?: string;
}) {
    return (
        <div role="group" aria-label={ariaLabel}
            className={cn('flex gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none] md:flex-wrap [&>*]:shrink-0', className)}>
            {items.map((item) => {
                const on = item.value === value;
                return (
                    <button key={item.value} type="button" aria-pressed={on} onClick={() => onChange(item.value)}
                        className={cn(
                            'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 type-small-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-focus/60',
                            on ? 'border-inverse bg-inverse text-on-inverse' : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
                        )}>
                        {item.label}
                        {item.count !== undefined && (
                            <span className={cn('rounded-full px-1.5 type-caption-semibold tabular-nums', on ? 'bg-on-inverse/15' : 'bg-sunken text-muted')}>{item.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
