import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Pencil,
    Eye,
    RotateCcw,
    Trash2,
    GraduationCap,
    Users,
    BookOpen,
    Wallet,
    Shield,
    Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Permission } from '../../types/auth';
import { Button } from '../ui/Button';

interface PermissionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPermissions: Permission[]) => Promise<void>;
    roleName: string;
    permissions: Permission[];
    isLoading?: boolean;
}

// Resource mapping for better UI
const RESOURCE_METADATA: Record<string, { icon: React.ElementType, description: string }> = {
    students: { icon: GraduationCap, description: "Student records and profiles" },
    staff: { icon: Users, description: "Staff management and payroll" },
    teachers: { icon: Users, description: "Teacher assignments and data" },
    classes: { icon: BookOpen, description: "Academic class management" },
    finances: { icon: Wallet, description: "Financial records and transactions" },
    permissions: { icon: Shield, description: "System security and access control" },
    users: { icon: Users, description: "System user management" },
    notices: { icon: Database, description: "Public announcements and alerts" }
};

const ACTION_METADATA = [
    { key: 'can_create', label: 'Create', icon: Pencil, description: "Add new records and entries" },
    { key: 'can_read', label: 'Read', icon: Eye, description: "View and access information" },
    { key: 'can_update', label: 'Update', icon: RotateCcw, description: "Modify existing records" },
    { key: 'can_delete', label: 'Delete', icon: Trash2, description: "Remove records permanently" }
];

const ResourcePermissionCard: React.FC<{
    permission: Permission;
    onChange: (updated: Permission) => void;
}> = ({ permission, onChange }) => {
    const metadata = RESOURCE_METADATA[permission.resource.toLowerCase()] || { icon: Database, description: "Resource Access" };
    const Icon = metadata.icon;

    const handleToggle = (field: keyof Permission) => {
        onChange({
            ...permission,
            [field]: !permission[field as keyof Permission]
        });
    };

    return (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Resource Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-slate-900 capitalize leading-none mb-1.5">{permission.resource}</h4>
                    <p className="text-sm font-medium text-slate-500">{metadata.description}</p>
                </div>
            </div>

            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACTION_METADATA.map((action) => {
                    const isActive = !!permission[action.key as keyof Permission];
                    const ActionIcon = action.icon;

                    return (
                        <div
                            key={action.key}
                            onClick={() => handleToggle(action.key as keyof Permission)}
                            className={`group cursor-pointer border-2 rounded-2xl p-4 flex flex-col transition-all duration-200 ${isActive
                                ? 'bg-white border-blue-600 shadow-sm'
                                : 'bg-white border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ActionIcon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className={`text-sm font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {action.label}
                                    </span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${isActive ? 'bg-blue-600' : 'bg-slate-200'
                                    }`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'
                                        }`} />
                                </div>
                            </div>
                            <p className={`text-xs font-medium leading-tight ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                                {action.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const PermissionEditorModal: React.FC<PermissionEditorModalProps> = ({
    isOpen,
    onClose,
    onSave,
    roleName,
    permissions,
    isLoading = false
}) => {
    const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

    useEffect(() => {
        setLocalPermissions(permissions);
    }, [permissions, isOpen]);

    const handlePermissionChange = (updated: Permission) => {
        setLocalPermissions(prev => prev.map(p => p.id === updated.id ? updated : p));
    };

    const handleSave = () => {
        onSave(localPermissions);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="relative w-full max-w-6xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white z-10">
                        <div>
                            <h3 className="text-3xl font-extrabold text-slate-900 capitalize">
                                {roleName} Permissions
                            </h3>
                            <p className="text-slate-500 font-semibold mt-1">
                                Managing {localPermissions.length} resource permissions for this role
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                        <div className="space-y-8 max-w-5xl mx-auto">
                            {localPermissions.map(perm => (
                                <ResourcePermissionCard
                                    key={perm.id}
                                    permission={perm}
                                    onChange={handlePermissionChange}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-6 border-t border-slate-50 bg-white flex items-center justify-end gap-3 z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSave}
                            isLoading={isLoading}
                            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Save className="w-4 h-4" />
                            Update Permissions
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
