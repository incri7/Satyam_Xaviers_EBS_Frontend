import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionsStore } from '../store/usePermissionsStore';
import { authService } from '../api/services/auth.service';
import { permissionsService } from '../api/services/permissions.service';

export const useAuth = () => {
    const navigate = useNavigate();
    const {
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        setAuth,
        logout: clearAuth
    } = useAuthStore();

    const { setPermissions, clearPermissions } = usePermissionsStore();

    const login = async (credentials: any) => {
        try {
            const data = await authService.login(credentials);
            setAuth(data.user, data.access_token, data.refresh_token || '');

            // Fetch permissions after successful login
            try {
                const permissionsData = await permissionsService.getMyPermissions();
                // Backend returns array directly, not wrapped in object
                setPermissions(permissionsData);
            } catch (permError) {
                console.error('Failed to fetch permissions:', permError);
                // Continue even if permissions fail - user is still logged in
            }

            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (refreshToken) {
                await authService.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            clearAuth();
            clearPermissions();
            navigate('/login');
        }
    };

    return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        login,
        logout,
    };
};
