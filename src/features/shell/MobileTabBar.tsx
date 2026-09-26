import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '../../store/useUiStore';
import { cn } from '../../utils/cn';
import { MORE_ICON, TAB_LABEL_KEY, useNavigation, type NavItem } from './navigation';

/**
 * Floating tab bar on phones and tablets. Figma B01 mobile "Tab bar":
 * four destinations and More, which opens the full menu (the sidebar drawer).
 */
export function MobileTabBar({ tabs }: { tabs: NavItem[] }) {
    const { t } = useTranslation();
    const { active } = useNavigation();
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useUiStore();

    // Lets every page's <main> keep its last rows clear of the bar (tokens.css).
    useEffect(() => {
        document.documentElement.dataset.tabBar = '';
        return () => { delete document.documentElement.dataset.tabBar; };
    }, []);

    const MoreIcon = MORE_ICON;
    const moreActive = isSidebarOpen || (active !== undefined && !tabs.some((tab) => tab.id === active.id));

    return (
        <nav
            aria-label={t('shell.mainNav')}
            className="fixed inset-x-3.5 bottom-[calc(20px+env(safe-area-inset-bottom))] z-40 flex h-16 rounded-[26px] bg-inverse/92 p-[7px] shadow-e3 backdrop-blur-md lg:hidden"
        >
            {tabs.map((tab) => {
                const on = !isSidebarOpen && tab.id === active?.id;
                return (
                    <Link
                        key={tab.id}
                        to={tab.href}
                        onClick={closeSidebar}
                        aria-current={on ? 'page' : undefined}
                        className={cn(tabClass, on && 'bg-white/13')}
                    >
                        <tab.icon size={21} strokeWidth={on ? 2.25 : 2} className={on ? 'text-white' : 'text-white/62'} aria-hidden />
                        <span className={on ? 'type-micro-bold text-white' : 'type-micro text-white/62'}>
                            {t(`shell.nav.${TAB_LABEL_KEY[tab.id] ?? tab.labelKey}`)}
                        </span>
                    </Link>
                );
            })}
            <button
                type="button"
                onClick={toggleSidebar}
                aria-expanded={isSidebarOpen}
                aria-controls="app-sidebar"
                className={cn(tabClass, moreActive && 'bg-white/13')}
            >
                <MoreIcon size={21} className={moreActive ? 'text-white' : 'text-white/62'} aria-hidden />
                <span className={moreActive ? 'type-micro-bold text-white' : 'type-micro text-white/62'}>{t('shell.nav.more')}</span>
            </button>
        </nav>
    );
}

const tabClass =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[19px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/60';
