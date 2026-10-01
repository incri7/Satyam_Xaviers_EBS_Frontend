import type { Parent, Student } from '../../types/people';

/** "First Middle Last", skipping the parts a record does not have. */
export const fullName = (p: { first_name?: string | null; middle_name?: string | null; last_name?: string | null }) =>
    [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ').trim();

/** Reads a failed request's message, whatever shape the API gave it. */
export function errorText(err: unknown, fallback: string): string {
    // Some services rethrow the server's message as a bare string.
    if (typeof err === 'string' && err) return err;
    const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
    const detail = e?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
    return fallback;
}

/** How to reach a guardian, for the line under their name. */
export const parentContact = (p: Parent) =>
    [p.phone || p.user?.phone, p.email || p.user?.email].filter(Boolean).join(', ') || p.occupation || undefined;

/** A student's admission number and guardians, so two children with one name can be told apart. */
export function studentWithGuardians(s: Student): string | undefined {
    const names = (s.parent_links ?? []).map((l) => (l?.parent ? fullName(l.parent) : '')).filter(Boolean);
    return [s.admission_no, names.join(', ')].filter(Boolean).join(' · ') || undefined;
}
