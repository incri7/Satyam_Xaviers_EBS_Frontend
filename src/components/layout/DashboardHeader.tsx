import { useState } from 'react';
import { Bell, ChevronDown, Languages, Menu, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SchoolLogo } from '../icons/SchoolLogo';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export const DashboardHeader: React.FC = () => {
    const { user } = useAuthStore();
    const { logout } = useAuth();
    const { toggleSidebar } = useUiStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Principal';
    const firstLetter = displayName.charAt(0).toUpperCase();
    const isNepali = i18n.language === 'ne';

    const toggleLanguage = () => {
        i18n.changeLanguage(isNepali ? 'en' : 'ne');
    };

    return (
        <motion.header
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30"
        >
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2.5 -ml-1 bg-slate-50 rounded-xl text-slate-600 hover:text-brand hover:bg-brand/5 transition-all shrink-0"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="cursor-pointer hidden sm:block shrink-0"
                >
                    <SchoolLogo className="w-12 h-12" />
                </motion.div>
                <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-bold text-slate-900 leading-tight truncate">{t('app.name')}</h1>
                    <p className="text-[11px] font-bold text-slate-400 truncate">
                        {new Date().toLocaleDateString(isNepali ? 'ne-NP' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-6 shrink-0">
                {/* Language toggle */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-slate-600 hover:text-brand hover:bg-brand/5 transition-all border border-slate-200"
                    title={t('language.toggle')}
                >
                    <Languages className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">{isNepali ? t('language.english') : t('language.nepali')}</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/communication')}
                    title={t('communication.title', 'Notices')}
                    className="relative p-2.5 bg-slate-50 rounded-xl text-slate-500 hover:text-brand hover:bg-brand/5 transition-all"
                >
                    <Bell className="w-5 h-5" />
                </motion.button>

                <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(v => !v)}
                        aria-expanded={menuOpen}
                        className="flex items-center gap-2 sm:gap-4 cursor-pointer pl-2 group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">{displayName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role || 'Principal'}</p>
                        </div>
                        <div className="relative">
                            {user?.profile_image_url && user.profile_image_url !== 'string' ? (
                                <img src={user.profile_image_url} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                                    {firstLetter}
                                </div>
                            )}
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-slate-400 group-hover:text-brand transition-transform",
                            menuOpen && "rotate-180 text-brand"
                        )} />
                    </button>

                    {/* Dropdown Menu — click-toggled (hover doesn't exist on touch) */}
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 origin-top-right">
                                <div className="p-2 space-y-1">
                                    <div className="px-4 py-2 border-b border-slate-50 sm:hidden">
                                        <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role}</p>
                                    </div>
                                    <button
                                        onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <UserCircle className="w-4 h-4" />
                                        {t('nav.profile', 'My Profile')}
                                    </button>
                                    <button
                                        onClick={() => { setMenuOpen(false); logout(); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {t('auth.signOut')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.header>
    );
};
