import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';

/** "Rajendra Maharjan" → "RM"; an email falls back to its first letter. */
export function initialsOf(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 1);
    return letters.toUpperCase();
}

/** The signed-in person's name; their email only when they have none. */
export function useDisplayName(): string {
    const user = useAuthStore((s) => s.user);
    if (!user) return '';
    return user.display_name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
}

/**
 * Keeps the stored user in step with the server once per visit, so a name
 * set on another device, or a session from before names existed, shows the
 * current name rather than the email.
 */
export function useSyncMe(): void {
    const signedIn = useAuthStore((s) => s.isAuthenticated);
    const patchUser = useAuthStore((s) => s.patchUser);
    const { data } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: authService.getCurrentUser,
        enabled: signedIn,
        staleTime: 5 * 60 * 1000,
    });
    useEffect(() => {
        if (data) patchUser({ full_name: data.full_name, display_name: data.display_name, phone: data.phone });
    }, [data, patchUser]);
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Morning until noon, afternoon until five, evening after. */
export function dayPart(now: Date = new Date()): DayPart {
    const h = now.getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/**
 * The home screen's welcome: greeting for the time of day, the person's
 * name, and their role, e.g. "Good afternoon, Sita Sharma" / "Accountant".
 */
export function useWelcome(fallbackName?: string) {
    const { t } = useTranslation();
    const name = useDisplayName();
    const role = useAuthStore((s) => s.user?.role ?? '');
    return {
        greeting: t(`home.greeting.${dayPart()}`),
        name: name || fallbackName || '',
        role: t(`accessPage.role.${role}`, { defaultValue: role }),
    };
}
