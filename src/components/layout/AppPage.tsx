import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { DashboardHeader } from './DashboardHeader';
import { Sidebar } from './Sidebar';

/**
 * The frame every signed-in v3 page shares (Figma: Sidebar, Top bar,
 * Content). Pages pass their title and content; the frame owns the sidebar,
 * the top bar, scrolling, and the Figma content padding (24/28 on laptop,
 * 4/16 on phones, 18 or 14 between blocks).
 */
export function AppPage({
    title,
    children,
    className,
    /** Hide the sidebar offset, e.g. for parents without a sidebar. */
    noSidebarOffset = false,
}: {
    title?: string;
    children: ReactNode;
    className?: string;
    noSidebarOffset?: boolean;
}) {
    return (
        <div className="flex h-dvh overflow-hidden bg-canvas">
            <Sidebar />
            <main className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', !noSidebarOffset && 'lg:pl-[260px]')}>
                <DashboardHeader title={title} />
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className={cn('flex min-w-0 flex-col gap-3.5 px-4 pt-3 pb-8 lg:gap-[18px] lg:px-7 lg:pt-6', className)}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

/** A row of page-level controls: tabs on the left, actions on the right. */
export function PageBar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
    return (
        // Wraps rather than squeezing: when tabs and actions do not fit on one
        // line, the actions drop below instead of covering the last tab.
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="min-w-0 max-w-full">{children}</div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-md:[&>*]:flex-1 md:ml-auto">{actions}</div>}
        </div>
    );
}

/** Search and filters above a table (Figma "Toolbar"). Scrolls sideways on phones. */
export function Toolbar({ children, end }: { children: ReactNode; end?: ReactNode }) {
    return (
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">{children}</div>
            {end && <div className="shrink-0 max-md:hidden">{end}</div>}
        </div>
    );
}
