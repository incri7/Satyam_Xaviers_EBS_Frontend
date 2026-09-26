import type { Permission } from '../../types/auth';

export const ACTIONS = ['can_read', 'can_create', 'can_update', 'can_delete'] as const;
export type Action = (typeof ACTIONS)[number];
export type Flags = Record<Action, boolean>;

/**
 * Figma B02 groups resources the way the school thinks about them. Names and
 * descriptions are looked up as accessPage.res.<resource>; a resource the
 * server adds later still appears, under Other, with its raw name.
 */
export const GROUPS: { key: string; resources: string[] }[] = [
    { key: 'students', resources: ['students', 'parents', 'enrollments'] },
    { key: 'attendance', resources: ['attendance', 'staff_attendance'] },
    { key: 'marks', resources: ['exams', 'marks', 'assignments'] },
    { key: 'finance', resources: ['finances', 'payments', 'expenses'] },
    { key: 'people', resources: ['teachers', 'staff', 'users'] },
    { key: 'notices', resources: ['notices'] },
    { key: 'leave', resources: ['leaves', 'leave_balances'] },
    { key: 'settings', resources: ['classes', 'sections', 'subjects', 'timetable', 'academic_calendar', 'permissions'] },
];

export function groupResources(resources: string[]): { key: string; resources: string[] }[] {
    const known = new Set(GROUPS.flatMap((g) => g.resources));
    const groups = GROUPS.map((g) => ({ key: g.key, resources: g.resources.filter((r) => resources.includes(r)) })).filter((g) => g.resources.length);
    const other = resources.filter((r) => !known.has(r)).sort();
    return other.length ? [...groups, { key: 'other', resources: other }] : groups;
}

export const flagsOf = (p?: Permission): Flags => ({
    can_read: !!p?.can_read, can_create: !!p?.can_create, can_update: !!p?.can_update, can_delete: !!p?.can_delete,
});

export const sameFlags = (a: Flags, b: Flags) => ACTIONS.every((k) => a[k] === b[k]);

/** Granted flags over possible ones, across every resource the server knows. */
export function coverage(perms: Permission[], resourceCount: number): number {
    if (!resourceCount) return 0;
    const granted = perms.reduce((n, p) => n + ACTIONS.filter((k) => p[k]).length, 0);
    return granted / (resourceCount * ACTIONS.length);
}
