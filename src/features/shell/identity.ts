import { useAuthStore } from '../../store/useAuthStore';

/** "Rajendra Maharjan" → "RM"; an email falls back to its first letter. */
export function initialsOf(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 1);
    return letters.toUpperCase();
}

/** The signed-in person's name, or their email when the profile has none. */
export function useDisplayName(): string {
    const user = useAuthStore((s) => s.user);
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
}
