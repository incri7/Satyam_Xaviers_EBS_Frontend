import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NepaliDate from 'nepali-date-converter';

import { SelectField } from '../../design-system';
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
 * them; min and max are AD too and bound the years on offer.
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
    newestFirst = true,
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
    /** Years from the latest down: right for recent dates, which most are. */
    newestFirst?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const ne = i18n.language.startsWith('ne');
    const num = (n: number) => (ne ? toNepaliDigits(n) : String(n));
    const id = useId();

    // Year and month chosen but no day yet is not a date, so the parts are
    // kept here and the value is set only once all three are.
    const [parts, setParts] = useState<Bs>(() => bsOf(value));
    useEffect(() => {
        // The form changed the value (reset, edit): follow it.
        if ((value ?? '') !== toIso(parts)) setParts(bsOf(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const set = (next: Bs) => {
        if (next.y && next.m && next.d) next = { ...next, d: Math.min(next.d, daysIn(next.y, next.m)) };
        setParts(next);
        onChange(toIso(next));
    };

    const years = useMemo(() => {
        const lo = Math.max(FIRST_BS, bsOf(min).y ?? FIRST_BS);
        const hi = Math.min(LAST_BS, bsOf(max).y ?? LAST_BS);
        const list = Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
        return newestFirst ? list.reverse() : list;
    }, [min, max, newestFirst]);

    const monthName = (m: number) => {
        try {
            return new NepaliDate(parts.y ?? 2083, m - 1, 1).format('MMMM', ne ? 'np' : 'en');
        } catch {
            return num(m);
        }
    };
    // Before the month is known, every day a BS month can have (up to 32).
    const days = parts.y && parts.m ? daysIn(parts.y, parts.m) : 32;

    return (
        <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error || hint ? `${id}-msg` : undefined} disabled={disabled}>
            <legend className="mb-1.5 type-small-semibold text-ink">
                {label}
                {optional && <span className="ml-1.5 type-caption font-normal text-muted">{optional}</span>}
            </legend>
            <div className="grid grid-cols-[1.1fr_1.4fr_0.9fr] gap-2">
                <SelectField label={t('bsDate.year')} value={parts.y ?? ''} placeholder={t('bsDate.year')}
                    options={years.map((y) => ({ value: y, label: num(y) }))}
                    onChange={(e) => set({ ...parts, y: Number(e.target.value) || undefined })} />
                <SelectField label={t('bsDate.month')} value={parts.m ?? ''} placeholder={t('bsDate.month')}
                    options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }))}
                    onChange={(e) => set({ ...parts, m: Number(e.target.value) || undefined })} />
                <SelectField label={t('bsDate.day')} value={parts.d ?? ''} placeholder={t('bsDate.day')}
                    options={Array.from({ length: days }, (_, i) => ({ value: i + 1, label: num(i + 1) }))}
                    onChange={(e) => set({ ...parts, d: Number(e.target.value) || undefined })} />
            </div>
            {(error || hint) && (
                <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={error ? 'type-caption text-bad' : 'type-caption text-muted'}>{error || hint}</p>
            )}
        </fieldset>
    );
}
