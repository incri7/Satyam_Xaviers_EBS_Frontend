import React from 'react';
import { PermissionGate } from './PermissionGate';
import { PERMISSION_REGISTRY, type ComponentId } from '../config/permissionRegistry';

interface AccessControlProps {
    id: ComponentId;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * High-level component to control visibility using centralized registry IDs.
 * Use this to avoid manual permission checks in component files.
 */
export const AccessControl: React.FC<AccessControlProps> = ({ id, children, fallback }) => {
    const permissions = PERMISSION_REGISTRY[id];

    if (!permissions) {
        console.warn(`AccessControl: Component ID "${id}" not found in permission registry.`);
        return <>{children}</>; // Default to showing if not registered
    }

    return (
        <PermissionGate permissions={permissions} fallback={fallback}>
            {children}
        </PermissionGate>
    );
};
