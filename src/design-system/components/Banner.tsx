import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Inline message block. Mirrors Figma "Banner/…".
 * Errors are announced immediately (role="alert"); everything else politely.
 * Copy rule: the title says what happened, the body says what to do.
 */
export type BannerTone = 'info' | 'ok' | 'warn' | 'bad';

export interface BannerProps {
    tone?: BannerTone;
    title: ReactNode;
    children?: ReactNode;
    icon?: LucideIcon;
    action?: ReactNode;
    className?: string;
}

const TONE: Record<BannerTone, { box: string; icon: string; Icon: LucideIcon }> = {
    info: { box: 'bg-info-soft', icon: 'text-info', Icon: Info },
    ok: { box: 'bg-ok-soft', icon: 'text-ok', Icon: CheckCircle2 },
    warn: { box: 'bg-warn-soft', icon: 'text-warn', Icon: AlertTriangle },
    bad: { box: 'bg-bad-soft', icon: 'text-bad', Icon: AlertCircle },
};

export function Banner({ tone = 'info', title, children, icon, action, className }: BannerProps) {
    const t = TONE[tone];
    const Icon = icon ?? t.Icon;
    return (
        <div
            role={tone === 'bad' ? 'alert' : 'status'}
            className={cn('flex items-start gap-2.5 rounded-row px-3.5 py-3', t.box, className)}
        >
            <Icon size={18} className={cn('mt-px shrink-0', t.icon)} aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="type-small-semibold text-ink">{title}</p>
                {children && <div className="mt-0.5 type-small text-ink-2">{children}</div>}
            </div>
            {action}
        </div>
    );
}
