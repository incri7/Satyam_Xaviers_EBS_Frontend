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
    Shield,
    ClipboardCheck,
    BookMarked,
    ClipboardList
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useAuthStore } from '../../store/useAuthStore';

import type { PermissionAction } from '../../types/auth';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
    permission?: { resource: string; action: PermissionAction };
    roles?: string[];
}

const menuItems: MenuItem[] = [
    {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/dashboard',
    },
    {
        icon: GraduationCap,
        label: 'Academics',
        href: '/academics',
        permission: { resource: 'classes', action: 'read' },
        roles: ['admin', 'principal', 'coordinator'],
    },
    {
        icon: Users,
        label: 'People Management',
        href: '/people',
        permission: { resource: 'users', action: 'read' },
        roles: ['admin', 'principal'],
    },
    {
        icon: Wallet,
        label: 'Finances',
        href: '/finances',
        permission: { resource: 'finances', action: 'read' },
        roles: ['admin', 'principal', 'accountant'],
    },
    {
        icon: ClipboardCheck,
        label: 'Attendance',
        href: '/attendance',
        permission: { resource: 'attendance', action: 'create' },
        roles: ['admin', 'principal', 'coordinator', 'teacher'],
    },
    {
        icon: BookMarked,
        label: 'Marks',
        href: '/marks',
        permission: { resource: 'marks', action: 'create' },
        roles: ['admin', 'principal', 'coordinator', 'teacher'],
    },
    {
        icon: ClipboardList,
        label: 'Assignments',
        href: '/assignments',
        permission: { resource: 'assignments', action: 'read' },
        roles: ['admin', 'principal', 'coordinator', 'teacher', 'student'],
    },
    {
        icon: MessageSquare,
        label: 'Communication',
        href: '/communication',
        permission: { resource: 'staff', action: 'read' },
        roles: ['admin', 'principal', 'coordinator', 'teacher', 'accountant', 'staff'],
    },
    {
        icon: BarChart3,
        label: 'Reports',
        href: '/reports',
        permission: { resource: 'finances', action: 'read' },
        roles: ['admin', 'principal', 'coordinator', 'accountant'],
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
        permission: { resource: 'users', action: 'read' },
        roles: ['admin', 'principal'],
    },
    {
        icon: Shield,
        label: 'Access Control',
        href: '/settings/permissions',
        permission: { resource: 'permissions', action: 'read' },
        roles: ['admin'],
    },
];

export const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissionsStore();
    const { user } = useAuthStore();
    const role = user?.role ?? '';
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const academicYear = `${startYear}-${startYear + 1}`;

    const filteredMenuItems = menuItems.filter(item => {
        // If role restrictions are defined, role membership is the sole gate.
        // Permission store is seeded per-role and may not include every resource,
        // so we trust the roles array as the authoritative access control for nav items.
        if (item.roles) return item.roles.includes(role);
        // No role restriction (e.g. Dashboard) — fall back to permission check.
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
                        <p className="text-sm font-bold text-brand">{academicYear}</p>
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
