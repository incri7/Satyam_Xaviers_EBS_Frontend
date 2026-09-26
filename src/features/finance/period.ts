import NepaliDate from 'nepali-date-converter';

import { bsMonthStart, isoLocal } from '../../utils/nepaliDate';

/** Figma E02 period switch: This month, This term, Academic year. */
export type Period = 'month' | 'term' | 'year';

/** Inclusive calendar days, YYYY-MM-DD, as /finances/ledger and /summary take them. */
export interface DateRange {
    start: string;
    end: string;
}

/** The Nepali month so far: 1 Aswin to today. */
export function monthRange(now: Date = new Date()): DateRange {
    return { start: isoLocal(bsMonthStart(now) ?? now), end: isoLocal(now) };
}

/** The BS month before this one, whole. */
export function previousMonthRange(now: Date = new Date()): DateRange | null {
    const start = bsMonthStart(now);
    if (!start) return null;
    const lastDay = new Date(start);
    lastDay.setDate(lastDay.getDate() - 1);
    return { start: isoLocal(bsMonthStart(lastDay) ?? lastDay), end: isoLocal(lastDay) };
}

/** 1 Baisakh of the current BS year to today: the school's financial year so far. */
export function yearRange(now: Date = new Date()): DateRange {
    try {
        const bs = new NepaliDate(now).getBS();
        return { start: isoLocal(new NepaliDate(bs.year, 0, 1).toJsDate()), end: isoLocal(now) };
    } catch {
        const start = new Date(now.getFullYear() - (now.getMonth() < 3 ? 1 : 0), 3, 14);
        return { start: isoLocal(start), end: isoLocal(now) };
    }
}

/**
 * One range per BS month from Baisakh to this month, the last one cut at
 * today. The monthly in/out chart asks /summary once per month, so each bar
 * is the same figure the ledger shows for that month.
 */
export function monthsOfYear(now: Date = new Date()): (DateRange & { mid: Date; partial: boolean })[] {
    try {
        const bs = new NepaliDate(now).getBS();
        const today = isoLocal(now);
        return Array.from({ length: bs.month + 1 }, (_, m) => {
            const start = new NepaliDate(bs.year, m, 1).toJsDate();
            const next = m === 11 ? new NepaliDate(bs.year + 1, 0, 1).toJsDate() : new NepaliDate(bs.year, m + 1, 1).toJsDate();
            next.setDate(next.getDate() - 1);
            const end = isoLocal(next);
            const mid = new Date(start);
            mid.setDate(mid.getDate() + 10);
            return { start: isoLocal(start), end: end > today ? today : end, mid, partial: end > today };
        });
    } catch {
        return [];
    }
}
