import { api } from '../axios';
import type { Notice, NoticeCreate, NoticeUpdate, NoticeAudienceScope } from '../../types/notice';

export interface NoticeQueryParams {
    scope?: NoticeAudienceScope;
    role?: string;
    class_id?: number;
    section_id?: number;
    student_id?: number;
    skip?: number;
    limit?: number;
}

export const noticesService = {
    getNotices: async (params?: NoticeQueryParams): Promise<Notice[]> => {
        const response = await api.get<Notice[]>('notices/', { params });
        return response.data;
    },

    getNotice: async (id: number): Promise<Notice> => {
        const response = await api.get<Notice>(`notices/${id}`);
        return response.data;
    },

    createNotice: async (data: NoticeCreate): Promise<Notice> => {
        const response = await api.post<Notice>('notices/', data);
        return response.data;
    },

    updateNotice: async (id: number, data: NoticeUpdate): Promise<Notice> => {
        const response = await api.put<Notice>(`notices/${id}`, data);
        return response.data;
    },

    deleteNotice: async (id: number): Promise<void> => {
        await api.delete(`notices/${id}`);
    }
};
