import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';

/** "Aarav Shrestha" → "AS"; one word gives one letter. */
function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
}

// Soft tones from Figma avatars; a name always gets the same one.
const TONES = [
    'bg-primary-soft-line text-primary-text',
    'bg-warn-soft text-warn',
    'bg-ok-soft text-ok',
    'bg-info-soft text-info',
    'bg-bad-soft text-bad',
];

function toneFor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return TONES[h % TONES.length];
}

/** Round initials (or photo). Mirrors Figma "Avatar": 32 in tables, 40 in lists. */
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
    const style = { width: size, height: size };
    // Old records carry the literal placeholder "string" from the API docs.
    if (src && src !== 'string') {
        return <img src={src} alt="" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />;
    }
    return (
        <span
            aria-hidden
            style={style}
            className={cn('grid shrink-0 place-items-center rounded-full type-caption-semibold', toneFor(name), size >= 40 && 'type-small-semibold', className)}
        >
            {initials(name)}
        </span>
    );
}

/** Figma "Person": avatar, name, and one line under it. */
export function Person({
    name,
    sub,
    src,
    size = 32,
    trailing,
}: {
    name: string;
    sub?: ReactNode;
    src?: string | null;
    size?: number;
    trailing?: ReactNode;
}) {
    return (
        <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={name} src={src} size={size} />
            <span className="flex min-w-0 flex-col gap-px">
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate type-body-semibold text-ink">{name}</span>
                    {trailing}
                </span>
                {sub && <span className="truncate type-caption text-muted">{sub}</span>}
            </span>
        </span>
    );
}
