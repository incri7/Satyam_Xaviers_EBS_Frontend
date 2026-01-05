import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../api/services/auth.service';

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

    const login = async (credentials: any) => {
        try {
            const data = await authService.login(credentials);
            setAuth(data.user, data.access_token, data.refresh_token || '');
            navigate('/dashboard');
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
