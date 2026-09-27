import { api } from '../axios';

export interface TimetableSlot {
    id: number;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
    day_of_week: number; // 0=Monday .. 6=Sunday
    day_name: string;
    period_number: number;
    subject_id: number;
    subject_name: string;
    teacher_id: number | null;
    teacher_name: string | null;
    start_time: string | null;
    end_time: string | null;
}

export interface TimetableSlotCreate {
    class_id: number;
    section_id: number;
    day_of_week: number;
    period_number: number;
    subject_id: number;
    teacher_id?: number;
    start_time?: string;
    end_time?: string;
}

export interface TimetableSlotUpdate {
    subject_id?: number;
    teacher_id?: number;
    start_time?: string;
    end_time?: string;
}

export const timetableService = {
    /** The signed-in teacher's own periods; day 0 is Monday. */
    getMine: async (dayOfWeek?: number): Promise<TimetableSlot[]> => {
        const response = await api.get<TimetableSlot[]>('timetable/me', { params: dayOfWeek === undefined ? undefined : { day_of_week: dayOfWeek } });
        return response.data;
    },
    getSlots: async (params: { class_id?: number; section_id?: number }): Promise<TimetableSlot[]> => {
        const response = await api.get<TimetableSlot[]>('timetable/', { params });
        return response.data;
    },

    createSlot: async (data: TimetableSlotCreate): Promise<TimetableSlot> => {
        const response = await api.post<TimetableSlot>('timetable/', data);
        return response.data;
    },

    updateSlot: async (id: number, data: TimetableSlotUpdate): Promise<TimetableSlot> => {
        const response = await api.put<TimetableSlot>(`timetable/${id}`, data);
        return response.data;
    },

    deleteSlot: async (id: number): Promise<void> => {
        await api.delete(`timetable/${id}`);
    },
};
