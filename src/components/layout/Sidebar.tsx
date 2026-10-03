import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookMarked, ClipboardCheck, LayoutDashboard, Umbrella, Users, Wallet, X, type LucideIcon } from 'lucide-react';

import { CountPill, SchoolCrest } from '../../design-system';
import { LanguageSwitch } from '../LanguageSwitch';
import { AccountCard } from '../../features/shell/AccountCard';
import { MobileTabBar } from '../../features/shell/MobileTabBar';
import { useNavigation } from '../../features/shell/navigation';
import { usePendingLeaveCount } from '../../features/shell/usePendingLeaveCount';
import { parentService } from '../../api/services/parent.service';
import { useUiStore } from '../../store/useUiStore';
import { hasSidebar } from '../../utils/sidebarVisibility';
import { cn } from '../../utils/cn';
import { homeForRole } from '../../utils/roleHome';

const SCROLL_KEY = 'sidebar_scroll_top';
export const SIDEBAR_ID = 'app-sidebar';

/**
 * The signed-in navigation rail. Figma B01 "Sidebar": navy, 260px, items in
 * groups, the account card at the foot.
 *
 * - Laptop (lg): always visible; pages leave `lg:pl-[260px]` for it.
 * - Phone and tablet: a drawer, opened by "More" on the tab bar (roles that
 *   have one) or by the menu button in the top bar.
 *
 * Every page renders its own <Sidebar />, so this also renders the phone tab
 * bar; pages need nothing else.
 */
