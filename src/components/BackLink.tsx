import { Link, type To } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { cn } from '../utils/cn';

/** "← Back to …" above a page heading. Figma: "Back link". */
export function BackLink({ to, children, className }: { to: To; children: string; className?: string }) {
    return (
        <Link
            to={to}
            className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-sm type-small-semibold text-ink-2 outline-none',
                'transition-colors hover:text-primary-text focus-visible:ring-3 focus-visible:ring-focus/60',
                className,
            )}
        >
            <ArrowLeft size={16} aria-hidden />
            {children}
        </Link>
    );
}
