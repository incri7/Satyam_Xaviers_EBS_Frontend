import { useQueries, useQuery } from '@tanstack/react-query';

import { financesService, type LedgerParams } from '../../api/services/finances.service';
import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { monthRange, monthsOfYear, yearRange, type DateRange, type Period } from './period';

export function useFeeStructures(activeOnly = false) {
    return useQuery({
        queryKey: ['fee-structures', activeOnly ? 'active' : 'all'],
        queryFn: () => financesService.getFeeStructures(activeOnly),
        staleTime: 60 * 1000,
    });
}

/** The term containing today, if the academic calendar has been set up. */
export function useCurrentTerm() {
    return useQuery({
        queryKey: ['academic-calendar', 'terms', 'current'],
        queryFn: () => academicCalendarService.getTerms(),
        select: (terms) => terms.find((t) => t.is_current) ?? null,
        staleTime: 30 * 60 * 1000,
        retry: false,
    });
}

/**
 * The date window a period stands for. "This term" needs the calendar; until
 * it loads, or when no term is set up, it is null and the switch hides it.
 */
export function usePeriodRange(period: Period): { range: DateRange | null; termAvailable: boolean } {
    const term = useCurrentTerm();
    const termRange = term.data ? { start: term.data.start_date, end: term.data.end_date < yearRange().end ? term.data.end_date : yearRange().end } : null;
    const range = period === 'month' ? monthRange() : period === 'year' ? yearRange() : termRange;
    return { range, termAvailable: !!termRange };
}

export function useLedger(params: LedgerParams, enabled = true) {
    return useQuery({
        queryKey: ['finances', 'ledger', params],
        queryFn: () => financesService.getLedger(params),
        enabled,
        placeholderData: (prev) => prev,
    });
}

/** Money in and out for each BS month of the year so far, oldest first. */
export function useMonthlyTotals() {
    const months = monthsOfYear();
    const results = useQueries({
        queries: months.map((m) => ({
            queryKey: ['financial-summary', m.start, m.end],
            queryFn: () => financesService.getFinancialSummary(m.start, m.end),
            staleTime: 5 * 60 * 1000,
        })),
    });
    return {
        months: months.map((m, i) => ({ ...m, income: Number(results[i]?.data?.total_income ?? 0), expense: Number(results[i]?.data?.total_expense ?? 0) })),
        isPending: results.some((r) => r.isPending),
        isError: results.some((r) => r.isError),
        refetch: () => results.forEach((r) => void r.refetch()),
    };
}

/** After money moves, every figure built on payments or expenses is stale. */
export function invalidateMoney(queryClient: { invalidateQueries: (f: { queryKey: unknown[] }) => unknown }) {
    ['finances', 'financial-summary', 'payments', 'expenses', 'discounts'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
}
