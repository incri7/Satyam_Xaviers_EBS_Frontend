import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Nothing to show, and what to do about it. Mirrors Figma empty states:
 * a soft illustration tile, a title, one sentence, and at most one action.
 * `tone="bad"` is the load-failed variant.
 */
export function EmptyState({
    icon: Icon,
    title,
    children,
    action,
    tone = 'brand',
    className,
}: {
    icon: LucideIcon;
    title: string;
    children?: ReactNode;
    action?: ReactNode;
    tone?: 'brand' | 'bad';
    className?: string;
}) {
    return (
        <div role={tone === 'bad' ? 'alert' : undefined} className={cn('flex flex-col items-center gap-2 px-6 py-10 text-center', className)}>
            <span
                aria-hidden
                className={cn(
                    'mb-1 grid size-16 place-items-center rounded-[20px] border',
                    tone === 'bad' ? 'border-bad-line bg-bad-soft text-bad' : 'border-primary-soft-line bg-primary-soft text-primary-text',
                )}
            >
                <Icon size={26} />
            </span>
            <p className="type-title text-ink">{title}</p>
            {children && <p className="max-w-[360px] type-small text-muted">{children}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
