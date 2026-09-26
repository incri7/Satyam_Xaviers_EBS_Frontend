import { useQueries, useQuery } from '@tanstack/react-query';

import { academicsService } from '../../api/services/academics.service';
import { attendanceService } from '../../api/services/attendance.service';
import { financesService } from '../../api/services/finances.service';
import { noticesService } from '../../api/services/notices.service';
import { peopleService } from '../../api/services/people.service';
import { academicYearRange } from '../../utils/academicYear';
import { bsYearMonth, formatISODate } from '../../utils/nepaliDate';

/**
 * Data for the admin dashboard (Figma B01), from endpoints that already
 * exist. Each card owns its query, so one failing source leaves the rest of
 * the page working and each card can offer its own "Try again".
 */

const MINUTE = 60 * 1000;

export function useStudentCount() {
    return useQuery({
        queryKey: ['dashboard', 'students-count'],
        queryFn: () => peopleService.getStudents({ limit: 1 }),
        select: (data) => data.total_count,
        staleTime: 5 * MINUTE,
    });
}

export function useTodaySummary() {
    const today = formatISODate(new Date());
    return useQuery({
        queryKey: ['attendance', 'today-summary', today],
        queryFn: attendanceService.getTodaySummary,
        staleTime: MINUTE,
    });
}

/**
 * Outstanding balances. 500 is the endpoint's page limit; the totals cover
 * everyone regardless, and the rows feed the "over 30 days" count.
 */
export function useOutstanding() {
    return useQuery({
        queryKey: ['finances', 'outstanding', 500],
        queryFn: () => financesService.getOutstanding(500),
        staleTime: 5 * MINUTE,
    });
}

/** A Nepali month's collection, `offset` months back from this one. */
export function useMonthlyReport(offset = 0) {
    const { year, month } = bsYearMonth(offset);
    return useQuery({
        queryKey: ['finances', 'monthly-report', year, month],
        queryFn: () => financesService.getMonthlyReport(year, month),
        staleTime: 5 * MINUTE,
    });
}

export interface EnrolmentPoint {
    /** Stored form, "2026-2027". */
    year: string;
    count: number;
}

/**
 * Enrolments in each of the last five academic years, oldest first.
 *
 * Past years count every enrolment: year-end promotion closes them
 * (is_active false), and the endpoint hides closed ones by default, which
 * would leave the trend with only this year. This year counts the active
 * ones, so it agrees with the Students figure.
 */
export function useEnrolmentTrend() {
    const years = academicYearRange(5);
    const current = years[years.length - 1];
    return useQueries({
        queries: years.map((year) => ({
            queryKey: ['enrollment-count', year, year !== current],
            queryFn: () => academicsService.getEnrollments({ academic_year: year, limit: 1, include_inactive: year !== current }),
            staleTime: 10 * MINUTE,
        })),
        combine: (results) => ({
            points: years.map((year, i): EnrolmentPoint => ({ year, count: results[i].data?.total_count ?? 0 })),
            isPending: results.some((r) => r.isPending),
            isError: results.some((r) => r.isError),
            refetch: () => results.forEach((r) => void r.refetch()),
        }),
    });
}

export function useClasses() {
    return useQuery({
        queryKey: ['dashboard', 'classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        select: (data) => data.classes,
        staleTime: 10 * MINUTE,
    });
}

export interface ClassAttendance {
    classId: number;
    name: string;
    /** Axis label: "Class 7" → "7". */
    short: string;
    present: number;
    total: number;
    pct: number;
}

const PRESENT = new Set(['P', 'L', 'HD']);
const PAGE = 100; // the endpoint's maximum page size

/**
 * Today's registers, grouped by class. The list endpoint pages at 100 rows,
 * so every page is read; a whole school is a handful of requests.
 */
export function useAttendanceByClass() {
    const today = formatISODate(new Date());
    const classes = useClasses();
    const records = useQuery({
        queryKey: ['attendance', 'today-records', today],
        queryFn: async () => {
            const first = await attendanceService.getAttendances({ date: today, limit: PAGE, page: 1 });
            const pages = Math.ceil((first.total_count ?? 0) / PAGE);
            const rest = await Promise.all(
                Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
                    attendanceService.getAttendances({ date: today, limit: PAGE, page: i + 2 }),
                ),
            );
            return [first, ...rest].flatMap((p) => p.attendances ?? []);
        },
        staleTime: MINUTE,
    });

    const names = new Map((classes.data ?? []).map((c) => [c.id, c.name]));
    const grouped = new Map<number, { present: number; total: number }>();
    for (const r of records.data ?? []) {
        const g = grouped.get(r.class_id) ?? { present: 0, total: 0 };
        g.total += 1;
        if (PRESENT.has(r.status)) g.present += 1;
        grouped.set(r.class_id, g);
    }
    const rows: ClassAttendance[] = [...grouped.entries()]
        .map(([classId, { present, total }]) => {
            const name = names.get(classId) ?? `Class ${classId}`;
            return { classId, name, short: shortClassName(name), present, total, pct: Math.round((present / total) * 100) };
        })
        .sort((a, b) => classRank(a.name) - classRank(b.name) || a.name.localeCompare(b.name));

    return {
        rows,
        isPending: records.isPending || classes.isPending,
        isError: records.isError || classes.isError,
        refetch: () => { void records.refetch(); void classes.refetch(); },
    };
}

export function useRecentNotices() {
    return useQuery({
        queryKey: ['dashboard', 'recent-notices'],
        queryFn: () => noticesService.getNotices({ limit: 5 }),
        staleTime: 2 * MINUTE,
    });
}

/** "Class 7" → "7", "Grade 10" → "10"; other names are kept. */
export function shortClassName(name: string): string {
    return name.replace(/^(class|grade)\s+/i, '').trim();
}

/**
 * School order, never string order: Nursery, LKG, UKG, then 1 to 12
 * ("Class 10" must not sort before "Class 2").
 */
export function classRank(name: string): number {
    const n = shortClassName(name).toLowerCase();
    if (/^(nursery|pre-?school|playgroup)/.test(n)) return -3;
    if (/^lkg/.test(n)) return -2;
    if (/^ukg/.test(n)) return -1;
    const num = parseInt(n, 10);
    return Number.isNaN(num) ? 1000 : num;
}
