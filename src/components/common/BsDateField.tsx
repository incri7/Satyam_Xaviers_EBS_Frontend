import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown } from 'lucide-react';
import NepaliDate from 'nepali-date-converter';

import { fieldBox } from '../../design-system';
import { cn } from '../../utils/cn';
import { bsMonthBounds, isoLocal, parseDate, toNepaliDigits } from '../../utils/nepaliDate';

/** The converter's range: 1 Baisakh 2000 to the end of 2090. */
const FIRST_BS = 2000;
const LAST_BS = 2090;

interface Bs { y?: number; m?: number; d?: number }

const bsOf = (iso?: string | null): Bs => {
    const date = parseDate(iso ?? '');
    if (!date) return {};
    try {
        const bs = new NepaliDate(date).getBS();
        return { y: bs.year, m: bs.month + 1, d: bs.date };
    } catch {
        return {};
    }
};

const daysIn = (y: number, m: number) => {
    const b = bsMonthBounds(y, m);
    if (!b) return 30;
    return Math.round((Date.parse(b.end) - Date.parse(b.start)) / 86_400_000) + 1;
};

const toIso = ({ y, m, d }: Bs): string => {
    if (!y || !m || !d) return '';
    try {
        return isoLocal(new NepaliDate(y, m - 1, Math.min(d, daysIn(y, m))).toJsDate());
    } catch {
        return '';
    }
};

/**
 * A date picked in Bikram Sambat: year, month, day. Staff typed AD dates in
 * mm/dd/yyyy and read the BS date under them; the school works in BS.
 * The value is still an AD date (YYYY-MM-DD), as the API and database keep
 * them; min and max are AD too and bound the years on offer (without them,
 * ten years back and two ahead).
 *
 * `compact` is for filter bars and table rows: smaller boxes, and the label
 * can be hidden (it is still read out) with `hideLabel`.
 */
export function BsDateField({
    label,
    value,
    onChange,
    min,
    max,
    error,
    hint,
    optional,
    disabled,
    newestFirst,
    compact = false,
    hideLabel = false,
    className,
}: {
    label: string;
    value: string | null | undefined;
    onChange: (iso: string) => void;
    min?: string;
    max?: string;
    error?: string;
    hint?: string;
    optional?: string;
    disabled?: boolean;
    /** Years from the latest down. By default yes, except for a field that
        only takes today or later (a notice's start, a due date). */
    newestFirst?: boolean;
    compact?: boolean;
    hideLabel?: boolean;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    const ne = i18n.language.startsWith('ne');
    const num = (n: number) => (ne ? toNepaliDigits(n) : String(n));
    const id = useId();

    // Year and month chosen but no day yet is not a date, so the parts are
    // kept here and the value is set only once all three are.
    const [parts, setParts] = useState<Bs>(() => bsOf(value));
    useEffect(() => {
        // The form changed the value (reset, edit, a default): follow it.
        if ((value ?? '') !== toIso(parts)) setParts(bsOf(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const set = (next: Bs) => {
        if (next.y && next.m && next.d) next = { ...next, d: Math.min(next.d, daysIn(next.y, next.m)) };
        setParts(next);
        onChange(toIso(next));
    };

    const years = useMemo(() => {
        const now = bsOf(isoLocal(new Date())).y ?? 2083;
        let lo = Math.max(FIRST_BS, bsOf(min).y ?? now - 10);
        let hi = Math.min(LAST_BS, bsOf(max).y ?? now + 2);
        // A saved date outside the usual range is still shown as itself.
        const held = bsOf(value).y;
        if (held) { lo = Math.min(lo, held); hi = Math.max(hi, held); }
        const list = Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
        const desc = newestFirst ?? !(min && min >= isoLocal(new Date()));
        return desc ? list.reverse() : list;
    }, [min, max, newestFirst, value]);

    const monthName = (m: number) => {
        try {
            return new NepaliDate(parts.y ?? 2083, m - 1, 1).format('MMMM', ne ? 'np' : 'en');
        } catch {
            return num(m);
        }
    };
    // Before the month is known, every day a BS month can have (up to 32).
    const days = parts.y && parts.m ? daysIn(parts.y, parts.m) : 32;

    const select = (key: 'y' | 'm' | 'd', aria: string, options: { value: number; label: string }[]) => (
        <div className="relative min-w-0">
            <select
                aria-label={`${label}: ${aria}`}
                aria-invalid={error ? true : undefined}
                disabled={disabled}
                value={parts[key] ?? ''}
                onChange={(e) => set({ ...parts, [key]: Number(e.target.value) || undefined })}
                className={cn(fieldBox(error, disabled), 'w-full appearance-none pl-3 pr-8', compact ? 'h-[38px] text-sm' : 'h-[46px]')}
            >
                <option value="">{aria}</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" aria-hidden />
        </div>
    );

    return (
        <fieldset className={cn('flex min-w-0 flex-col gap-1.5', className)} aria-describedby={error || hint ? `${id}-msg` : undefined}>
            <legend className={cn('mb-1.5 type-small-semibold text-ink', hideLabel && 'sr-only')}>
                {label}
                {optional && <span className="font-normal text-muted"> {optional}</span>}
            </legend>
            <div className={cn('grid gap-2', compact ? 'grid-cols-[4.5rem_6.5rem_3.75rem] gap-1.5' : 'grid-cols-[1.1fr_1.4fr_0.9fr]')}>
                {select('y', t('bsDate.year'), years.map((y) => ({ value: y, label: num(y) })))}
                {select('m', t('bsDate.month'), Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) })))}
                {select('d', t('bsDate.day'), Array.from({ length: days }, (_, i) => ({ value: i + 1, label: num(i + 1) })))}
            </div>
            {(error || hint) && (
                <p id={`${id}-msg`} className={cn('flex items-start gap-1.5 type-caption', error ? 'text-bad' : 'text-muted')}>
                    {error && <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />}
                    <span>{error || hint}</span>
                </p>
            )}
        </fieldset>
    );
}
