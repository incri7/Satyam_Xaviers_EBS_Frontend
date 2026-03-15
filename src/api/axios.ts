import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';


const ENV_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/';

export const api = axios.create({
    baseURL: ENV_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding tokens
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                if (!refreshToken) throw new Error('No refresh token available');

                const response = await axios.post(`${ENV_API_URL}auth/refresh-token`, {
                    refresh_token: refreshToken,
                });

                const { access_token } = response.data;
                useAuthStore.getState().setAccessToken(access_token);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh token failed, logout user
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
