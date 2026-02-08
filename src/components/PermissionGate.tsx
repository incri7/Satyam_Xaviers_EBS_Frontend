import React from 'react';
import { usePermissionsStore } from '../store/usePermissionsStore';
import type { PermissionAction } from '../types/auth';

interface PermissionGateProps {
    children: React.ReactNode;
    permissions: Array<{ resource: string; action: PermissionAction }>;
    checkType?: 'any' | 'all';
    fallback?: React.ReactNode;
}

/**
 * A reusable wrapper to hide UI elements based on permissions.
 * Usage:
 * <PermissionGate permissions={[{ resource: 'students', action: 'create' }]}>
 *    <button>Add Student</button>
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    children,
    permissions,
    checkType = 'any',
    fallback = null
}) => {
    const { hasAnyPermission, hasAllPermissions } = usePermissionsStore();

    const isAllowed = checkType === 'any'
        ? hasAnyPermission(permissions)
        : hasAllPermissions(permissions);

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
