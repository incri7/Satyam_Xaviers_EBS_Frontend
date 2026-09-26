import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

/** Rounded square holding an icon in a status tone. Mirrors Figma "icon-tile". */
export type IconTileTone = 'brand' | 'ok' | 'bad' | 'warn' | 'info' | 'neutral';

const TONE: Record<IconTileTone, string> = {
    brand: 'bg-primary-soft text-primary-text',
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    warn: 'bg-warn-soft text-warn',
    info: 'bg-info-soft text-info',
    neutral: 'bg-sunken text-ink-2',
};

export interface IconTileProps {
    icon: LucideIcon;
    tone?: IconTileTone;
    size?: number;
    className?: string;
}

export function IconTile({ icon: Icon, tone = 'brand', size = 34, className }: IconTileProps) {
    return (
        <span
            aria-hidden
            className={cn('inline-grid shrink-0 place-items-center', TONE[tone], className)}
            style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
        >
            <Icon size={Math.round(size * 0.5)} />
        </span>
    );
}
