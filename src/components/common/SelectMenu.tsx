import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

    // Decide direction from the space actually available, before paint.
    useLayoutEffect(() => {
        if (!open || !rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom;
        const above = rect.top;
        const wanted = Math.min(options.length * 40 + 8, 288);
        setFlip(below < wanted && above > below);
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    }, [open, options, value]);

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
            setOpen(true);
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
                onClick={() => setOpen((o) => !o)}
                onKeyDown={onTriggerKey}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={label}
                className={cn(
                    'w-full inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-xl',
                    'bg-slate-50 text-sm font-bold text-slate-700 whitespace-nowrap',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    'hover:bg-slate-100 transition-colors',
                )}
            >
                {icon}
                <span className="flex-1 text-left truncate">{selected?.label}</span>
                <ChevronDown
                    className={cn('w-4 h-4 text-slate-400 transition-transform shrink-0', open && 'rotate-180')}
                />
            </button>

            {open && (
                <ul
                    id={listId}
                    ref={listRef}
                    role="listbox"
                    aria-label={label}
                    className={cn(
                        'absolute z-50 min-w-full w-max max-w-[18rem] max-h-72 overflow-y-auto',
                        'bg-white rounded-xl border border-slate-100 shadow-lg shadow-slate-200/60 p-1',
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
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer',
                                    i === active ? 'bg-slate-100 text-slate-900' : 'text-slate-600',
                                )}
                            >
                                <Check
                                    className={cn(
                                        'w-4 h-4 shrink-0 text-brand',
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
