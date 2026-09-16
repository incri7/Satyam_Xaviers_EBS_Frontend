import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    Wallet,
    MessageSquare,
    Shield,
    ClipboardCheck,
    BookMarked,
    ClipboardList,
    Umbrella,
    CalendarClock,
    TrendingDown,
    ArrowLeft
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useQuery } from '@tanstack/react-query';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { homeForRole } from '../../utils/roleHome';
import { hasSidebar } from '../../utils/sidebarVisibility';
import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { parentService } from '../../api/services/parent.service';
import { useTranslation } from 'react-i18next';

import type { PermissionAction } from '../../types/auth';
import { currentAcademicYear } from '../../utils/academicYear';

interface MenuItem {
    icon: React.ElementType;
    labelKey: string;
    href: string;
    permission?: { resource: string; action: PermissionAction };
    roles?: string[];
}

const menuItems: MenuItem[] = [
    {
        icon: LayoutDashboard,
        labelKey: 'nav.dashboard',
        href: '/dashboard',
    },
    {
        icon: GraduationCap,
        labelKey: 'nav.academics',
        href: '/academics',
        permission: { resource: 'classes', action: 'read' },
        roles: ['admin', 'principal', 'coordinator'],
    },
    {
        icon: CalendarClock,
        labelKey: 'nav.timetable',
        href: '/timetable',
        roles: ['admin', 'principal', 'coordinator'],
    },
    {
        icon: Users,
        labelKey: 'nav.people',
        href: '/people',
        permission: { resource: 'users', action: 'read' },
        roles: ['admin', 'principal'],
    },
    {
        icon: Wallet,
        labelKey: 'nav.finances',
        href: '/finances',
        permission: { resource: 'finances', action: 'read' },
        roles: ['admin', 'principal', 'accountant'],
    },
    {
        icon: TrendingDown,
        labelKey: 'nav.outstandingFees',
        href: '/finances/outstanding',
        permission: { resource: 'finances', action: 'read' },
        roles: ['admin', 'principal', 'accountant'],
    },
    {
        icon: ClipboardCheck,
        labelKey: 'nav.attendance',
        href: '/attendance',
        permission: { resource: 'attendance', action: 'create' },
        roles: ['admin', 'principal', 'coordinator', 'teacher'],
    },
    {
        icon: BookMarked,
        labelKey: 'nav.marks',
        href: '/marks',
        permission: { resource: 'marks', action: 'create' },
        roles: ['admin', 'principal', 'coordinator', 'teacher'],
    },
    {
        icon: ClipboardList,
        labelKey: 'nav.assignments',
        href: '/assignments',
        permission: { resource: 'assignments', action: 'read' },
        roles: ['admin', 'principal', 'coordinator', 'teacher', 'student'],
    },
    {
        icon: Umbrella,
        labelKey: 'nav.leave',
        href: '/leave',
        roles: ['admin', 'teacher', 'staff', 'coordinator', 'principal', 'accountant'],
    },
    {
        icon: ClipboardCheck,
        labelKey: 'nav.leaveApprovals',
        href: '/leave-approvals',
        roles: ['admin', 'principal'],
    },
    {
        icon: MessageSquare,
        labelKey: 'nav.communication',
        href: '/communication',
        permission: { resource: 'staff', action: 'read' },
        roles: ['admin', 'principal', 'coordinator', 'teacher', 'accountant', 'staff', 'student'],
    },
    {
        icon: Shield,
        labelKey: 'nav.accessControl',
        href: '/settings/permissions',
        permission: { resource: 'permissions', action: 'read' },
        roles: ['admin'],
    },
];

const SCROLL_KEY = 'sidebar_scroll_top';

