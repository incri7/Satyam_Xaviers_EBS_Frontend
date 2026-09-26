import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../types/auth';
import { authStorage } from './authStorage';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    _hasHydrated: boolean;

    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    setAccessToken: (token: string) => void;
    /** Merge fields into the signed-in user, e.g. after the first password change. */
    patchUser: (fields: Partial<User>) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            _hasHydrated: false,

            setAuth: (user, accessToken, refreshToken) =>
                set({ user, accessToken, refreshToken, isAuthenticated: true }),

            setAccessToken: (accessToken) =>
                set({ accessToken }),

            patchUser: (fields) =>
                set((state) => ({ user: state.user ? { ...state.user, ...fields } : state.user })),

            logout: () =>
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'auth-storage',
            // localStorage or sessionStorage, per "Keep me signed in".
            storage: createJSONStorage(() => authStorage),
            onRehydrateStorage: (state) => {
                return () => state?.setHasHydrated(true);
            },
        }
    )
);
