import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Shield, Users, Lock } from 'lucide-react';

interface RolePermissionsListProps {
    roleName: string;
    department?: string;
    userCount?: number;
    resourceCount: number;
    permissionCount: number; // e.g., total "true" flags
    totalPossiblePermissions: number; // resources * 4
    locked?: boolean; // admin: fixed super-role, not editable
    onView: () => void;
}

export const RolePermissionsList: React.FC<RolePermissionsListProps> = ({
    roleName,
    department = 'General',
    userCount = 0,
    resourceCount,
    permissionCount,
    totalPossiblePermissions,
    locked = false,
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
            className="bg-white border border-slate-100 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300 group"
        >
            {/* Top row: identity + edit (always) */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand/5 group-hover:text-brand group-hover:border-brand/20 transition-colors shrink-0">
                        <Shield className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800 text-base md:text-lg capitalize truncate">{roleName}</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                {department}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">System Role</p>
                    </div>
                </div>
                {locked ? (
                    <span
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center shrink-0 cursor-not-allowed"
                        title="Admin permissions are fixed and cannot be changed"
                    >
                        <Lock className="w-5 h-5" />
                    </span>
                ) : (
                    <button
                        onClick={onView}
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
                        title="Edit Permissions"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Stats row: wraps on phones, inline on desktop */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 md:mt-4 pl-14 md:pl-16">
                <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-sm">{userCount}</span>
                    <span className="text-xs text-slate-400">users</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className="text-sm font-bold text-slate-600">{permissionCount}/{totalPossiblePermissions}</span>
                    <span className="text-xs text-slate-400">{resourceCount} resources</span>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[100px] max-w-[160px]">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${statusColor}`}
                            style={{ width: `${coverage * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
