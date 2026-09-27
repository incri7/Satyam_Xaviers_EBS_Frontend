/**
 * Date formatting bound to the active language.
 *
 * Components should use this rather than calling toLocaleDateString directly.
 * Every date is Bikram Sambat; the language toggle only changes the script.
 */
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

import {
    formatDate,
    formatDateTime,
    formatRelative,
    formatClock,
    formatISODate,
    bsYear,
    dayOfMonth,
    monthShort,
    type DateInput,
    type DateLang,
    type DateStyle,
} from '../utils/nepaliDate';

export function useDateFormat() {
    const { i18n } = useTranslation();
    const lang: DateLang = i18n.language?.startsWith('ne') ? 'ne' : 'en';

    return useMemo(
        () => ({
            lang,
            /** Bikram Sambat, in the active script. */
            date: (v: DateInput, style: DateStyle = 'medium', fallback?: string) =>
                formatDate(v, lang, style, fallback),
            dateTime: (v: DateInput, style: DateStyle = 'medium', fallback?: string) =>
                formatDateTime(v, lang, style, fallback),
            /** Gregorian ISO — for CSV columns other systems parse. */
            iso: (v: DateInput) => formatISODate(v),
            relative: (v: DateInput) => formatRelative(v, lang),
            /** Clock time, "9:15 AM"; also takes a timetable "HH:MM:SS". */
            time: (v: Date | string | null | undefined, fallback = '') => formatClock(v, lang, fallback),
            /** Day number alone — the calendar-tile look on notice cards. */
            day: (v: DateInput) => dayOfMonth(v, lang),
            /** Abbreviated month — pairs with day() on those tiles. */
            monthShort: (v: DateInput) => monthShort(v, lang),
            year: (v: DateInput) => bsYear(v, lang),
        }),
        [lang],
    );
}

export default useDateFormat;
