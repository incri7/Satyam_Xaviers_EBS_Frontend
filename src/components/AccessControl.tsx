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
        // Fail CLOSED. An unregistered id previously rendered its children to
        // everyone, so forgetting a registry entry silently published a
        // privileged control to every role. Denying is the safe default: the
        // damage from a hidden button is a missing feature, from a shown one a
        // privilege leak.
        console.error(
            `AccessControl: component ID "${id}" is not in PERMISSION_REGISTRY — ` +
            `denying access. Register it in config/permissionRegistry.ts.`
        );
        return <>{fallback ?? null}</>;
    }

    return (
        <PermissionGate permissions={permissions} fallback={fallback}>
            {children}
        </PermissionGate>
    );
};
