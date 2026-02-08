import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionsStore } from '../store/usePermissionsStore';

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
    const { _hasHydrated: permsHydrated } = usePermissionsStore();

    if (!authHydrated || !permsHydrated) {
        return null; // or a loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
