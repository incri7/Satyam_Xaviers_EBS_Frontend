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

export interface DailyAttendanceSummary {
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    half_day: number;
    /** Present + late + half day over total — a late student was in the room. */
    attendance_pct: number | null;
}

export interface AttendanceTotals {
    total: number;
    present: number;
    absent: number;
    late: number;
    half_day: number;
    attendance_pct: number | null;
    days_counted: number;
}

export interface DailyAttendanceSummaryResponse {
    days: DailyAttendanceSummary[];
    total_days: number;
    /** The whole period, totalled server-side — the browser only ever sees a
     *  page of rows and cannot be trusted to add them up. */
    totals: AttendanceTotals;
}

export interface UnmarkedSection {
    section_id: number;
    section_name: string;
    class_id: number;
    class_name: string;
    class_teacher_name: string | null;
}

export interface MyRegister {
    section_id: number;
    section_name: string;
    class_id: number;
    class_name: string | null;
    roll_count: number;
    marked: boolean;
    marked_at: string | null;
    present: number;
    absent: number;
    on_leave: number;
    on_leave_names: string[];
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

    /**
     * One row per day rather than one per student per day.
     *
     * The history view used to fetch every record in the range and count them
     * in the browser; a week of a 30-student class is 210 rows against a
     * 100-row page cap, so older days silently vanished and their totals were
     * wrong. Detail for a single day is fetched only when that day is opened.
     */
    getDailySummary: async (params: {
        class_id?: number;
        section_id?: number;
        /** Narrow to one child; each day then holds a single mark. */
        student_id?: number;
        start_date: string;
        end_date: string;
    }): Promise<DailyAttendanceSummaryResponse> => {
        const response = await api.get<DailyAttendanceSummaryResponse>(
            'attendance/student-attendance/daily-summary', { params },
        );
        return response.data;
    },

    getAttendances: async (filters?: AttendanceFilters): Promise<AttendanceListResponse> => {
        const response = await api.get<AttendanceListResponse>('attendance/student-attendance', {
            params: filters,
        });
        return response.data;
    },

    getTodaySummary: async (): Promise<{
        date: string;
        marked: number;
        present: number;
        absent: number;
        expected: number;
        sections_total: number;
        sections_marked: number;
        on_leave: number;
        /** Sections whose register is not saved yet, with their class teacher. */
        unmarked_sections: UnmarkedSection[];
        by_status: Record<string, number>;
    }> => {
        const response = await api.get('attendance/student-attendance/today-summary');
        return response.data;
    },

    /** The teacher's own register(s) for today: roll, marked or not, who is on leave. */
    getMyRegister: async (): Promise<MyRegister[]> => {
        const response = await api.get<MyRegister[]>('attendance/student-attendance/my-register');
        return response.data;
    },

    getAbsentToday: async (): Promise<{
        date: string;
        count: number;
        any_marked: boolean;
        students: {
            student_id: number;
            student_name: string;
            class_id: number | null;
            class_name: string | null;
            section_id: number | null;
            section_name: string | null;
        }[];
    }> => {
        const response = await api.get('attendance/student-attendance/absent-today');
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
