/**
 * Date formatting for a Nepali school.
 *
 * Every date in the UI is Bikram Sambat. The language toggle changes only the
 * script, never the calendar:
 *
 *   Nepali  →  आइतबार, २१ भाद्र, २०८३
 *   English →  Sunday, 21 Bhadra, 2083
 *
 * A Gregorian date is not shown anywhere, because the school does not work in
 * it — staff reading "6 September 2026" would have to convert it in their head
 * before it meant anything.
 *
 * The API and the database stay Gregorian throughout: BS is a presentation
 * concern only. Storing BS would break date comparison, sorting, and the
 * attendance calendar join, all of which rely on real SQL dates. The single
 * exception is formatISODate, for machine-readable export columns that another
 * system has to parse.
 *
 * Conversions come from nepali-date-converter, checked against the Python
 * nepali-datetime library on four anchor dates (academic-year start, today,
 * Bijaya Dashami, Chaitra end).
 */
import NepaliDate from 'nepali-date-converter';

/** Script for the BS date. The calendar is always Bikram Sambat. */
export type DateLang = 'en' | 'ne';

/** What the caller means by "a date" — anything the API might hand us. */
export type DateInput = Date | string | number | null | undefined;

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** Convert Latin digits in a string to Devanagari. Leaves everything else. */
export function toNepaliDigits(value: string | number): string {
    return String(value).replace(/[0-9]/g, (d) => NEPALI_DIGITS[Number(d)]);
}

/**
 * Parse whatever the API gave us into a Date, or null.
 *
 * A bare 'YYYY-MM-DD' is parsed as UTC midnight by the JS engine, which in
 * Nepal (UTC+5:45) reads back as the previous day and shifts every date by
 * one. Anchoring plain dates at midday sidesteps that without pulling in a
 * timezone library.
 */
export function parseDate(value: DateInput): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    const plainDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const d = new Date(plainDate ? `${value}T12:00:00` : value);
    return isNaN(d.getTime()) ? null : d;
}

export type DateStyle =
    | 'short'      // २०८३/०५/२१            · 2083/05/21
    | 'medium'     // २१ भाद्र, २०८३          · 21 Bhadra, 2083
    | 'long'       // आइतबार, २१ भाद्र, २०८३  · Sunday, 21 Bhadra, 2083
    | 'monthYear'  // भाद्र २०८३             · Bhadra 2083
    | 'dayMonth';  // आइतबार, २१ भाद्र         · Sunday, 21 Bhadra

const PATTERNS: Record<DateStyle, string> = {
    short: 'YYYY/MM/DD',
    medium: 'DD MMMM, YYYY',
    long: 'ddd, DD MMMM, YYYY',
    monthYear: 'MMMM YYYY',
    dayMonth: 'ddd, DD MMMM',
};

/**
 * Render a BS date in the given script.
 *
 * The converter covers roughly BS 2000–2090. Outside that it throws, and the
 * Gregorian date is shown rather than an empty cell — a visibly wrong-looking
 * date is easier to notice and report than a blank one.
 */
