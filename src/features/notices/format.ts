import type { Notice, NoticePriority } from '../../types/notice';
import { isoLocal } from '../../utils/nepaliDate';

/** Roles a notice can be sent to, in the order the dialog offers them. */
export const COMMON_ROLES = ['parent', 'student', 'teacher', 'staff'] as const;
export const OTHER_ROLES = ['admin', 'principal', 'accountant', 'coordinator'] as const;

/** Figma calls high "Urgent" and medium "Normal"; low stays available. */
export const PRIORITIES: NoticePriority[] = ['medium', 'high', 'low'];

export interface NoticeNames {
    classes: Record<number, string>;
    sections: Record<number, string>;
    students: Record<number, string>;
}

type T = (key: string, opts?: Record<string, unknown>) => string;

/** "Everyone", "Parents", "Class 10 A", "Aarav Shrestha" — who a notice is for. */
export function audienceLabel(n: Notice, names: NoticeNames, t: T): string {
    if (n.scope === 'all') return t('noticesPage.audience.all');
    if (n.scope === 'role') return n.role ? t(`noticesPage.role.${n.role}`, { defaultValue: n.role }) : t('noticesPage.audience.role');
    if (n.scope === 'class_section') {
        const cls = n.class_id ? names.classes[n.class_id] : undefined;
        const sec = n.section_id ? names.sections[n.section_id] : undefined;
        return cls ? [cls, sec].filter(Boolean).join(' ') : t('noticesPage.audience.class');
    }
    return (n.student_id && names.students[n.student_id]) || t('noticesPage.audience.student');
}

/** Whether a notice is on the board today, waiting to start, or over. */
export function noticeState(n: Notice, today = isoLocal(new Date())): 'live' | 'scheduled' | 'ended' {
    if (n.valid_from && n.valid_from.slice(0, 10) > today) return 'scheduled';
    if (n.valid_to && n.valid_to.slice(0, 10) < today) return 'ended';
    return 'live';
}

/** The day before today — ending a notice early sets this as its last day. */
export function yesterdayISO(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return isoLocal(d);
}
