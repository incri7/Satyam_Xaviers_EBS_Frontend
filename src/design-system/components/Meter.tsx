import { cn } from '../../utils/cn';

/**
 * Thin horizontal gauge. Mirrors Figma "Meter" (sunken track, rounded fill).
 * Used for password strength here; progress and capacity bars later.
 */
export type MeterTone = 'ok' | 'warn' | 'bad' | 'brand' | 'info';

const TONE: Record<MeterTone, string> = {
    ok: 'bg-ok',
    warn: 'bg-warn',
    bad: 'bg-bad',
    brand: 'bg-primary',
    info: 'bg-info',
};

export interface MeterProps {
    /** 0 to 1. */
    value: number;
    tone?: MeterTone;
    /** Track height in px. */
    height?: number;
    /** Spoken description, e.g. "Password strength: Strong". */
    label: string;
    className?: string;
}

export function Meter({ value, tone = 'brand', height = 6, label, className }: MeterProps) {
    const v = Math.max(0, Math.min(1, value));
    return (
        <div
            role="meter"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(v * 100)}
            className={cn('w-full overflow-hidden rounded-full bg-sunken', className)}
            style={{ height }}
        >
            <div
                className={cn('h-full rounded-full transition-[width,background-color] duration-260 ease-sx', TONE[tone])}
                style={{ width: `${v * 100}%` }}
            />
        </div>
    );
}
