import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Award,
    BookMarked,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    FileSpreadsheet,
    GraduationCap,
    LayoutDashboard,
    Menu,
    MessageSquare,
    Plane,
    Shield,
    TrendingDown,
    Umbrella,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

import { useAuthStore } from '../../store/useAuthStore';
import { homeForRole } from '../../utils/roleHome';

/**
 * The signed-in navigation, in one place. Figma B01 "Navigation": items in
 * five groups, each shown only to the roles that can open the route
 * (mirrors routes/index.tsx; admin sees everything).
 *
 * The sidebar, the top bar's page title and the phone tab bar all read this,
 * so a page is named the same way everywhere.
 */
export type NavGroupId = 'overview' | 'teaching' | 'people' | 'finance' | 'school';

export interface NavItem {
    id: string;
    group: NavGroupId;
    icon: LucideIcon;
    /** Key under shell.nav. */
    labelKey: string;
    href: string;
    /** Who sees it. Mirrors the RoleRoute guarding the page. */
    roles: string[];
}

export const NAV_GROUPS: NavGroupId[] = ['overview', 'teaching', 'people', 'finance', 'school'];

const ALL_STAFF = ['admin', 'principal', 'coordinator', 'teacher', 'accountant', 'staff', 'student'];

export const NAV_ITEMS: NavItem[] = [
    { id: 'home', group: 'overview', icon: LayoutDashboard, labelKey: 'dashboard', href: '/dashboard', roles: [...ALL_STAFF, 'parent'] },
    { id: 'notices', group: 'overview', icon: MessageSquare, labelKey: 'notices', href: '/communication', roles: ALL_STAFF },

    { id: 'attendance', group: 'teaching', icon: ClipboardCheck, labelKey: 'attendance', href: '/attendance', roles: ['admin', 'principal', 'coordinator', 'teacher'] },
    { id: 'marks', group: 'teaching', icon: BookMarked, labelKey: 'marks', href: '/marks', roles: ['admin', 'principal', 'coordinator', 'teacher'] },
    { id: 'assignments', group: 'teaching', icon: ClipboardList, labelKey: 'assignments', href: '/assignments', roles: ['admin', 'principal', 'coordinator', 'teacher', 'student'] },
    { id: 'timetable', group: 'teaching', icon: CalendarClock, labelKey: 'timetable', href: '/timetable', roles: ['admin', 'principal', 'coordinator'] },
    { id: 'classes', group: 'teaching', icon: GraduationCap, labelKey: 'classes', href: '/academics', roles: ['admin', 'principal', 'coordinator'] },

    { id: 'people', group: 'people', icon: Users, labelKey: 'people', href: '/people', roles: ['admin', 'principal'] },
    { id: 'leaveRequests', group: 'people', icon: Umbrella, labelKey: 'leaveRequests', href: '/leave-approvals', roles: ['admin', 'principal'] },
    { id: 'myLeave', group: 'people', icon: Plane, labelKey: 'myLeave', href: '/leave', roles: ['admin', 'teacher', 'staff', 'coordinator', 'principal', 'accountant'] },

    { id: 'fees', group: 'finance', icon: Wallet, labelKey: 'fees', href: '/finances', roles: ['admin', 'principal', 'accountant'] },
    { id: 'outstanding', group: 'finance', icon: TrendingDown, labelKey: 'outstanding', href: '/finances/outstanding', roles: ['admin', 'principal', 'accountant'] },
    { id: 'ledger', group: 'finance', icon: FileSpreadsheet, labelKey: 'ledger', href: '/finances/ledger', roles: ['admin', 'principal', 'accountant'] },

    { id: 'calendar', group: 'school', icon: CalendarDays, labelKey: 'calendar', href: '/academic-calendar', roles: ['admin', 'principal'] },
    { id: 'promotion', group: 'school', icon: Award, labelKey: 'promotion', href: '/promotion', roles: ['admin', 'principal'] },
    { id: 'access', group: 'school', icon: Shield, labelKey: 'access', href: '/settings/permissions', roles: ['admin'] },
];

/**
 * Phone tab bar per role (Figma mobile frames). Four destinations and More,
 * which opens the full menu. Roles without an entry keep the menu button.
 */
export const TAB_BAR: Partial<Record<string, string[]>> = {
    admin: ['home', 'people', 'fees', 'notices'],
};

/** Short tab labels where the menu label is too long for a 70px tab. */
export const TAB_LABEL_KEY: Partial<Record<string, string>> = {
    home: 'tabHome',
    people: 'tabPeople',
    fees: 'tabFinance',
};

export const MORE_ICON = Menu;

export function useNavigation() {
    const role = useAuthStore((s) => s.user?.role ?? '');
    const { pathname } = useLocation();

    return useMemo(() => {
        const items = NAV_ITEMS
            .filter((item) => item.roles.includes(role))
            // "Dashboard" is each role's own home; only admin's is /dashboard.
            .map((item) => (item.id === 'home' && role !== 'admin' ? { ...item, href: homeForRole(role) } : item));

        // A route can sit under several items (/finances/outstanding is inside
        // "Fees and payments" too): the longest matching href wins. Matching on
        // a "/" boundary keeps /leave-approvals from lighting up /leave.
        const active = items.reduce<NavItem | undefined>((best, item) => {
            const hit = pathname === item.href || pathname.startsWith(item.href + '/');
            return hit && item.href.length > (best?.href.length ?? 0) ? item : best;
        }, undefined);

        const groups = NAV_GROUPS
            .map((id) => ({ id, items: items.filter((item) => item.group === id) }))
            .filter((group) => group.items.length > 0);

        const tabs = (TAB_BAR[role] ?? [])
            .map((id) => items.find((item) => item.id === id))
            .filter((item): item is NavItem => Boolean(item));

        return { role, items, groups, active, tabs };
    }, [role, pathname]);
}
