import { api } from '../axios';

/** One day of this week. `status` is P | A | L | HD, or null when not marked. */
export interface WeekDay {
    date: string;
    status: string | null;
    school_day: boolean;
}

export interface ExamResult {
    exam_id: number;
    exam_name: string;
    percent: number | null;
    previous_exam_name: string | null;
    previous_percent: number | null;
}

export interface ChildSummary {
    student_id: number;
    first_name: string;
    last_name: string | null;
    admission_no: string;
    class_name: string | null;
    section_name: string | null;
    today_status: string | null;
    /** When today's register was saved. */
    marked_at: string | null;
    class_teacher_name: string | null;
    /** Sunday to Saturday of this week. */
    week: WeekDay[];
    /** This Nepali month so far: present (half days count half) of the school days. */
    month_present: number;
    month_school_days: number;
    fee_due: number | string;
    last_paid_at: string | null;
    latest_exam: ExamResult | null;
}

export interface AttendanceRecord {
    date: string;
    status: string;
}

export interface AttendanceMonth {
    bs_year: number;
    bs_month: number;
    start: string;
    end: string;
    /** Calendar holidays and Saturdays in the month. */
    closed_days: string[];
    school_days_so_far: number;
    present: number;
    absent: number;
    leave: number;
}

export interface AbsenceEntry {
    date: string;
    leave_status: 'pending' | 'approved' | 'rejected' | string | null;
    reason: string | null;
}

export interface AttendanceHistoryResponse {
    student_id: number;
    records: AttendanceRecord[];
    total_days: number;
    present_days: number;
    attendance_percent: number;
    month: AttendanceMonth | null;
    /** This school year from 1 Baisakh, on school days only. */
    year_present: number;
    year_school_days: number;
    year_percent: number | null;
    absences: AbsenceEntry[];
}

export interface MarkRecord {
    exam_id: number | null;
    exam_name: string;
    exam_term: string | null;
    academic_year: string | null;
    exam_date: string | null;
    subject_name: string;
    obtained: number | string | null;
    max_marks: number | string | null;
    is_absent: boolean;
}

export interface MarksResponse {
    student_id: number;
    marks: MarkRecord[];
}

export interface FeeRecord {
    fee_name: string;
    frequency: string;
    /** Charged so far this school year, after any scholarship. */
    amount: number | string;
    paid_amount: number | string;
    balance: number | string;
    /** One period's charge, and how many periods have fallen due (6 x Rs 3,300). */
    unit_amount: number | string | null;
    periods: number;
    scholarship: number | string;
}

export interface PaymentHistoryEntry {
    id: number;
    fee_name: string | null;
    amount: number | string;
    method: string;
    receipt_no: string;
    paid_at: string;
}

export interface FeeBalanceResponse {
    student_id: number;
    fees: FeeRecord[];
    total_due: number | string;
    payment_history: PaymentHistoryEntry[];
    /** Paid this school year; the part made against no charged fee; paid ahead. */
    total_paid: number | string;
    other_paid: number | string;
    credit: number | string;
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

    /** One Nepali month for the calendar, with this year's figure and absences. */
    getChildAttendanceMonth: async (studentId: number, bsYear: number, bsMonth: number): Promise<AttendanceHistoryResponse> => {
        const res = await api.get(`/parent/child/${studentId}/attendance`, { params: { bs_year: bsYear, bs_month: bsMonth } });
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

    /** Save the receipt PDF for one of the child's payments. */
    downloadReceipt: async (studentId: number, paymentId: number, receiptNo?: string | null): Promise<void> => {
        const res = await api.get(`/parent/child/${studentId}/payments/${paymentId}/receipt`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receiptNo || paymentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    },
};
