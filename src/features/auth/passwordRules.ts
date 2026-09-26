/**
 * Password policy, mirrored from the server so the checklist never promises
 * something the API then rejects:
 *   app/schemas/user.py  → 8–128 characters, upper and lowercase, a digit
 *   app/api/v1/authentication.py _contains_email → not the email name part
 *
 * The "not your name or email" rule is stricter here than on the server
 * (names too), which is fine: the UI may ask for more, never for less.
 */
export const PASSWORD_MAX = 128;

export type PasswordRuleId = 'length' | 'case' | 'number' | 'identity';

export interface PasswordRule {
    id: PasswordRuleId;
    met: boolean;
}

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

export interface PasswordCheck {
    rules: PasswordRule[];
    /** Every rule met. */
    valid: boolean;
    strength: PasswordStrength;
    /** Share of rules met, 0 to 1, for the meter. */
    score: number;
}

/** Things the password must not contain. Empty parts are ignored. */
export interface PasswordIdentity {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
}

const MIN_IDENTITY = 3;

function identityParts({ email, firstName, lastName }: PasswordIdentity): string[] {
    return [email?.split('@', 1)[0], firstName, lastName]
        .map((part) => part?.trim().toLowerCase() ?? '')
        .filter((part) => part.length >= MIN_IDENTITY);
}

/**
 * @param identity Pass `null` when the person is not known (reset link):
 *                 the identity rule is then left out of the list.
 */
export function checkPassword(password: string, identity: PasswordIdentity | null): PasswordCheck {
    const lower = password.toLowerCase();
    const rules: PasswordRule[] = [
        { id: 'length', met: password.length >= 8 && password.length <= PASSWORD_MAX },
        { id: 'case', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
        { id: 'number', met: /\d/.test(password) },
    ];
    if (identity) {
        const parts = identityParts(identity);
        rules.push({ id: 'identity', met: password.length > 0 && !parts.some((part) => lower.includes(part)) });
    }

    const met = rules.filter((r) => r.met).length;
    const total = rules.length;
    const strength: PasswordStrength =
        password.length === 0 ? 'empty' : met === total ? 'strong' : met === total - 1 ? 'fair' : 'weak';

    // Once something is typed the bar never reads as empty, so "Weak" has a red sliver.
    const score = password.length === 0 ? 0 : Math.max(met / total, 0.08);

    return { rules, valid: met === total, strength, score };
}
