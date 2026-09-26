import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '../../utils/cn';

export interface SelectOption {
    value: string;
    label: string;
}

/**
 * A dropdown we position ourselves.
 *
 * A native <select> hands popup placement to the browser, which flips the list
 * upward whenever the control sits low in the viewport — with sixteen classes
 * the menu covered the toolbar above it. Popup placement is not reachable from
 * CSS, so the only way to keep the list under its trigger is to draw it.
 *
 * Opens downward, capped in height and scrollable; only flips up when there
 * genuinely is not room below and there is more room above.
 */
export const SelectMenu: React.FC<{
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    label: string;
    icon?: React.ReactNode;
    className?: string;
}> = ({ value, options, onChange, label, icon, className }) => {
    const [open, setOpen] = useState(false);
    const [flip, setFlip] = useState(false);
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const selected = options.find((o) => o.value === value) ?? options[0];

    // Close on an outside click or Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Decide direction from the space actually available as it opens.
    const openMenu = () => {
        if (rootRef.current) {
            const rect = rootRef.current.getBoundingClientRect();
            const below = window.innerHeight - rect.bottom;
            const above = rect.top;
            const wanted = Math.min(options.length * 40 + 8, 288);
            setFlip(below < wanted && above > below);
        }
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        setOpen(true);
    };

    // Keep the highlighted option in view while arrowing through a long list.
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    const choose = (v: string) => {
        onChange(v);
        setOpen(false);
    };

    const onTriggerKey = (e: React.KeyboardEvent) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openMenu();
            return;
        }
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose(options[active].value);
        } else if (e.key === 'Home') {
            e.preventDefault();
            setActive(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            setActive(options.length - 1);
        }
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openMenu())}
                onKeyDown={onTriggerKey}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={label}
                className={cn(
                    'inline-flex h-[46px] w-full items-center gap-2 whitespace-nowrap rounded-field border border-line bg-surface px-3 font-ui md:h-10',
                    'type-small-medium text-ink outline-none transition-colors hover:bg-surface-2',
                    'focus-visible:ring-3 focus-visible:ring-focus/60 [&>svg:first-child]:size-4 [&>svg:first-child]:text-muted',
                )}
            >
                {icon}
                <span className="flex-1 text-left truncate">{selected?.label}</span>
                <ChevronDown
                    className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
                />
            </button>

            {open && (
                <ul
                    id={listId}
                    ref={listRef}
                    role="listbox"
                    aria-label={label}
                    className={cn(
                        'absolute z-50 max-h-72 w-max min-w-full max-w-[18rem] overflow-y-auto font-ui',
                        'rounded-row border border-line bg-surface p-1.5 shadow-e3',
                        flip ? 'bottom-full mb-2' : 'top-full mt-2',
                    )}
                >
                    {options.map((o, i) => {
                        const isSelected = o.value === value;
                        return (
                            <li
                                key={o.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => choose(o.value)}
                                onMouseEnter={() => setActive(i)}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 type-small-medium',
                                    i === active ? 'bg-sunken text-ink' : 'text-ink-2',
                                )}
                            >
                                <Check
                                    className={cn(
                                        'size-4 shrink-0 text-primary',
                                        isSelected ? 'opacity-100' : 'opacity-0',
                                    )}
                                />
                                <span className="truncate">{o.label}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default SelectMenu;
