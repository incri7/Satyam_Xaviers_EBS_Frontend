import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { homeForRole } from '../utils/roleHome';

interface RoleRouteProps {
    /** Roles allowed to render this branch. 'admin' is always allowed. */
    roles: string[];
}

/**
 * Route-level role guard. Must be nested inside ProtectedRoute (auth is
 * already checked there). Users outside the allowed roles are sent to
 * their own home screen instead of another role's UI shell.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ roles }) => {
    const { user } = useAuthStore();
    const role = user?.role;

    if (role === 'admin' || (role && roles.includes(role))) {
        return <Outlet />;
    }

    return <Navigate to={homeForRole(role)} replace />;
};
