import type { BadgeTone } from '../../design-system';
import type { LeaveBalance, LeaveStatus, LeaveType } from '../../api/services/leaves.service';

export const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'earned', 'maternity', 'unpaid'];
/** Types with a yearly allowance; unpaid leave has no balance to draw down. */
export const COUNTED: Exclude<LeaveType, 'unpaid'>[] = ['casual', 'sick', 'earned', 'maternity'];
/** Types the school caps: the server refuses a request past what is left. */
export const LIMITED: LeaveType[] = ['casual', 'sick'];

export const STATUS_TONE: Record<LeaveStatus, BadgeTone> = { pending: 'warn', approved: 'ok', rejected: 'bad' };

/**
 * School days in a range, for the form before it is sent: every day but
 * Saturday. The server counts the same way and also leaves out the school
 * calendar's holidays, so a saved leave's own `days` is the one to show.
 */
export function leaveDays(start: string, end: string): number {
    if (!start || !end || end < start) return 0;
    const day = new Date(`${start.slice(0, 10)}T12:00:00`);
    const last = new Date(`${end.slice(0, 10)}T12:00:00`).getTime();
    let n = 0;
    for (; day.getTime() <= last; day.setDate(day.getDate() + 1)) {
        if (day.getDay() !== 6) n += 1;
    }
    return n;
}

/** What is left of a type this year, or null for unpaid leave. */
export function remaining(balance: LeaveBalance | undefined, type: LeaveType): { left: number; total: number } | null {
    if (!balance || type === 'unpaid') return null;
    return { left: balance[`${type}_remaining`], total: balance[`${type}_total`] };
}
