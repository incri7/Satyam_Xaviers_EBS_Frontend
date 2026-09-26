import type { StateStorage } from 'zustand/middleware';

/**
 * Where the signed-in session lives, per "Keep me signed in on this device".
 *
 * - Checked (the default): localStorage. The session survives closing the browser.
 * - Unchecked: sessionStorage. It ends when the tab or browser closes, which is
 *   what someone on a shared staff-room computer wants.
 *
 * The choice itself is remembered in localStorage so the checkbox keeps it.
 */
const PREF_KEY = 'sx-remember-me';

export const getRememberMe = (): boolean => {
    try {
        return localStorage.getItem(PREF_KEY) !== '0';
    } catch {
        return true;
    }
};

export const setRememberMe = (remember: boolean) => {
    try {
        localStorage.setItem(PREF_KEY, remember ? '1' : '0');
    } catch {
        /* storage blocked: the default (remember) applies */
    }
};

export const authStorage: StateStorage = {
    getItem: (name) => {
        try {
            return sessionStorage.getItem(name) ?? localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    setItem: (name, value) => {
        try {
            if (getRememberMe()) {
                localStorage.setItem(name, value);
                sessionStorage.removeItem(name);
            } else {
                sessionStorage.setItem(name, value);
                localStorage.removeItem(name);
            }
        } catch {
            /* private mode with storage blocked: the session stays in memory */
        }
    },
    removeItem: (name) => {
        try {
            localStorage.removeItem(name);
            sessionStorage.removeItem(name);
        } catch {
            /* nothing stored */
        }
    },
};