function bsFormat(d: Date, pattern: string, lang: DateLang): string {
    try {
        return new NepaliDate(d).format(pattern, lang === 'ne' ? 'np' : 'en');
    } catch {
        return d.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
}

/**
 * The main entry point. Always Bikram Sambat; `lang` picks the script.
 * Returns `fallback` (default '—') for a missing or unparseable date, so
 * callers never have to guard.
 */
export function formatDate(
    value: DateInput,
    lang: DateLang = 'ne',
    style: DateStyle = 'medium',
    fallback = '—',
): string {
    const d = parseDate(value);
    if (!d) return fallback;
    return bsFormat(d, PATTERNS[style], lang);
}

/** BS date plus time of day. Time itself is identical in both calendars. */
export function formatDateTime(
    value: DateInput,
    lang: DateLang = 'ne',
    style: DateStyle = 'medium',
    fallback = '—',
): string {
    const d = parseDate(value);
    if (!d) return fallback;
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${formatDate(d, lang, style)} ${lang === 'ne' ? toNepaliDigits(time) : time}`;
}

/**
 * Gregorian ISO — the one place a Western date is still correct: CSV and
 * Excel columns another system has to parse. Never use this for anything a
 * person reads on screen.
 */
export function formatISODate(value: DateInput, fallback = ''): string {
    const d = parseDate(value);
    if (!d) return fallback;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** BS year alone — '२०८३' / '2083'. Useful for academic-year labels. */
export function bsYear(value: DateInput, lang: DateLang = 'ne'): string {
    const d = parseDate(value);
    if (!d) return '';
    try {
        const y = new NepaliDate(d).getBS().year;
        return lang === 'ne' ? toNepaliDigits(y) : String(y);
    } catch {
        return '';
    }
}

/**
 * BS day of the month on its own — for the calendar-tile style used by notice
 * cards, where the day sits above an abbreviated month.
 */
export function dayOfMonth(value: DateInput, lang: DateLang = 'ne'): string {
    const d = parseDate(value);
    if (!d) return '';
    return bsFormat(d, 'DD', lang);
}

/** Abbreviated BS month — 'भा' / 'Bhd'. Pairs with dayOfMonth. */
export function monthShort(value: DateInput, lang: DateLang = 'ne'): string {
    const d = parseDate(value);
    if (!d) return '';
    return bsFormat(d, 'MMM', lang);
}

/**
 * "२ दिन अघि" / "2 days ago". Relative spans are calendar-agnostic, so this
 * only has to localise the number and the unit.
 */
export function formatRelative(
    value: DateInput,
    lang: DateLang = 'ne',
    now: Date = new Date(),
): string {
    const d = parseDate(value);
    if (!d) return '—';
    const mins = Math.round((now.getTime() - d.getTime()) / 60000);
    const num = (n: number) => (lang === 'ne' ? toNepaliDigits(n) : String(n));

    if (mins < 1) return lang === 'ne' ? 'भर्खरै' : 'just now';
    if (mins < 60) return lang === 'ne' ? `${num(mins)} मिनेट अघि` : `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return lang === 'ne' ? `${num(hrs)} घण्टा अघि` : `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return lang === 'ne' ? `${num(days)} दिन अघि` : `${days}d ago`;
    return formatDate(d, lang, 'medium');
}

/** Local calendar day as YYYY-MM-DD. Never toISOString: that is UTC, and in
 *  Nepal (UTC+5:45) it reports yesterday for anything before 05:45. */
export function isoLocal(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/**
 * First day of the Bikram Sambat month containing `value`, as a Date.
 *
 * "This month" has to mean the Nepali month the page is displaying. Bhadra
 * 2083 opens on 17 August, so a Gregorian first-of-the-month would start the
 * range two weeks late and quietly drop half the month's attendance.
 */
export function bsMonthStart(value: DateInput = new Date()): Date | null {
    const d = parseDate(value);
    if (!d) return null;
    try {
        const bs = new NepaliDate(d).getBS();
        return new NepaliDate(bs.year, bs.month, 1).toJsDate();
    } catch {
        return null;
    }
}

/**
 * The BS year and month (1 = Baisakh … 12 = Chaitra) `offset` months before
 * `now`. Reports and fee periods run on these months, not English ones.
 */
export function bsYearMonth(offset = 0, now: Date = new Date()): { year: number; month: number } {
    try {
        const bs = new NepaliDate(now).getBS();
        const index = bs.year * 12 + bs.month - offset; // month is 0-based here
        return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    } catch {
        return { year: now.getFullYear() + 57, month: 1 };
    }
}

/** The school's year, Baisakh to Chaitra, as English dates (YYYY-MM-DD). */
export function bsYearBounds(bsYear: number): { start: string; end: string } | null {
    try {
        const start = new NepaliDate(bsYear, 0, 1).toJsDate();
        const end = new NepaliDate(bsYear + 1, 0, 1).toJsDate();
        end.setDate(end.getDate() - 1);
        return { start: isoLocal(start), end: isoLocal(end) };
    } catch {
        return null;
    }
}

/**
 * Sunday of the week containing `value`.
 *
 * The Nepali school week runs Sunday to Friday, so a week that starts on
 * Monday would split it across two rows.
 */
export function weekStart(value: DateInput = new Date()): Date | null {
    const d = parseDate(value);
    if (!d) return null;
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay()); // getDay(): Sunday = 0
    s.setHours(12, 0, 0, 0);
    return s;
}
