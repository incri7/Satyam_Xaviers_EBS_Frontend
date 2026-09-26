import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';

/**
 * Turn a failed password change or reset into something the page can show.
 *
 * - `field`: the server named a specific input; show it there.
 * - `link`:  the reset link is used up or expired; the form cannot succeed.
 * - `banner`: everything else, as a title (what happened) and body (what to do).
 *
 * Matches the `detail` strings in app/api/v1/authentication.py.
 */
export type PasswordError =
    | { kind: 'field'; field: 'current' | 'next'; message: string }
    | { kind: 'link' }
    | { kind: 'banner'; title: string; body: string };

export function getPasswordError(err: unknown, t: TFunction): PasswordError {
    if (!isAxiosError(err) || !err.response) {
        return { kind: 'banner', title: t('auth.errors.offlineTitle'), body: t('auth.errors.offlineBody') };
    }
    const { status, data } = err.response;
    const detail: unknown = data?.detail;

    if (status === 429) {
        return { kind: 'banner', title: t('auth.errors.rateTitle'), body: t('auth.errors.rateBody') };
    }
    if (status >= 500) {
        return { kind: 'banner', title: t('auth.errors.serverTitle'), body: t('auth.errors.serverBody') };
    }
    if (detail === 'Current password is incorrect') {
        return { kind: 'field', field: 'current', message: t('auth.setPassword.errors.currentWrong') };
    }
    if (detail === 'Password cannot contain your email address') {
        return { kind: 'field', field: 'next', message: t('auth.setPassword.errors.containsEmail') };
    }
    if (detail === 'Invalid or expired reset token' || detail === 'Reset token has expired' || status === 404) {
        return { kind: 'link' };
    }
    // 422 from the schema validator carries a list; show its first message.
    const text = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : undefined;
    return {
        kind: 'banner',
        title: t('auth.setPassword.errors.failedTitle'),
        body: typeof text === 'string' && text ? text : t('auth.errors.serverBody'),
    };
}
