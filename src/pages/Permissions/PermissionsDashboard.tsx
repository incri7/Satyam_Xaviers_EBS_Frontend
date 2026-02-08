import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Users, Shield, Database, CheckCircle2 } from 'lucide-react';
import { PermissionStats } from '../../components/permissions/PermissionStats';
import { PermissionToolbar } from '../../components/permissions/PermissionToolbar';
import { RolePermissionsList } from '../../components/permissions/RolePermissionsList';
import { PermissionSkeleton } from '../../components/permissions/PermissionSkeleton';
import { PermissionEditorModal } from '../../components/permissions/PermissionEditorModal';
import { CreatePermissionModal } from '../../components/permissions/CreatePermissionModal';
import { permissionsService } from '../../api/services/permissions.service';
import { usePermissionOptions } from '../../hooks/usePermissionOptions';
import type { Permission } from '../../types/auth';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PermissionsDashboard: React.FC = () => {
    const queryClient = useQueryClient();

    // Fetch Permissions
    const {
        data: permissions = [],
        isLoading: isPermissionsLoading,
        error: permissionsError
    } = useQuery({
        queryKey: ['permissions'],
        queryFn: permissionsService.getAllPermissions
    });

    // Fetch dynamic roles and resources
    const { options, isLoading: isOptionsLoading } = usePermissionOptions();

    // Mutations
    const createMutation = useMutation({
        mutationFn: permissionsService.createPermission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            setIsCreateModalOpen(false);
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to create permission');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedPermissions: Permission[]) => {
            await Promise.all(updatedPermissions.map(p =>
                permissionsService.updatePermission(p.id, {
                    can_create: p.can_create,
                    can_read: p.can_read,
                    can_update: p.can_update,
                    can_delete: p.can_delete
                })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            setIsModalOpen(false);
        },
        onError: (err: any) => {
            console.error('Failed to update permissions', err);
        }
    });

    const isLoading = isPermissionsLoading || isOptionsLoading || createMutation.isPending || updateMutation.isPending;

    // Filter Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const selectedRolePermissions = selectedRole
        ? permissions.filter(p => p.role === selectedRole)
        : [];

    const handleBulkSave = async (updatedPermissions: Permission[]) => {
        updateMutation.mutate(updatedPermissions);
    };

    const handleEditRole = (role: string) => {
        setSelectedRole(role);
        setIsModalOpen(true);
    };

    const handleNewPermission = () => {
        setIsCreateModalOpen(true);
    };

    const handleCreatePermission = async (newPermission: any) => {
        createMutation.mutate(newPermission);
    };

    const filteredPermissions = permissions.filter(p => {
        const matchesSearch =
            p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' ? true : p.role.toLowerCase() === roleFilter.toLowerCase();

        return matchesSearch && matchesRole;
    });

    const uniqueRoles = Array.from(new Set(filteredPermissions.map(p => p.role)));

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto ml-72">
                <DashboardHeader />

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PermissionStats
                            icon={CheckCircle2}
                            label="Permissioned Roles"
                            value={uniqueRoles.length}
                            color="blue"
                        />
                        <PermissionStats
                            icon={Database}
                            label="Resources"
                            value={new Set(permissions.map(p => p.resource)).size}
                            color="indigo"
                        />
                        <PermissionStats
                            icon={Shield}
                            label="Granted Permissions"
                            value={permissions.length.toString()}
                            color="emerald"
                        />
                        <PermissionStats
                            icon={Users}
                            label="System Roles"
                            value={options.roles.length.toString()}
                            color="purple"
                        />
                    </div>

                    {/* Main Content Area */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                    >
                        <div className="p-6">
                            <PermissionToolbar
                                onSearch={setSearchQuery}
                                onFilterChange={setRoleFilter}
                                onNewPermission={handleNewPermission}
                                roles={options.roles}
                            />

                            {/* Error State */}
                            {permissionsError ? (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                        <Shield className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto mb-6">
                                        {permissionsError instanceof Error ? permissionsError.message : 'Failed to request permissions'}
                                    </p>
                                    <button
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ['permissions'] })}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : isLoading ? (
                                <PermissionSkeleton />
                            ) : (
                                /* Grouped View by Role */
                                <div className="space-y-4 mt-6">
                                    {/* Table Header Row */}
                                    <div className="hidden md:flex items-center justify-between px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <div className="w-1/4">Role</div>
                                        <div className="w-1/6">Department</div>
                                        <div className="w-1/6">Users</div>
                                        <div className="w-1/6">Resources</div>
                                        <div className="w-1/6">Coverage</div>
                                        <div className="w-20 text-right">Actions</div>
                                    </div>

                                    {uniqueRoles.map((role: any) => {
                                        const rolePerms = filteredPermissions.filter((p: Permission) => p.role === role);

                                        // Calculate Stats
                                        const resourceCount = rolePerms.length;
                                        const totalPossible = resourceCount * 4;
                                        const activeCount = rolePerms.reduce((acc: number, p: Permission) => {
                                            return acc + (p.can_create ? 1 : 0) + (p.can_read ? 1 : 0) + (p.can_update ? 1 : 0) + (p.can_delete ? 1 : 0);
                                        }, 0);

                                        return (
                                            <RolePermissionsList
                                                key={role}
                                                roleName={role}
                                                department={role === 'student' ? 'Academic' : role === 'admin' ? 'Administration' : 'Staff'}
                                                userCount={role === 'student' ? 1250 : role === 'teacher' ? 45 : 5}
                                                resourceCount={resourceCount}
                                                permissionCount={activeCount}
                                                totalPossiblePermissions={totalPossible}
                                                onView={() => handleEditRole(role)}
                                            />
                                        );
                                    })}
                                    {uniqueRoles.length === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            No permissions found matching your criteria.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>

            <CreatePermissionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreatePermission}
                roles={options.roles}
                resources={options.resources}
                existingPermissions={permissions}
                isLoading={isLoading}
            />

            <PermissionEditorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleBulkSave}
                roleName={selectedRole || ''}
                permissions={selectedRolePermissions}
                isLoading={isLoading}
            />
        </div>
    );
};

export default PermissionsDashboard;
