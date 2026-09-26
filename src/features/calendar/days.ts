import NepaliDate from 'nepali-date-converter';

import { isoLocal } from '../../utils/nepaliDate';
import type { HolidayEntry } from '../../api/services/academicCalendar.service';

/** A named break over one or more days, both ends included. */
export interface HolidayRange {
    label: string;
    from: string;
    to: string;
}

/** Python's weekday(): Monday 0 … Sunday 6, which is what the API stores. */
export const SATURDAY = 5;
/** Sunday first, as Nepali calendars run. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
/** JS getDay() (Sunday 0) to the API's numbering. */
export const toApiWeekday = (d: Date) => (d.getDay() + 6) % 7;

const at = (iso: string) => new Date(`${iso}T12:00:00`);

export function eachDay(from: string, to: string): string[] {
    const out: string[] = [];
    if (!from || !to || to < from) return out;
    for (let d = at(from); isoLocal(d) <= to; d.setDate(d.getDate() + 1)) out.push(isoLocal(d));
    return out;
}

/** The ranges as one entry per date, inside the year only. */
export function expandHolidays(ranges: HolidayRange[], yearFrom: string, yearTo: string): HolidayEntry[] {
    const seen = new Map<string, HolidayEntry>();
    for (const r of ranges) for (const date of eachDay(r.from, r.to || r.from)) {
        if (date >= yearFrom && date <= yearTo && !seen.has(date)) seen.set(date, { date, label: r.label });
    }
    return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** What the server will count: school days, weekend days and holidays on school days. */
export function countDays(yearFrom: string, yearTo: string, weekend: number[], holidays: HolidayEntry[]) {
    const off = new Set(holidays.map((h) => h.date));
    let working = 0, weekends = 0, holidayDays = 0;
    for (const date of eachDay(yearFrom, yearTo)) {
        if (off.has(date)) holidayDays += 1;
        else if (weekend.includes(toApiWeekday(at(date)))) weekends += 1;
        else working += 1;
    }
    return { total: working + weekends + holidayDays, working, weekends, holidays: holidayDays };
}

/** Every day of one Bikram Sambat month, as ISO dates, plus the months either side. */
export function bsMonth(year: number, month: number) {
    const start = new NepaliDate(year, month, 1).toJsDate();
    const next = month === 11 ? new NepaliDate(year + 1, 0, 1).toJsDate() : new NepaliDate(year, month + 1, 1).toJsDate();
    const days: string[] = [];
    for (const d = new Date(start); d < next; d.setDate(d.getDate() + 1)) days.push(isoLocal(d));
    return {
        days,
        lead: start.getDay(), // blank cells before day 1, Sunday first
        prev: month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
        next: month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    };
}

export function bsOf(iso: string): { year: number; month: number } {
    const bs = new NepaliDate(at(iso)).getBS();
    return { year: bs.year, month: bs.month };
}

/**
 * Nepal's main school holidays for 2083-84, in Gregorian dates as the API
 * takes them. A starting point: the school edits, removes and adds to it.
 */
export const PRESET_2083: HolidayRange[] = [
    { label: 'Dashain', from: '2026-10-02', to: '2026-10-11' },
    { label: 'Tihar', from: '2026-10-20', to: '2026-10-24' },
    { label: 'Christmas Day', from: '2026-12-25', to: '2026-12-25' },
    { label: 'Prithvi Jayanti', from: '2027-01-11', to: '2027-01-11' },
    { label: 'Democracy Day', from: '2027-02-19', to: '2027-02-19' },
    { label: "International Women's Day", from: '2027-03-08', to: '2027-03-08' },
    { label: 'Republic Day', from: '2027-05-28', to: '2027-05-28' },
];
