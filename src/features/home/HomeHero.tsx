import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';

/**
 * Figma B03/C01/E01 hero: the navy brand gradient that leads each role's
 * home with the one thing that matters most this morning. Content on the
 * left; an optional panel on the right (a ring, a feed, a target) that
 * stacks underneath on phones.
 */
export function HomeHero({ children, side, className, label }: {
    children: ReactNode;
    side?: ReactNode;
    className?: string;
    label: string;
}) {
    return (
        <section aria-label={label}
            className={cn('relative flex flex-col gap-4 overflow-hidden rounded-[20px] bg-hero p-[18px] text-white shadow-glow-primary lg:flex-row lg:items-center lg:gap-[26px] lg:p-[26px]', className)}>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">{children}</div>
            {side}
        </section>
    );
}

/** The small status pill at the top of a hero: a coloured dot and a line. */
export function HeroChip({ children, dot = 'ok' }: { children: ReactNode; dot?: 'ok' | 'warn' | 'idle' }) {
    return (
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 py-1 pr-2.5 pl-2 ring-1 ring-inset ring-white/20 type-caption-semibold">
            <span aria-hidden className={cn('size-2 rounded-full', dot === 'ok' ? 'bg-[#5FD3A2]' : dot === 'warn' ? 'bg-sx-gold' : 'bg-white/60')} />
            {children}
        </span>
    );
}

/** The dark glass panel on the hero's right: a feed, a class at a glance, a target. */
export function HeroPanel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-2 rounded-2xl bg-[#0B1A3D]/35 p-3 ring-1 ring-inset ring-white/14', className)}>
            {title && <p className="type-micro-bold uppercase tracking-wide text-white/70">{title}</p>}
            {children}
        </div>
    );
}

/** A row inside a HeroPanel. */
export function HeroRow({ icon, children, trailing }: { icon?: ReactNode; children: ReactNode; trailing?: ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-white/8 px-2.5 py-1.5">
            {icon}
            <div className="min-w-0 flex-1">{children}</div>
            {trailing}
        </div>
    );
}

/** Loading hero: the same surface with pale bars. */
export function HeroSkeleton({ label }: { label: string }) {
    return (
        <div role="status" aria-label={label} className="flex flex-col gap-3.5 rounded-[20px] bg-hero p-[18px] lg:p-[26px]">
            {[180, 300, 420, 260].map((w, i) => (
                <span key={w} className={cn('block max-w-full animate-pulse rounded-[10px] bg-white/14', i === 1 ? 'h-10' : 'h-3.5')} style={{ width: w }} />
            ))}
        </div>
    );
}