export const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissionsStore();
    const { user } = useAuthStore();
    const { isSidebarOpen, closeSidebar } = useUiStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const role = user?.role ?? '';
    const canOpenCalendar = role === 'admin' || role === 'principal';

    // Parents get a two-level sidebar: a near-empty top level (there's nothing
    // global to navigate to besides Dashboard — Communication lives on the bell
    // icon instead), and a child-scoped level once they drill into a specific
    // student, since Attendance/Marks/Fees/Leave only make sense per-child.
    const childRouteMatch = role === 'parent' ? location.pathname.match(/^\/parent\/child\/(\d+)/) : null;
    const activeChildId = childRouteMatch ? childRouteMatch[1] : null;

    const { data: childrenData } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
        enabled: role === 'parent',
        staleTime: 5 * 60 * 1000,
    });
    const activeChild = activeChildId
        ? childrenData?.children.find(c => String(c.student_id) === activeChildId)
        : undefined;
    const activeChildName = activeChild
        ? [activeChild.first_name, activeChild.last_name].filter(Boolean).join(' ')
        : undefined;

    // Source of truth = the configured academic calendar; date-rule fallback
    // only when no calendar exists yet (FE-AD-06)
    const { data: currentYearData } = useQuery({
        queryKey: ['academic-years', 'current'],
        queryFn: academicCalendarService.getCurrentYear,
        retry: false,
        staleTime: 60 * 60 * 1000,
    });
    const academicYear = currentYearData?.name ?? currentAcademicYear();

    const filteredMenuItems = menuItems
        .filter(item => {
            if (item.roles) return item.roles.includes(role);
            if (!item.permission) return true;
            return hasPermission(item.permission.resource, item.permission.action);
        })
        // "Dashboard" points every non-admin role at THEIR home screen.
        // Only admin uses /dashboard; principal/teacher/parent/etc. each have
        // their own home, so route the item there.
        .map(item =>
            item.href === '/dashboard' && role !== 'admin'
                ? { ...item, href: homeForRole(role) }
                : item
        );

    /**
     * The one menu item to highlight for the current route.
     *
     * A route can sit under several items — /finances/outstanding is inside
     * both "Finances" and "Outstanding Fees" — so the most specific match
     * wins and the others stay quiet. Comparing on a "/" boundary keeps
     * /leave-approvals from counting as a child of /leave.
     */
    /**
     * Keep the nav where the user left it.
     *
     * Thirty-one pages each render their own <Sidebar />, so navigating
     * unmounts one and mounts a new one — the scroll position is lost by
     * construction, and someone picking "Leave Approvals" from the bottom of
     * the list gets thrown back to the top. Remembering the offset restores it
     * before the browser paints, so there is no visible jump.
     *
     * sessionStorage rather than a module variable: it also survives a full
     * reload, and it is per-tab, so two tabs do not fight over it.
     */
    const navRef = useRef<HTMLElement>(null);

    const rememberScroll = useCallback(() => {
        try {
            if (navRef.current) {
                sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop));
            }
        } catch {
            /* private mode — the position just will not persist */
        }
    }, []);

    useLayoutEffect(() => {
        try {
            const saved = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0);
            if (saved > 0 && navRef.current) {
                navRef.current.scrollTop = saved;
            }
        } catch {
            /* nothing saved, or storage is blocked */
        }
    }, []);

    const activeHref = useMemo(() => {
        const path = location.pathname;
        return filteredMenuItems.reduce((best, item) => {
            const matches = path === item.href || path.startsWith(item.href + '/');
            return matches && item.href.length > best.length ? item.href : best;
        }, '');
    }, [filteredMenuItems, location.pathname]);

    const childNavItems = activeChildId ? [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: `/parent/child/${activeChildId}/dashboard` },
        { icon: ClipboardCheck, label: t('home.parent.attendance'), href: `/parent/child/${activeChildId}/attendance` },
        { icon: BookMarked, label: t('home.parent.marks'), href: `/parent/child/${activeChildId}/marks` },
        { icon: Wallet, label: t('home.parent.fees'), href: `/parent/child/${activeChildId}/fees` },
        { icon: Umbrella, label: t('home.parent.leave'), href: `/parent/child/${activeChildId}/leave` },
    ] : [];

    // Outside a specific child's pages, a parent has nothing global to
    // navigate to (Communication lives on the bell icon) — no sidebar at all,
    // rather than a rail with a single "Dashboard" item.
    if (!hasSidebar(role, location.pathname)) {
        return null;
    }

    return (
        <>
            {/* Mobile backdrop — tap to close the drawer */}
            {isSidebarOpen && (
                <div
                    onClick={closeSidebar}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                />
            )}
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-100 flex flex-col z-50",
                "transform transition-transform duration-300 ease-out",
                "lg:translate-x-0",
                isSidebarOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"
            )}
        >
            <div className="p-6">
                <div
                    onClick={canOpenCalendar ? () => { navigate('/academic-calendar'); closeSidebar(); } : undefined}
                    title={canOpenCalendar ? t('nav.academicCalendar', 'Academic calendar') : undefined}
                    className={cn(
                        "bg-[#FFF5F6] rounded-xl p-4 border border-[#FEE2E5] flex items-center justify-between transition-colors",
                        canOpenCalendar && "group cursor-pointer hover:bg-[#FEE2E5]"
                    )}
                >
                    <div className="flex-1 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('nav.academicYear')}</p>
                        <p className="text-sm font-bold text-brand">{academicYear}</p>
                    </div>
                </div>
            </div>

            <nav ref={navRef} onScroll={rememberScroll} className="flex-1 px-4 space-y-1 overflow-y-auto">
                {activeChildId ? (
                    <>
                        <NavLink
                            to="/home/parent"
                            onClick={closeSidebar}
                            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 group"
                        >
                            <ArrowLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                            <div className="min-w-0">
                                <span className="block font-semibold text-sm text-slate-500 group-hover:text-slate-900">{t('home.parent.myChildren')}</span>
                                {activeChildName && (
                                    <span className="block text-[11px] font-bold text-brand truncate">{activeChildName}</span>
                                )}
                            </div>
                        </NavLink>
                        <div className="h-px bg-slate-100 mx-2 mb-2" />
                        {childNavItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                onClick={closeSidebar}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-brand text-white shadow-lg shadow-brand/20"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={cn(
                                            "font-semibold text-sm",
                                            isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                                        )}>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </>
                ) : filteredMenuItems.map((item) => (
                    <NavLink
                        key={item.labelKey}
                        to={item.href}
                        onClick={closeSidebar}
                        aria-current={item.href === activeHref ? 'page' : undefined}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                            item.href === activeHref
                                ? "bg-brand text-white shadow-lg shadow-brand/20"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <item.icon
                            className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
                            strokeWidth={item.href === activeHref ? 2.5 : 2}
                        />
                        <span className={cn(
                            "font-semibold text-sm",
                            item.href === activeHref
                                ? "text-white"
                                : "text-slate-500 group-hover:text-slate-900"
                        )}>{t(item.labelKey)}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 mt-auto">
            </div>
        </aside>
        </>
    );
};