export function Sidebar() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const { role, groups, active, tabs } = useNavigation();
    const { isSidebarOpen, closeSidebar } = useUiStore();
    const { count: pendingLeave } = usePendingLeaveCount();

    // A child-scoped menu once someone opens one child's pages, since
    // attendance, marks, fees and leave only make sense per child. Parents,
    // and staff whose own child studies here (the list is empty for others).
    const childMatch = pathname.match(/^\/parent\/child\/(\d+)/);
    const childId = childMatch?.[1] ?? null;
    const { data: childrenData } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
        enabled: !!role,
        staleTime: 5 * 60 * 1000,
    });
    const staffChildren = role !== 'parent' ? childrenData?.children ?? [] : [];
    const child = childId ? childrenData?.children.find((c) => String(c.student_id) === childId) : undefined;
    const childName = child ? [child.first_name, child.last_name].filter(Boolean).join(' ') : undefined;

    /*
     * Keep the menu where the user left it. Each page mounts its own sidebar,
     * so the scroll offset would otherwise reset on every navigation.
     * sessionStorage: survives a reload, and two tabs do not fight over it.
     */
    const navRef = useRef<HTMLElement>(null);
    const rememberScroll = useCallback(() => {
        try {
            if (navRef.current) sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop));
        } catch { /* storage blocked: the position just will not persist */ }
    }, []);
    useLayoutEffect(() => {
        try {
            const saved = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0);
            if (saved > 0 && navRef.current) navRef.current.scrollTop = saved;
        } catch { /* nothing saved */ }
    }, []);

    useEffect(() => {
        if (!isSidebarOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSidebar(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isSidebarOpen, closeSidebar]);

    if (!hasSidebar(role, pathname)) return null;

    const childItems: { icon: LucideIcon; label: string; href: string }[] = childId
        ? [
            { icon: LayoutDashboard, label: t('nav.dashboard'), href: `/parent/child/${childId}/dashboard` },
            { icon: ClipboardCheck, label: t('home.parent.attendance'), href: `/parent/child/${childId}/attendance` },
            { icon: BookMarked, label: t('home.parent.marks'), href: `/parent/child/${childId}/marks` },
            { icon: Wallet, label: t('home.parent.fees'), href: `/parent/child/${childId}/fees` },
            { icon: Umbrella, label: t('home.parent.leave'), href: `/parent/child/${childId}/leave` },
        ]
        : [];

    return (
        <>
            {isSidebarOpen && (
                <div
                    aria-hidden
                    onClick={closeSidebar}
                    className="fixed inset-0 z-[45] bg-inverse/40 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                id={SIDEBAR_ID}
                aria-label={t('shell.mainNav')}
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-4 bg-rail px-3.5 py-[18px] font-ui text-white lg:w-[260px]',
                    'transition-[translate,visibility] duration-300 ease-sx',
                    'lg:visible lg:translate-x-0',
                    // Closed on a phone: off-screen AND out of the tab order.
                    isSidebarOpen ? 'translate-x-0 shadow-e3' : 'invisible -translate-x-full',
                )}
            >
                <div className="flex items-center gap-2.5 px-1.5 py-1">
                    <SchoolCrest size={42} ring className="ring-white/14" />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate type-title text-white">{t('shell.school.short')}</span>
                        <span className="truncate type-caption text-white/62">{t('shell.school.kind')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={closeSidebar}
                        aria-label={t('shell.closeMenu')}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden"
                    >
                        <X size={18} aria-hidden />
                    </button>
                </div>

                <nav
                    ref={navRef}
                    onScroll={rememberScroll}
                    className="-mx-1 flex flex-1 flex-col gap-3.5 overflow-y-auto px-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]"
                >
                    {childId ? (
                        <div className="flex flex-col gap-0.5">
                            <Link
                                to={role === 'parent' ? '/home/parent' : homeForRole(role ?? '')}
                                onClick={closeSidebar}
                                className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                <ArrowLeft size={18} className="shrink-0 text-white/74" aria-hidden />
                                <span className="min-w-0">
                                    <span className="block type-small-medium text-white/78">{role === 'parent' ? t('home.parent.myChildren') : t('family.backToWork')}</span>
                                    {childName && <span className="block truncate type-caption-semibold text-white">{childName}</span>}
                                </span>
                            </Link>
                            <div className="mx-2.5 my-1.5 h-px bg-white/12" />
                            {childItems.map((item) => (
                                <NavRow
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    active={pathname === item.href}
                                    onNavigate={closeSidebar}
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                        {groups.map((group) => (
                            <div key={group.id} role="group" aria-labelledby={`nav-group-${group.id}`} className="flex flex-col gap-0.5">
                                <p id={`nav-group-${group.id}`} className="px-2.5 pb-1.5 type-caption text-white/55">
                                    {t(`shell.groups.${group.id}`)}
                                </p>
                                {group.items.map((item) => (
                                    <NavRow
                                        key={item.id}
                                        href={item.href}
                                        icon={item.icon}
                                        label={t(`shell.nav.${item.labelKey}`)}
                                        active={item.id === active?.id}
                                        onNavigate={closeSidebar}
                                        badge={
                                            item.id === 'leaveRequests' ? (
                                                <CountPill count={pendingLeave} label={t('shell.leaveWaiting', { count: pendingLeave, n: pendingLeave })} />
                                            ) : undefined
                                        }
                                    />
                                ))}
                            </div>
                        ))}
                        {/* A teacher or other member of staff whose own child studies here. */}
                        {staffChildren.length > 0 && (
                            <div role="group" aria-labelledby="nav-group-my-children" className="flex flex-col gap-0.5">
                                <p id="nav-group-my-children" className="px-2.5 pb-1.5 type-caption text-white/55">{t('home.parent.myChildren')}</p>
                                {staffChildren.map((c) => (
                                    <NavRow
                                        key={c.student_id}
                                        href={`/parent/child/${c.student_id}/dashboard`}
                                        icon={Users}
                                        label={[c.first_name, c.last_name].filter(Boolean).join(' ')}
                                        active={false}
                                        onNavigate={closeSidebar}
                                    />
                                ))}
                            </div>
                        )}
                        </>
                    )}
                </nav>

                {/* On phones the top bar has no room for it; the drawer does. */}
                <div className="flex justify-center lg:hidden">
                    <LanguageSwitch appearance="onDark" />
                </div>

                <AccountCard onNavigate={closeSidebar} />
            </aside>

            {tabs.length > 0 && <MobileTabBar tabs={tabs} />}
        </>
    );
}

function NavRow({
    href,
    icon: Icon,
    label,
    active,
    badge,
    onNavigate,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    badge?: ReactNode;
    onNavigate: () => void;
}) {
    return (
        <Link
            to={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex h-10 shrink-0 items-center gap-2.5 rounded-[12px] px-2.5 outline-none transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-white/60',
                active ? 'bg-white/14 ring-1 ring-inset ring-white/16' : 'hover:bg-white/8',
            )}
        >
            <Icon size={18} strokeWidth={active ? 2.25 : 2} className={cn('shrink-0', active ? 'text-white' : 'text-white/74')} aria-hidden />
            <span className={cn('min-w-0 flex-1 truncate', active ? 'type-small-semibold text-white' : 'type-small-medium text-white/78')}>
                {label}
            </span>
            {badge}
            {active && <span aria-hidden className="h-5 w-[3px] shrink-0 rounded-full bg-white" />}
        </Link>
    );
}
