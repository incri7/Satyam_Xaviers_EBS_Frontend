import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    Wallet,
    MessageSquare,
    BarChart3,
    Settings
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/principal-dashboard' },
    { icon: GraduationCap, label: 'Academics', href: '/academics' },
    { icon: Users, label: 'Staff Management', href: '/staff' },
    { icon: Wallet, label: 'Financials', href: '/financials' },
    { icon: MessageSquare, label: 'Communication', href: '/communication' },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export const Sidebar: React.FC = () => {
    return (
        <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-100 flex flex-col z-50"
        >
            <div className="p-6">
                <div className="bg-[#FFF5F6] rounded-xl p-4 border border-[#FEE2E5] flex items-center justify-between group cursor-pointer hover:bg-[#FEE2E5] transition-colors">
                    <div className="flex-1 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Academic Year</p>
                        <p className="text-sm font-bold text-brand">2024-2025</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.href}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                            isActive
                                ? "bg-brand text-white shadow-lg shadow-brand/20"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform duration-200",
                                    "group-hover:scale-110"
                                )} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={cn(
                                    "font-semibold text-sm",
                                    isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                                )}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 mt-auto">
            </div>
        </motion.aside>
    );
};
