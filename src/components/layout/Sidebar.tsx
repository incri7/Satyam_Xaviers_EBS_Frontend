import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    Wallet,
    MessageSquare,
    BarChart3,
    Settings,
    Shield
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { usePermissionsStore } from '../../store/usePermissionsStore';

import type { PermissionAction } from '../../types/auth';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
    permission?: { resource: string; action: PermissionAction };
}

const menuItems: MenuItem[] = [
    {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/dashboard',
        permission: { resource: 'dashboard', action: 'read' } // Everyone should have dashboard:read or similar
    },
    {
        icon: GraduationCap,
        label: 'Academics',
        href: '/academics',
        permission: { resource: 'classes', action: 'read' }
    },
    {
        icon: Users,
        label: 'People Management',
        href: '/people',
        permission: { resource: 'users', action: 'read' }
    },
    {
        icon: Wallet,
        label: 'Financials',
        href: '/financials',
        permission: { resource: 'finances', action: 'read' }
    },
    {
        icon: MessageSquare,
        label: 'Communication',
        href: '/communication',
        // 'communication' resource doesn't exist in backend, falling back to basic role check or skipping if strictly permission based.
        // Assuming 'notices' or similar feature. Without explicit resource, maybe use 'staff:read' as placeholder or just show it.
        // Let's use 'staff:read' for now as a proxy since communication usually involves staff.
        permission: { resource: 'staff', action: 'read' }
    },
    {
        icon: BarChart3,
        label: 'Reports',
        href: '/reports',
        permission: { resource: 'finances', action: 'read' }
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
        permission: { resource: 'users', action: 'read' }
    },
    {
        icon: Shield,
        label: 'Access Control',
        href: '/settings/permissions',
        permission: { resource: 'permissions', action: 'read' }
    }
];

export const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissionsStore();


    const filteredMenuItems = menuItems.filter(item => {


        if (!item.permission) return true;
        return hasPermission(item.permission.resource, item.permission.action);
    });

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
                {filteredMenuItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.href}
                        end={item.href === '/settings'} // Only match exact path for Settings to avoid conflict with /settings/permissions
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
