import { Bell, ChevronDown } from 'lucide-react';
import { SchoolLogo } from '../icons/SchoolLogo';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';

export const DashboardHeader: React.FC = () => {
    const { user } = useAuthStore();
    const { logout } = useAuth();
    const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Principal';
    const firstLetter = displayName.charAt(0).toUpperCase();

    return (
        <motion.header
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40"
        >
            <div className="flex items-center gap-4">
                <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="cursor-pointer"
                >
                    <SchoolLogo className="w-12 h-12" />
                </motion.div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">Satyam Xavier's EBS</h1>
                    <p className="text-[11px] font-bold text-slate-400">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative p-2.5 bg-slate-50 rounded-xl text-slate-500 hover:text-brand hover:bg-brand/5 transition-all"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-white"></span>
                </motion.button>

                <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>

                <div className="relative group">
                    <motion.div
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-4 cursor-pointer pl-2"
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
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                    </motion.div>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                        <div className="p-2">
                            <button
                                onClick={() => logout()}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
};
