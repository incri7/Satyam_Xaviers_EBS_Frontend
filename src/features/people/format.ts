import i18n from '../../i18n';
import type { Parent, Student } from '../../types/people';

/** "First Middle Last", skipping the parts a record does not have. */
export const fullName = (p: { first_name?: string | null; middle_name?: string | null; last_name?: string | null }) =>
    [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ').trim();

/** A validation message without pydantic's "Value error, " in front. */
export const cleanMessage = (msg: string) => msg.replace(/^(Value|Assertion) error,\s*/i, '');

/**
 * Reads a failed request's message, whatever shape the API gave it.
 *
 * `fallback` is for a request that got no answer at all (the connection).
 * A server failure says so instead: "Check your connection" for a 500 sent
 * staff to retry something that would fail again. A server failure's own
 * text is never shown; it can carry internals.
 */
export function errorText(err: unknown, fallback: string): string {
    // Some services rethrow the server's message as a bare string.
    if (typeof err === 'string' && err) return err;
    const e = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };
    const res = e?.response;
    if (!res) return fallback;
    if ((res.status ?? 0) >= 500) return i18n.t('errors.server');
    const detail = res.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return cleanMessage(detail[0].msg);
    if (detail && typeof detail === 'object' && typeof (detail as { message?: unknown }).message === 'string') {
        return (detail as { message: string }).message;
    }
    return i18n.t('errors.unexpected');
}

/**
 * A 422's messages by field, for setError: { dob: "A student must be 3 to 25
 * years old" }. The field is the last part of the path, so
 * students_in.0.dob is dob.
 */
export function fieldErrors(err: unknown): Record<string, string> {
    const detail = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
    if (detail?.status !== 422 || !Array.isArray(detail.data?.detail)) return {};
    const out: Record<string, string> = {};
    for (const d of detail.data.detail as { loc?: unknown[]; msg?: string }[]) {
        const field = d.loc?.[d.loc.length - 1];
        if (typeof field === 'string' && d.msg && !out[field]) out[field] = cleanMessage(d.msg);
    }
    return out;
}

/** The server thinks this student is already registered (409 possible_duplicate). */
export function possibleDuplicate(err: unknown): { message: string; student: { id: number; name: string; admission_no: string } } | null {
    const detail = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
    const d = detail?.data?.detail as { code?: string; message?: string; student?: { id: number; name: string; admission_no: string } } | undefined;
    return detail?.status === 409 && d?.code === 'possible_duplicate' && d.student ? { message: d.message ?? '', student: d.student } : null;
}

/** How to reach a guardian, for the line under their name. */
export const parentContact = (p: Parent) =>
    [p.phone || p.user?.phone, p.email || p.user?.email].filter(Boolean).join(', ') || p.occupation || undefined;

/** A student's admission number and guardians, so two children with one name can be told apart. */
export function studentWithGuardians(s: Student): string | undefined {
    const names = (s.parent_links ?? []).map((l) => (l?.parent ? fullName(l.parent) : '')).filter(Boolean);
    return [s.admission_no, names.join(', ')].filter(Boolean).join(' · ') || undefined;
}
