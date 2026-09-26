import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Menu, UserCircle } from 'lucide-react';

import { LanguageSwitch } from '../LanguageSwitch';
import { Avatar } from '../../features/shell/AccountCard';
import { useDisplayName } from '../../features/shell/identity';
import { useNavigation } from '../../features/shell/navigation';
import { useAcademicYearLabel } from '../../features/shell/useAcademicYear';
import { NotificationsBell } from '../../features/shell/NotificationsPanel';
import { AskAiButton } from '../../features/shell/AskAiPanel';
import { SIDEBAR_ID } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { hasSidebar } from '../../utils/sidebarVisibility';
import { cn } from '../../utils/cn';

export interface DashboardHeaderProps {
    /** Page name. Defaults to the menu item for the current route. */
    title?: string;
}

/**
 * Top bar of every signed-in page. Figma B01 "Top bar" (laptop) and
 * "App bar" (phone).
 *
 * - Laptop: page title with today's date and the academic year; language
 *   switch and notices on the right. The account lives in the sidebar.
 * - Phone: date above a large title, notices on the right. Roles with a tab
 *   bar reach the menu through More; the rest get a menu button here.
 * - Parents outside a child's pages have no sidebar, so the language switch
 *   and the account menu stay in this bar for them.
 */
export function DashboardHeader({ title }: DashboardHeaderProps) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { pathname } = useLocation();
    const role = useAuthStore((s) => s.user?.role);
    const { active, tabs } = useNavigation();
    const { toggleSidebar, isSidebarOpen } = useUiStore();
    const year = useAcademicYearLabel();

    const withSidebar = hasSidebar(role, pathname);
    const showMenuButton = withSidebar && tabs.length === 0;
    const pageTitle = title ?? (active ? t(`shell.nav.${active.labelKey}`) : t('app.name'));
    const today = new Date();

    return (
        <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-line bg-canvas px-[18px] pt-[max(env(safe-area-inset-top),6px)] pb-2.5 font-ui lg:h-[72px] lg:px-7 lg:py-3.5">
            {showMenuButton && (
                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={t('shell.openMenu')}
                    aria-expanded={isSidebarOpen}
                    aria-controls={SIDEBAR_ID}
                    className={cn(iconButton, '-ml-1 lg:hidden')}
                >
                    <Menu size={18} aria-hidden />
                </button>
            )}

            <div className="flex min-w-0 flex-1 flex-col lg:flex-col-reverse lg:gap-px">
                <p className="truncate type-small text-muted">
                    <span className="lg:hidden">{df.date(today, 'dayMonth')}</span>
                    <span className="hidden lg:inline">{t('shell.subtitle', { date: df.date(today, 'long'), year })}</span>
                </p>
                <h1 className="truncate type-h2 text-ink lg:type-h3">{pageTitle}</h1>
            </div>

            <AskAiButton />

            <div className={cn('shrink-0', withSidebar && 'hidden lg:block')}>
                <LanguageSwitch />
            </div>

            <NotificationsBell className={iconButton} />

            {!withSidebar && <HeaderAccountMenu />}
        </header>
    );
}

const iconButton =
    'grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-inset ring-line outline-none transition-colors hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60';

/** Account menu for pages without a sidebar (parents' top level). */
function HeaderAccountMenu() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const user = useAuthStore((s) => s.user);
    const name = useDisplayName();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!user) return null;
    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t('shell.account.menu')}
                className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-focus/60"
            >
                <Avatar name={name} src={user.profile_image_url} className="size-10 bg-primary text-on-primary" />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 animate-rise rounded-row border border-line bg-surface p-1.5 shadow-e3">
                    <p className="truncate px-3 pt-1.5 pb-2 type-small-semibold text-ink">{name}</p>
                    <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/profile'); }} className={menuItem}>
                        <UserCircle size={16} aria-hidden /> {t('shell.account.profile')}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setOpen(false); logout(); }} className={cn(menuItem, 'text-bad hover:bg-bad-soft')}>
                        <LogOut size={16} aria-hidden /> {t('shell.account.signOut')}
                    </button>
                </div>
            )}
        </div>
    );
}

const menuItem = 'flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 type-small-medium text-ink outline-none hover:bg-sunken focus-visible:bg-sunken';
