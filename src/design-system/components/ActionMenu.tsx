import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';

export interface ActionMenuItem {
    label: string;
    icon?: LucideIcon;
    onSelect: () => void;
    tone?: 'bad';
    disabled?: boolean;
    hidden?: boolean;
}

/**
 * "More" menu for a row (Figma "Action/MoreHorizontal"). Holds the actions a
 * row has room for only once: deactivate, reset password, delete.
 */
export function ActionMenu({ label, items, align = 'end' }: { label: string; items: ActionMenuItem[]; align?: 'start' | 'end' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const visible = items.filter((i) => !i.hidden);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        rootRef.current?.querySelector<HTMLElement>('[role=menuitem]:not([disabled])')?.focus();
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (visible.length === 0) return null;

    return (
        <div ref={rootRef} className="relative">
            <IconButton
                icon={MoreHorizontal}
                label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onClick={() => setOpen((v) => !v)}
            />
            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label={label}
                    className={cn(
                        'absolute top-full z-40 mt-1.5 min-w-48 animate-rise rounded-row border border-line bg-surface p-1.5 shadow-e3',
                        align === 'end' ? 'right-0' : 'left-0',
                    )}
                >
                    {visible.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                disabled={item.disabled}
                                onClick={() => { setOpen(false); item.onSelect(); }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-left type-small-medium outline-none transition-colors',
                                    'focus-visible:bg-sunken disabled:opacity-45',
                                    item.tone === 'bad' ? 'text-bad hover:bg-bad-soft' : 'text-ink hover:bg-sunken',
                                )}
                            >
                                {Icon && <Icon size={16} aria-hidden />}
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
