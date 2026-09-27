import { cn } from '../../utils/cn';

const TONE = {
    ok: 'stroke-ok',
    warn: 'stroke-warn',
    bad: 'stroke-bad',
    brand: 'stroke-primary',
    white: 'stroke-white',
} as const;

/**
 * A progress ring with its figure in the middle (Figma "ring"): attendance
 * present, registers saved. On the navy hero pass `onDark` for a white ring
 * on a pale track.
 */
export function Ring({ value, size = 116, stroke = 11, tone = 'ok', label, sub, onDark, className }: {
    /** 0 to 1. */
    value: number;
    size?: number;
    stroke?: number;
    tone?: keyof typeof TONE;
    label: string;
    sub?: string;
    onDark?: boolean;
    className?: string;
}) {
    const v = Math.max(0, Math.min(1, value));
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}
            role="img" aria-label={sub ? `${label} ${sub}` : label}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={onDark ? 'stroke-white/18' : 'stroke-sunken'} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - v)}
                    className={cn('transition-[stroke-dashoffset] duration-[1400ms] ease-sx', onDark ? TONE.white : TONE[tone])} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(size >= 110 ? 'type-figure-l' : 'type-figure-m', onDark ? 'text-white' : 'text-ink')}>{label}</span>
                {sub && <span className={cn('type-caption', onDark ? 'text-white/75' : 'text-muted')}>{sub}</span>}
            </div>
        </div>
    );
}
