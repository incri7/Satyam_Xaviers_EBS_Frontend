import React, { useState, useMemo } from 'react';
import { X, Save, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import type { Permission } from '../../types/auth';

interface CreatePermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (permission: {
        role: string;
        resource: string;
        can_create: boolean;
        can_read: boolean;
        can_update: boolean;
        can_delete: boolean;
    }) => Promise<void>;
    roles: string[];
    resources: string[];
    existingPermissions: Permission[];
    isLoading?: boolean;
}

export const CreatePermissionModal: React.FC<CreatePermissionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    roles,
    resources,
    existingPermissions,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        role: '',
        resource: '',
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false
    });

    // Check if permission already exists
    const isDuplicate = useMemo(() => {
        if (!formData.role || !formData.resource) return false;
        return existingPermissions.some(
            p => p.role.toLowerCase() === formData.role.toLowerCase() &&
                p.resource.toLowerCase() === formData.resource.toLowerCase()
        );
    }, [formData.role, formData.resource, existingPermissions]);

    const handleSubmit = async () => {
        if (!formData.role || !formData.resource) {
            alert('Please select both role and resource');
            return;
        }

        if (isDuplicate) {
            alert(`Permission already exists for ${formData.role} on ${formData.resource}. Please edit the existing permission instead.`);
            return;
        }

        await onSave(formData);

        // Reset form
        setFormData({
            role: '',
            resource: '',
            can_create: false,
            can_read: false,
            can_update: false,
            can_delete: false
        });
    };

    const handleToggle = (field: keyof typeof formData) => {
        setFormData(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
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
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand/5 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    Create New Permission
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                    Assign resource access to a role
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                            >
                                <option value="">Select a role...</option>
                                {roles.map(role => (
                                    <option key={role} value={role} className="capitalize">
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Resource Selection */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Resource <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.resource}
                                onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                            >
                                <option value="">Select a resource...</option>
                                {resources.map(resource => (
                                    <option key={resource} value={resource} className="capitalize">
                                        {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Duplicate Warning */}
                        {isDuplicate && (
                            <div className="flex items-start gap-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-orange-900">
                                        Permission Already Exists
                                    </p>
                                    <p className="text-xs text-orange-700 mt-1">
                                        A permission for <span className="font-bold">{formData.role}</span> on <span className="font-bold">{formData.resource}</span> already exists. Please edit the existing permission or choose a different combination.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Permissions Grid */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">
                                Permissions
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'can_create', label: 'Create', desc: 'Add new records' },
                                    { key: 'can_read', label: 'Read', desc: 'View information' },
                                    { key: 'can_update', label: 'Update', desc: 'Modify records' },
                                    { key: 'can_delete', label: 'Delete', desc: 'Remove records' }
                                ].map((perm) => (
                                    <div
                                        key={perm.key}
                                        onClick={() => handleToggle(perm.key as keyof typeof formData)}
                                        className={`
                                            p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                                            ${formData[perm.key as keyof typeof formData]
                                                ? 'border-brand bg-brand/5'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-700">{perm.label}</span>
                                            <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ${formData[perm.key as keyof typeof formData] ? 'bg-brand' : 'bg-slate-300'
                                                }`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${formData[perm.key as keyof typeof formData] ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">{perm.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-white rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSubmit}
                            isLoading={isLoading}
                            disabled={!formData.role || !formData.resource || isDuplicate}
                            className="px-8 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/30 flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            Create Permission
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
