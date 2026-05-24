import { api } from '../axios';

export type AttendanceStatus = 'P' | 'A' | 'L' | 'HD' | 'H';

export interface AttendanceRecord {
    student_id: number;
    date: string;
    status: AttendanceStatus;
    class_id: number;
    section_id?: number;
}

export interface AttendanceEntry {
    id: number;
    student_id: number;
    date: string;
    status: AttendanceStatus;
    class_id: number;
    section_id?: number;
    created_at: string;
    updated_at: string;
}

export interface AttendanceListResponse {
    message: string;
    attendances: AttendanceEntry[];
    total_count: number;
    page: number;
    limit: number;
}

export interface AttendanceFilters {
    student_id?: number;
    class_id?: number;
    section_id?: number;
    date?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
}

export const attendanceService = {
    createAttendance: async (record: AttendanceRecord): Promise<AttendanceEntry> => {
        const response = await api.post<AttendanceEntry>('attendance/student-attendance', record);
        return response.data;
    },

    bulkCreateAttendance: async (attendances: AttendanceRecord[]): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>('attendance/student-attendance/bulk', {
            attendances,
        });
        return response.data;
    },

    getAttendances: async (filters?: AttendanceFilters): Promise<AttendanceListResponse> => {
        const response = await api.get<AttendanceListResponse>('attendance/student-attendance', {
            params: filters,
        });
        return response.data;
    },

    getAttendance: async (id: number): Promise<AttendanceEntry> => {
        const response = await api.get<AttendanceEntry>(`attendance/student-attendance/${id}`);
        return response.data;
    },

    updateAttendance: async (id: number, data: Partial<AttendanceRecord>): Promise<AttendanceEntry> => {
        const response = await api.put<AttendanceEntry>(`attendance/student-attendance/${id}`, data);
        return response.data;
    },

    deleteAttendance: async (id: number): Promise<void> => {
        await api.delete(`attendance/student-attendance/${id}`);
    },
};
