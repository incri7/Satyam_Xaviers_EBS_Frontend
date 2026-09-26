import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { IconTile, type IconTileTone } from './IconTile';

/**
 * Modal dialog. Mirrors Figma "Dialog/…" (laptop) and "Sheet/…" (phone):
 *
 * - From sm up: centred panel, 24px radius, on a navy scrim.
 * - Phone: bottom sheet with a grab handle; the footer buttons stack full
 *   width with the main action on top.
 *
 * Header (tile, eyebrow, title, one line of context, close), an optional
 * stepper, a body that scrolls on its own, and a footer that stays put.
 *
 * Behaviour: focus moves into the dialog and is trapped there, Escape and a
 * scrim click close it (unless `dismissible` is false, e.g. while saving),
 * the page behind stops scrolling, and focus returns to the opener on close.
 */
export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: ReactNode;
    /** Small line above the title, e.g. "Step 2 of 3". */
    eyebrow?: string;
    icon?: LucideIcon;
    iconTone?: IconTileTone;
    size?: 'sm' | 'md' | 'lg';
    /** Sits between the header and the body (Figma "Stepper"). */
    stepper?: ReactNode;
    footer?: ReactNode;
    /** Omit (or pass null) for a dialog that is only a question and its buttons. */
    children?: ReactNode;
    /** Use "alertdialog" for confirmations. */
    role?: 'dialog' | 'alertdialog';
    /** Focused on open; defaults to the first field or button in the body. */
    initialFocus?: RefObject<HTMLElement | null>;
    /** False while an action runs, so a stray Escape cannot lose the work. */
    dismissible?: boolean;
    closeLabel?: string;
    /** Render the body as a <form>; the footer's submit button submits it. */
    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
    className?: string;
}

const WIDTH = { sm: 'sm:max-w-[480px]', md: 'sm:max-w-[600px]', lg: 'sm:max-w-[760px]' };
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({
    open,
    onClose,
    title,
    subtitle,
    eyebrow,
    icon,
    iconTone = 'brand',
    size = 'md',
    stepper,
    footer,
    children,
    role = 'dialog',
    initialFocus,
    dismissible = true,
    closeLabel = 'Close',
    onSubmit,
    className,
}: DialogProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const subtitleId = useId();
    // Latest values for the listeners below, without re-running the effect.
    const dismissRef = useRef({ dismissible, onClose });
    useEffect(() => { dismissRef.current = { dismissible, onClose }; });

    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const target =
            initialFocus?.current ??
            bodyRef.current?.querySelector<HTMLElement>('input,select,textarea') ??
            panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
            panelRef.current;
        target?.focus({ preventScroll: true });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && dismissRef.current.dismissible) {
                e.stopPropagation();
                dismissRef.current.onClose();
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            opener?.focus?.({ preventScroll: true });
        };
    }, [open, initialFocus]);

    if (!open) return null;

    const content = (
        <>
        {children != null && children !== false && (
            <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pt-1.5 pb-5 sm:gap-4 sm:px-7 sm:pb-6">
                {children}
            </div>
        )}
        {footer && (
            <div
                className={cn(
                    'flex shrink-0 flex-col-reverse gap-2.5 border-t border-line-subtle bg-surface px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),22px)]',
                    'sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:pt-4 sm:pb-[22px]',
                    '[&>*]:max-sm:w-full',
                )}
            >
                {footer}
            </div>
        )}
        </>
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0b1220]/45 backdrop-blur-[2px] sm:items-center sm:p-6"
            onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose(); }}
        >
            <div
                ref={panelRef}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={subtitle ? subtitleId : undefined}
                tabIndex={-1}
                className={cn(
                    'flex max-h-[94dvh] w-full animate-rise flex-col overflow-hidden bg-surface font-ui text-ink shadow-e3 outline-none',
                    'rounded-t-[28px] sm:max-h-[90dvh] sm:rounded-dialog',
                    WIDTH[size],
                    className,
                )}
            >
                <div aria-hidden className="flex justify-center pt-2.5 pb-1 sm:hidden">
                    <span className="h-[5px] w-10 rounded-full bg-line" />
                </div>

                <div className="flex shrink-0 items-start gap-3.5 px-5 pt-2.5 pb-3.5 sm:px-7 sm:pt-[26px] sm:pb-[18px]">
                    {icon && (
                        <>
                            <IconTile icon={icon} tone={iconTone} size={40} className="sm:hidden" />
                            <IconTile icon={icon} tone={iconTone} size={44} className="hidden sm:inline-grid" />
                        </>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        {eyebrow && <p className="type-caption-semibold text-primary-text">{eyebrow}</p>}
                        <h2 id={titleId} className="type-h3 text-ink sm:type-h2">{title}</h2>
                        {subtitle && <p id={subtitleId} className="type-small text-muted">{subtitle}</p>}
                    </div>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={closeLabel}
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 outline-none transition-colors hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60"
                        >
                            <X size={18} aria-hidden />
                        </button>
                    )}
                </div>

                {stepper && <div className="shrink-0 px-5 pb-4 sm:px-7 sm:pb-5">{stepper}</div>}

                {onSubmit ? (
                    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
                        {content}
                    </form>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">{content}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
