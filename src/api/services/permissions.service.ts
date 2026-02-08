import { api } from '../axios';
import type { PermissionsResponse, Permission, PermissionCreatePayload, PermissionUpdatePayload } from '../../types/auth';

export interface PermissionOptions {
    roles: string[];
    resources: string[];
}

export const permissionsService = {
    getMyPermissions: async (): Promise<PermissionsResponse> => {
        try {
            const response = await api.get<PermissionsResponse>('permissions/me');
            // Backend returns array directly, not wrapped in object
            return response.data;
        } catch (error: any) {
            console.error('Failed to fetch permissions:', error.response?.data || error.message);
            throw error.response?.data?.detail || 'Failed to fetch permissions';
        }
    },

    // Admin Endpoints
    getAllPermissions: async (): Promise<Permission[]> => {
        const response = await api.get<Permission[]>('permissions/');
        return response.data;
    },

    getPermissionOptions: async (): Promise<PermissionOptions> => {
        const response = await api.get<PermissionOptions>('permissions/options');
        return response.data;
    },

    createPermission: async (payload: PermissionCreatePayload): Promise<Permission> => {
        const response = await api.post<Permission>('permissions/', payload);
        return response.data;
    },

    updatePermission: async (id: number, payload: PermissionUpdatePayload): Promise<Permission> => {
        const response = await api.patch<Permission>(`permissions/${id}`, payload);
        return response.data;
    },

    deletePermission: async (id: number): Promise<void> => {
        await api.delete(`permissions/${id}`);
    },
};
