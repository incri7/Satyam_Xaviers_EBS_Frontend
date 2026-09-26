import type { AttendanceStatus } from '../../api/services/attendance.service';
import type { BadgeTone } from '../../design-system';

/** P, A, L, HD in the order the register shows them (Figma C02). H, a holiday, is set by the calendar, not marked. */
export const STATUSES: AttendanceStatus[] = ['P', 'A', 'L', 'HD'];

export const STATUS_KEY: Record<AttendanceStatus, string> = {
    P: 'attendancePage.status.P',
    A: 'attendancePage.status.A',
    L: 'attendancePage.status.L',
    HD: 'attendancePage.status.HD',
    H: 'attendancePage.status.H',
};

export const STATUS_TONE: Record<AttendanceStatus, BadgeTone> = { P: 'ok', A: 'bad', L: 'warn', HD: 'info', H: 'neutral' };

/** The picked status button: soft fill and a ring in the status colour. */
export const STATUS_ON: Record<AttendanceStatus, string> = {
    P: 'bg-ok-soft text-ok ring-ok/40',
    A: 'bg-bad-soft text-bad ring-bad/40',
    L: 'bg-warn-soft text-warn ring-warn/40',
    HD: 'bg-info-soft text-info ring-info/40',
    H: 'bg-sunken text-ink-2 ring-line',
};

/** Attendance percentage colour against the 95% goal (85% is the alarm). */
export function pctTone(pct: number | null | undefined): string {
    if (pct == null) return 'text-muted';
    if (pct < 85) return 'text-bad';
    if (pct < 95) return 'text-warn';
    return 'text-ok';
}
