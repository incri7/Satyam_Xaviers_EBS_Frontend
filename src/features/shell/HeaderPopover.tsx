import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../utils/cn';

/**
 * A panel that drops from the top bar (Figma "Popover/…"). Laptop: anchored
 * under its button. Phone: full width below the bar. Closes on Escape and
 * on a click outside; focus moves into it on open.
 */
export function HeaderPopover({ open, onClose, label, className, children }: {
    open: boolean;
    onClose: () => void;
    label: string;
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            // The toggle button handles its own clicks.
            if (!ref.current?.contains(target) && !target.closest('[data-popover-toggle]')) onClose();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        ref.current?.querySelector<HTMLElement>('[data-autofocus], button, input')?.focus();
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} role="dialog" aria-label={label}
            className={cn(
                'fixed inset-x-2 top-[64px] z-50 flex max-h-[calc(100dvh-80px)] animate-rise flex-col overflow-hidden rounded-card border border-line bg-surface shadow-e3',
                'lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:max-h-[min(640px,calc(100dvh-100px))] lg:w-[420px]',
                className,
            )}>
            {children}
        </div>
    );
}
