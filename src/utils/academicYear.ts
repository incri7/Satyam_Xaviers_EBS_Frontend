/**
 * Which academic year are we in?
 *
 * The Nepali school year starts on Baisakh 1, which is NOT a fixed Gregorian
 * date — it drifts between roughly 13 and 15 April. The previous
 * implementation used `getMonth() >= 3`, i.e. it treated 1 April as the
 * boundary, and so reported the new academic year for the ~13 days before
 * Baisakh 1 actually arrived. In that window the dashboard, sidebar and
 * enrollment charts all queried a year with no enrolments in it, and the
 * school appeared to have no students.
 *
 * Deriving the boundary from the BS calendar removes the guess: whatever BS
 * year today falls in, the academic year began on that year's Baisakh 1.
 */
import NepaliDate from 'nepali-date-converter';

import { toNepaliDigits } from './nepaliDate';

/** Gregorian year in which the current BS year's Baisakh 1 fell. */
function academicStartYear(now: Date = new Date()): number {
    try {
        const bsYear = new NepaliDate(now).getBS().year;
        // month is 0-indexed: 0 = Baisakh
        return new NepaliDate(bsYear, 0, 1).getAD().year;
    } catch {
        // Outside the converter's range — fall back to the mid-April boundary,
        // which is right for all but the first fortnight of April.
        return now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 14)
            ? now.getFullYear()
            : now.getFullYear() - 1;
    }
}

/** e.g. "2026-2027" — the format the API stores in enrollments.academic_year. */
export const currentAcademicYear = (now: Date = new Date()): string => {
    const startYear = academicStartYear(now);
    return `${startYear}-${startYear + 1}`;
};

/** Current year first, then `count - 1` previous years. */
export const academicYearOptions = (count = 3, now: Date = new Date()): string[] => {
    const startYear = academicStartYear(now);
    return Array.from(
        { length: count },
        (_, i) => `${startYear - i}-${startYear - i + 1}`,
    );
};

/** Oldest first — what a trend chart wants along its x-axis. */
export const academicYearRange = (count: number, now: Date = new Date()): string[] =>
    academicYearOptions(count, now).slice().reverse();

/**
 * Turn a stored academic year into its Bikram Sambat label:
 * "2026-2027" → "2083-84", or "२०८३-८४" in Nepali.
 *
 * The value is stored in Gregorian form because the API keys enrolments on it,
 * but "2026-2027" means nothing to a school that works in BS.
 */
export const academicYearLabel = (
    stored: string | null | undefined,
    lang: 'en' | 'ne' = 'ne',
): string => {
    if (!stored) return '';
    const startAD = parseInt(stored.split('-')[0], 10);
    if (Number.isNaN(startAD)) return stored;
    try {
        // Mid-year, so the date is safely inside the BS year that began that April.
        const bs = new NepaliDate(new Date(startAD, 7, 1)).getBS().year;
        const label = `${bs}-${String((bs + 1) % 100).padStart(2, '0')}`;
        return lang === 'ne' ? toNepaliDigits(label) : label;
    } catch {
        return stored;
    }
};

/** The same year in BS, e.g. "2083-84", for display next to the AD form. */
export const currentAcademicYearBS = (now: Date = new Date()): string => {
    try {
        const bsYear = new NepaliDate(now).getBS().year;
        return `${bsYear}-${String((bsYear + 1) % 100).padStart(2, '0')}`;
    } catch {
        return '';
    }
};
