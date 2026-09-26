import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';

/**
 * Turn a failed sign-in into words a person can act on.
 * The title says what happened; the body says what to do next.
 * `field` marks which input to highlight, if any.
 */
export interface SignInError {
    title: string;
    body: string;
    field?: 'password';
}

export function getSignInError(err: unknown, t: TFunction): SignInError {
    if (!isAxiosError(err) || !err.response) {
        return { title: t('auth.errors.offlineTitle'), body: t('auth.errors.offlineBody') };
    }
    const status = err.response.status;
    if (status === 401) {
        return { title: t('auth.errors.invalidTitle'), body: t('auth.errors.invalidBody'), field: 'password' };
    }
    if (status === 429) {
        return { title: t('auth.errors.rateTitle'), body: t('auth.errors.rateBody') };
    }
    if (status >= 500) {
        return { title: t('auth.errors.serverTitle'), body: t('auth.errors.serverBody') };
    }
    const detail = err.response.data?.detail;
    return {
        title: t('auth.errors.blockedTitle'),
        body: typeof detail === 'string' && detail ? detail : t('auth.errors.serverBody'),
    };
}
