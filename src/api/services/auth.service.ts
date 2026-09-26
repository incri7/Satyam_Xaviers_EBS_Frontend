import { api } from '../axios';
import type { AuthResponse, RefreshResponse } from '../../types/auth';

export interface NotificationPreferences {
    sms_absence: boolean;
    push_absence: boolean;
    push_fee_reminder: boolean;
    push_leave_decision: boolean;
    push_notices: boolean;
}


export const authService = {
    login: async (credentials: any): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('auth/login', credentials);
        return response.data;
    },

    refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
        const response = await api.post<RefreshResponse>('auth/refresh-token', { refresh_token: refreshToken });
        return response.data;
    },

    logout: async (refreshToken: string): Promise<void> => {
        await api.post('auth/logout', { refresh_token: refreshToken });
    },

    requestPasswordReset: async (email: string): Promise<void> => {
        await api.post('auth/password-reset/request', { email });
    },

    confirmPasswordReset: async (data: { token: string; new_password: string }): Promise<void> => {
        await api.post('auth/password-reset/confirm', data);
    },

    changePassword: async (data: any): Promise<void> => {
        await api.post('auth/password-change', data);
    },
 
    /** The signed-in user's own notification choices (all on until changed). */
    getNotificationPreferences: async (): Promise<NotificationPreferences> => {
        const response = await api.get<NotificationPreferences>('auth/notification-preferences');
        return response.data;
    },
    updateNotificationPreferences: async (patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
        const response = await api.put<NotificationPreferences>('auth/notification-preferences', patch);
        return response.data;
    },

    register: async (data: any): Promise<any> => {
        const response = await api.post('auth/register', data);
        return response.data;
    }
};
