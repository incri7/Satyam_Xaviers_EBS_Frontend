import type { ComponentPropsWithRef } from 'react';
import { Search, X } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Toolbar search. Mirrors Figma "Search": 40px on laptop, 46px on phones
 * (with 16px text so iOS does not zoom). A clear button appears once there is
 * something to clear.
 */
export interface SearchFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'onChange' | 'value' | 'size'> {
    value: string;
    onChange: (value: string) => void;
    clearLabel?: string;
    containerClassName?: string;
}

export function SearchField({ value, onChange, placeholder, clearLabel = 'Clear search', containerClassName, className, ...rest }: SearchFieldProps) {
    return (
        <div
            className={cn(
                'flex h-[46px] items-center gap-2 rounded-field border border-line bg-surface px-3.5 md:h-10',
                'transition-[border-color,box-shadow] duration-150 focus-within:border-sx-blue-500 focus-within:shadow-[0_0_0_4px_rgb(44_107_192/0.18)]',
                containerClassName,
            )}
        >
            <Search size={16} className="shrink-0 text-muted" aria-hidden />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={rest['aria-label'] ?? placeholder}
                className={cn(
                    'h-full min-w-0 flex-1 bg-transparent font-ui text-base text-ink outline-none placeholder:text-muted md:text-sm',
                    '[&::-webkit-search-cancel-button]:hidden',
                    className,
                )}
                {...rest}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label={clearLabel}
                    className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted outline-none hover:bg-sunken hover:text-ink-2 focus-visible:ring-3 focus-visible:ring-focus/60"
                >
                    <X size={14} aria-hidden />
                </button>
            )}
        </div>
    );
}
