import type { TFunction } from 'i18next';

/**
 * Choices for person fields, matching the backend enums exactly
 * (app/models/enums.py). The old edit dialogs offered "male"/"graduated",
 * which the API rejects with a 422.
 */
export const GENDERS = ['M', 'F', 'O'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
export const STUDENT_STATUSES = ['active', 'passed_out', 'transferred', 'discontinued'] as const;

export const genderOptions = (t: TFunction) => GENDERS.map((g) => ({ value: g, label: t(`peoplePage.gender.${g}`) }));
export const bloodGroupOptions = () => BLOOD_GROUPS.map((b) => ({ value: b, label: b }));
export const studentStatusOptions = (t: TFunction) => STUDENT_STATUSES.map((s) => ({ value: s, label: t(`peoplePage.status.${s}`) }));

/**
 * Blank inputs become null, so clearing a field clears it on the server
 * instead of sending "" (which fails date and enum validation).
 */
export function blanksToNull<T extends object>(data: T): T {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) out[key] = value === '' ? null : value;
    return out as T;
}

/** Drops blank inputs entirely, for creates where the server has defaults. */
export function withoutBlanks<T extends object>(data: T): T {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) if (value !== '' && value !== undefined && value !== null) out[key] = value;
    return out as T;
}
