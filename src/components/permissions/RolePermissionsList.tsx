import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Shield, Users } from 'lucide-react';

interface RolePermissionsListProps {
    roleName: string;
    department?: string;
    userCount?: number;
    resourceCount: number;
    permissionCount: number; // e.g., total "true" flags
    totalPossiblePermissions: number; // resources * 4
    onView: () => void;
}

export const RolePermissionsList: React.FC<RolePermissionsListProps> = ({
    roleName,
    department = 'General',
    userCount = 0,
    resourceCount,
    permissionCount,
    totalPossiblePermissions,
    onView
}) => {
    // Determine status color based on coverage
    const coverage = permissionCount / (totalPossiblePermissions || 1);
    const statusColor = coverage > 0.8 ? 'bg-emerald-500' : coverage > 0.4 ? 'bg-orange-500' : 'bg-red-500';

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-slate-100 rounded-xl p-6 flex items-center justify-between hover:shadow-lg transition-all duration-300 group"
        >
            <div className="flex items-center gap-4 w-1/4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand/5 group-hover:text-brand group-hover:border-brand/20 transition-colors">
                    <Shield className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg capitalize mb-0.5">{roleName}</h4>
                    <p className="text-xs text-slate-400 font-medium">System Role</p>
                </div>
            </div>

            <div className="w-1/6">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                    {department}
                </span>
            </div>

            <div className="w-1/6 flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-sm">{userCount}</span>
            </div>

            <div className="w-1/6">
                <p className="text-sm font-bold text-slate-700">{resourceCount} Resources</p>
                <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${statusColor}`}
                        style={{ width: `${coverage * 100}%` }}
                    />
                </div>
            </div>

            <div className="w-1/6 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-sm font-bold text-slate-600">
                    {permissionCount}/{totalPossiblePermissions}
                </span>
            </div>

            <div className="w-20 flex justify-end">
                <button
                    onClick={onView}
                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    title="Edit Permissions"
                >
                    <Pencil className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
};
