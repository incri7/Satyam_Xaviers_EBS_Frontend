import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Avatar } from '../../design-system';
import { cn } from '../../utils/cn';

export interface PersonDetail {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
}

/**
 * Card view of one person. Mirrors Figma "Teacher card": avatar and name
 * with a status badge, a few labelled details, and the actions along the foot
 * (the main one on the left, icon buttons on the right).
 */
export function PersonCard({
    name,
    sub,
    src,
    badge,
    details,
    primaryAction,
    actions,
    muted,
}: {
    name: string;
    sub?: ReactNode;
    src?: string | null;
    badge?: ReactNode;
    details: PersonDetail[];
    primaryAction?: ReactNode;
    actions?: ReactNode;
    /** Inactive records sit back a little. */
    muted?: boolean;
}) {
    return (
        <article className={cn('flex min-w-0 flex-col gap-3.5 rounded-card border border-line bg-surface p-[18px] shadow-e1', muted && 'opacity-70')}>
            <header className="flex items-start gap-3">
                <Avatar name={name} src={src} size={46} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="truncate type-title text-ink">{name}</h3>
                    {sub && <p className="truncate type-caption text-muted">{sub}</p>}
                </div>
                {badge}
            </header>
            <dl className="flex flex-col gap-2">
                {details.map((d) => (
                    <div key={d.label} className="flex min-w-0 items-center gap-2 type-small">
                        <d.icon size={15} className="shrink-0 text-muted" aria-hidden />
                        <dt className="shrink-0 text-muted">{d.label}</dt>
                        <dd className="min-w-0 truncate font-medium text-ink">{d.value}</dd>
                    </div>
                ))}
            </dl>
            {(primaryAction || actions) && (
                <footer className="mt-auto flex items-center gap-2 border-t border-line-subtle pt-3">
                    {primaryAction}
                    <div className="ml-auto flex items-center gap-2">{actions}</div>
                </footer>
            )}
        </article>
    );
}
