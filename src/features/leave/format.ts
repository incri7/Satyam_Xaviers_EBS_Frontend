import type { BadgeTone } from '../../design-system';
import type { LeaveBalance, LeaveStatus, LeaveType } from '../../api/services/leaves.service';

export const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'earned', 'maternity', 'unpaid'];
/** Types with a yearly allowance; unpaid leave has no balance to draw down. */
export const COUNTED: Exclude<LeaveType, 'unpaid'>[] = ['casual', 'sick', 'earned', 'maternity'];

export const STATUS_TONE: Record<LeaveStatus, BadgeTone> = { pending: 'warn', approved: 'ok', rejected: 'bad' };

/**
 * Days a request takes off the balance: every calendar day from start to end,
 * both included — the same arithmetic the server uses when it approves.
 */
export function leaveDays(start: string, end: string): number {
    if (!start || !end || end < start) return 0;
    const a = new Date(`${start.slice(0, 10)}T12:00:00`).getTime();
    const b = new Date(`${end.slice(0, 10)}T12:00:00`).getTime();
    return Math.round((b - a) / 864e5) + 1;
}

/** What is left of a type this year, or null for unpaid leave. */
export function remaining(balance: LeaveBalance | undefined, type: LeaveType): { left: number; total: number } | null {
    if (!balance || type === 'unpaid') return null;
    return { left: balance[`${type}_remaining`], total: balance[`${type}_total`] };
}
