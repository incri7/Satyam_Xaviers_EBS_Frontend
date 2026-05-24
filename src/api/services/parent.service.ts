import { api } from '../axios';

export interface ChildSummary {
    student_id: number;
    first_name: string;
    last_name: string | null;
    admission_no: string;
    class_name: string | null;
    section_name: string | null;
    today_status: string | null;
}

export interface AttendanceRecord {
    date: string;
    status: string;
}

export interface AttendanceHistoryResponse {
    student_id: number;
    records: AttendanceRecord[];
    total_days: number;
    present_days: number;
    attendance_percent: number;
}

export interface MarkRecord {
    exam_name: string;
    subject_name: string;
    obtained: number | null;
    max_marks: number | null;
    is_absent: boolean;
}

export interface MarksResponse {
    student_id: number;
    marks: MarkRecord[];
}

export interface FeeRecord {
    fee_name: string;
    frequency: string;
    amount: number;
    paid_amount: number;
    balance: number;
}

export interface FeeBalanceResponse {
    student_id: number;
    fees: FeeRecord[];
    total_due: number;
}

export const parentService = {
    getMyChildren: async (): Promise<{ children: ChildSummary[] }> => {
        const res = await api.get('/parent/my-children');
        return res.data;
    },

    getChildAttendance: async (studentId: number, limit = 90): Promise<AttendanceHistoryResponse> => {
        const res = await api.get(`/parent/child/${studentId}/attendance`, { params: { limit } });
        return res.data;
    },

    getChildMarks: async (studentId: number, academicYear?: string): Promise<MarksResponse> => {
        const res = await api.get(`/parent/child/${studentId}/marks`, {
            params: academicYear ? { academic_year: academicYear } : {},
        });
        return res.data;
    },

    getChildFees: async (studentId: number): Promise<FeeBalanceResponse> => {
        const res = await api.get(`/parent/child/${studentId}/fees`);
        return res.data;
    },
};
