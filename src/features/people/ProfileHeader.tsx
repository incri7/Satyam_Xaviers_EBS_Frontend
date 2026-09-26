import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { Avatar, Skeleton } from '../../design-system';

export interface ProfileMeta {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
}

/**
 * Top of a person's profile (Figma F06/F07 "Breadcrumb" and "… header"):
 * where you are, who this is, the facts you look for first, and the actions.
 */
export function ProfileHeader({
    crumb,
    crumbTo,
    name,
    badge,
    line,
    meta,
    actions,
}: {
    crumb: string;
    crumbTo: string;
    name: string;
    badge?: ReactNode;
    line?: ReactNode;
    meta: ProfileMeta[];
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4">
            <nav aria-label={crumb} className="flex items-center gap-1.5 type-small">
                <Link to={crumbTo} className="rounded-sm font-medium text-ink-2 outline-none hover:text-primary-text focus-visible:ring-3 focus-visible:ring-focus/60">
                    {crumb}
                </Link>
                <ChevronRight size={14} className="text-muted" aria-hidden />
                <span aria-current="page" className="truncate text-muted">{name}</span>
            </nav>
            <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-e1 md:flex-row md:items-start md:gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-[18px]">
                    <Avatar name={name} size={72} className="max-md:hidden" />
                    <Avatar name={name} size={56} className="md:hidden" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="type-h2 text-ink">{name}</h1>
                            {badge}
                        </div>
                        {line && <p className="type-body text-ink-2">{line}</p>}
                        {meta.length > 0 && (
                            <dl className="mt-2 flex flex-wrap gap-x-[18px] gap-y-2">
                                {meta.map((m) => (
                                    <div key={m.label} className="flex items-center gap-1.5 type-small">
                                        <m.icon size={15} className="shrink-0 text-muted" aria-hidden />
                                        <dt className="text-muted">{m.label}</dt>
                                        <dd className="font-medium text-ink">{m.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                </div>
                {actions && <div className="flex shrink-0 flex-wrap gap-2 max-md:[&>*]:flex-1">{actions}</div>}
            </header>
        </div>
    );
}

/** The profile header's shape while the record loads. */
export function ProfileHeaderSkeleton() {
    return (
        <div aria-hidden className="flex flex-col gap-4">
            <Skeleton className="h-3.5 w-48" />
            <div className="flex items-start gap-[18px] rounded-card border border-line bg-surface p-5">
                <Skeleton className="size-[72px] shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2.5 pt-1">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-3.5 w-72" />
                    <Skeleton className="h-3 w-96 max-w-full" />
                </div>
            </div>
        </div>
    );
}
