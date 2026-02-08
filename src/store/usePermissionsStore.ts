import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Permission, PermissionAction } from '../types/auth';

interface PermissionsState {
    permissions: Permission[];
    isLoading: boolean;
    _hasHydrated: boolean;

    setPermissions: (permissions: Permission[]) => void;
    clearPermissions: () => void;
    setHasHydrated: (state: boolean) => void;
    hasPermission: (resource: string, action: PermissionAction) => boolean;
    hasAnyPermission: (checks: Array<{ resource: string; action: PermissionAction }>) => boolean;
    hasAllPermissions: (checks: Array<{ resource: string; action: PermissionAction }>) => boolean;
}

export const usePermissionsStore = create<PermissionsState>()(
    persist(
        (set, get) => ({
            permissions: [],
            isLoading: false,
            _hasHydrated: false,

            setPermissions: (permissions) => set({ permissions, isLoading: false }),

            clearPermissions: () => set({ permissions: [], isLoading: false }),

            setHasHydrated: (state) => set({ _hasHydrated: state }),

            hasPermission: (resource, action) => {
                const { permissions } = get();
                if (!permissions || !Array.isArray(permissions)) return false;

                const permission = permissions.find((p) => p.resource === resource);
                if (!permission) return false;

                switch (action) {
                    case 'create':
                        return permission.can_create;
                    case 'read':
                        return permission.can_read;
                    case 'update':
                        return permission.can_update;
                    case 'delete':
                        return permission.can_delete;
                    default:
                        return false;
                }
            },

            hasAnyPermission: (checks) => {
                const { permissions } = get();
                if (!permissions || !Array.isArray(permissions) || !checks || !Array.isArray(checks)) return false;

                return checks.some(({ resource, action }) => {
                    const permission = permissions.find((p) => p.resource === resource);
                    if (!permission) return false;

                    switch (action) {
                        case 'create':
                            return permission.can_create;
                        case 'read':
                            return permission.can_read;
                        case 'update':
                            return permission.can_update;
                        case 'delete':
                            return permission.can_delete;
                        default:
                            return false;
                    }
                });
            },

            hasAllPermissions: (checks) => {
                const { permissions } = get();
                if (!permissions || !Array.isArray(permissions) || !checks || !Array.isArray(checks)) return false;

                return checks.every(({ resource, action }) => {
                    const permission = permissions.find((p) => p.resource === resource);
                    if (!permission) return false;

                    switch (action) {
                        case 'create':
                            return permission.can_create;
                        case 'read':
                            return permission.can_read;
                        case 'update':
                            return permission.can_update;
                        case 'delete':
                            return permission.can_delete;
                        default:
                            return false;
                    }
                });
            },
        }),
        {
            name: 'permissions-storage',
            onRehydrateStorage: (state) => {
                return () => state?.setHasHydrated(true);
            }
        }
    )
);
