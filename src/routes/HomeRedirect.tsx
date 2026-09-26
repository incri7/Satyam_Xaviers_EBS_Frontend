import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/useAuthStore';
import { homeForRole } from '../utils/roleHome';

/** Role-aware landing: send each user to their own home screen. */
export const HomeRedirect = () => {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    if (!_hasHydrated) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to={homeForRole(user?.role)} replace />;
};
