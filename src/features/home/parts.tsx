import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, RotateCw } from 'lucide-react';

import { Button, IconTile, Skeleton, type IconTileTone } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useWelcome } from '../shell/identity';
import { cn } from '../../utils/cn';

/** Greeting at the top of every home: "Good morning, Hari", role and date. */
export function HomeGreeting({ action }: { action?: ReactNode }) {
    const welcome = useWelcome();
    const df = useDateFormat();
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h1 className="type-h2 text-ink lg:type-h1">{welcome.greeting}, {welcome.name}</h1>
                <p className="type-small text-muted">{welcome.role} · {df.date(new Date(), 'long')}</p>
            </div>
            {action}
        </div>
    );
}

/** A list row: tile, two lines, something on the right. */
export function ItemRow({ icon, tone = 'brand', title, sub, trailing, divider = true, className }: {
    icon: LucideIcon;
    tone?: IconTileTone;
    title: ReactNode;
    sub?: ReactNode;
    trailing?: ReactNode;
    divider?: boolean;
    className?: string;
}) {
    return (
        <li className={cn('flex items-center gap-3 py-2.5', divider && 'border-b border-line-subtle last:border-b-0', className)}>
            <IconTile icon={icon} tone={tone} size={34} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-body-semibold text-ink">{title}</p>
                {sub && <p className="type-small text-muted">{sub}</p>}
            </div>
            {trailing}
        </li>
    );
}

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-3" role="status">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-[34px] shrink-0 rounded-[11px]" />
                    <div className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-3 w-3/5" /><Skeleton className="h-2.5 w-2/5" /></div>
                </div>
            ))}
        </div>
    );
}

/** Dashed box for a card with nothing in it yet. */
export function InlineEmpty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-1.5 rounded-row border border-dashed border-line bg-surface-2 px-4 py-5 text-center">
            <Icon size={20} className="text-muted" aria-hidden />
            <p className="type-small-semibold text-ink-2">{title}</p>
            {children && <p className="max-w-[360px] type-caption text-muted">{children}</p>}
            {action}
        </div>
    );
}

/** A card's own error: the rest of the page keeps working. */
export function InlineError({ title, onRetry }: { title: string; onRetry: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-2 rounded-row bg-bad-soft/60 px-4 py-5 text-center">
            <AlertCircle size={20} className="text-bad" aria-hidden />
            <p className="type-small-semibold text-ink">{title}</p>
            <Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={onRetry}>{t('classesPage.action.retry')}</Button>
        </div>
    );
}
