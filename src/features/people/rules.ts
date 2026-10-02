import type { TFunction } from 'i18next';

import { formatISODate } from '../../utils/nepaliDate';

/**
 * The rules for a student's and a guardian's details, the same in every form
 * and the same as the server (app/core/people_rules.py): the two registration
 * forms used to disagree with each other and with the API, so a form could
 * accept what the server then refused.
 */
export const NAME_MAX = 100;
export const STUDENT_MIN_AGE = 3;
export const STUDENT_MAX_AGE = 25;

const NAME = /^[A-Za-z][A-Za-z\s'.-]*$/;

/** Trimmed and single-spaced, as the server saves it. */
export const tidy = (v: string) => v.replace(/\s+/g, ' ').trim();

/** A required name: "   " is not a name. */
export const requiredName = (t: TFunction, which: 'first' | 'last') => (v?: string | null) => {
    const s = tidy(v ?? '');
    if (!s) return t(which === 'first' ? 'registerFamily.error.firstName' : 'registerFamily.error.lastName');
    return optionalName(t)(s);
};

export const optionalName = (t: TFunction) => (v?: string | null) => {
    const s = tidy(v ?? '');
    if (!s) return true;
    if (s.length > NAME_MAX) return t('peopleRules.nameTooLong', { n: NAME_MAX });
    return (s.length >= 2 && NAME.test(s)) || t('registerFamily.error.name');
};

const yearsBefore = (years: number, from = new Date()) => {
    const d = new Date(from);
    d.setFullYear(d.getFullYear() - years);
    return formatISODate(d);
};

const yearsAfter = (iso: string, years: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    // 29 February plus three years is 28 February, as on the server.
    const out = new Date(Date.UTC(y + years, m - 1, d));
    if (out.getUTCMonth() !== m - 1) out.setUTCDate(0);
    return out.toISOString().slice(0, 10);
};

/** Bounds for the date-of-birth picker. */
export const dobBounds = () => ({ min: yearsBefore(STUDENT_MAX_AGE + 1), max: yearsBefore(STUDENT_MIN_AGE) });

export const validDob = (t: TFunction) => (v?: string | null) => {
    if (!v) return t('registerFamily.error.dob');
    const { min, max } = dobBounds();
    if (v > max) return t('peopleRules.tooYoung', { n: STUDENT_MIN_AGE });
    if (v <= min) return t('peopleRules.tooOld', { n: STUDENT_MAX_AGE });
    return true;
};

/** Not in the future, and at least three years after the date of birth. */
export const validAdmission = (t: TFunction, dob: () => string | null | undefined) => (v?: string | null) => {
    if (!v) return t('registerFamily.error.admissionDate');
    if (v > formatISODate(new Date())) return t('peopleRules.admittedFuture');
    const born = dob();
    if (born && v < yearsAfter(born, STUDENT_MIN_AGE)) return t('peopleRules.admittedTooEarly', { n: STUDENT_MIN_AGE });
    return true;
};

/** A Nepali mobile however it is typed: 98XXXXXXXX, +977 98…, 977-98… */
export const mobileDigits = (v?: string | null) => {
    let d = (v ?? '').replace(/\D/g, '');
    if (d.length === 13 && d.startsWith('977')) d = d.slice(3);
    return d;
};

export const validMobile = (t: TFunction) => (v?: string | null) =>
    (/^[\d\s+()-]+$/.test(v ?? '') && /^9[678]\d{8}$/.test(mobileDigits(v))) || t('registerFamily.error.mobile');
