import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';

interface PermissionToolbarProps {
    onSearch: (query: string) => void;
    onFilterChange: (filter: string) => void;
    onNewPermission: () => void;
    roles?: string[];
}

export const PermissionToolbar: React.FC<PermissionToolbarProps> = ({
    onSearch,
    onFilterChange,
    onNewPermission,
    roles = []
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search roles, resources..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            <div className="flex gap-3">
                <div className="relative">
                    <select
                        className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer"
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        {roles.map(role => (
                            <option key={role} value={role} className="capitalize">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                        ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <button
                    onClick={onNewPermission}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl shadow-lg shadow-brand/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    New Permission
                </button>
            </div>
        </div>
    );
};
