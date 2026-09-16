import { api } from '../axios';

/**
 * Whole-person views.
 *
 * Everything here already existed, but one endpoint per concern — a principal
 * wanting to judge how a teacher is doing had to visit the timetable, the
 * assignment list, the attendance register and the leave queue separately.
 * These two calls return the person's whole record, joined server-side.
 */

export interface NamedRef {
    id: number;
    name: string;
}

// ── Teacher ──────────────────────────────────────────────────────────────────

export interface TeacherProfile {
    teacher: {
        id: number;
        name: string;
        first_name: string | null;
        last_name: string | null;
        staff_code: string | null;
        gender: string | null;
        blood_group: string | null;
        dob: string | null;
        address_line: string | null;
        city: string | null;
        state: string | null;
        email: string | null;
        phone: string | null;
    };
    employment: {
        /** null for anyone not on monthly payroll — a part-timer paid per period. */
        monthly_salary: number | null;
        annual_salary: number | null;
        salary_basis: string;
        join_date: string | null;
        tenure_years: number | null;
        designation: string | null;
        qualification: string | null;
        experience_years: number | null;
    };
    teaching: {
        classes: { class_id: number; class_name: string; subjects: NamedRef[] }[];
        class_teacher_of: {
            section_id: number;
            section_name: string;
            class_name: string;
            student_count: number;
        }[];
        class_count: number;
        subject_count: number;
        weekly_periods: number;
    };
    timetable: {
        day_of_week: number;
        period: number;
        start_time: string | null;
        end_time: string | null;
        class_name: string | null;
        section_name: string | null;
        subject_name: string | null;
    }[];
    assignments: {
        total: number;
        overdue: number;
        awaiting_grading: number;
        recent: {
            id: number;
            title: string;
            due_date: string;
            class_name: string | null;
            subject_name: string | null;
        }[];
    };
    examining: { marks_entered: number; exams_covered: number };
    attendance: {
        tracked: boolean;
        window_days?: number;
        total?: number;
        present?: number;
        absent?: number;
        on_leave?: number;
        late_days?: number;
        attendance_pct?: number | null;
        recent?: { date: string; status: string; minutes_late: number | null }[];
    };
    leave: {
        balances: {
            year: number;
            casual: { total: number; used: number };
            sick: { total: number; used: number };
            earned: { total: number; used: number };
            unpaid: { total: number; used: number };
        } | null;
        pending_count: number;
        requests: LeaveRequest[];
    };
}

export interface LeaveRequest {
    id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    status: string;
    reason: string | null;
}

// ── Student ──────────────────────────────────────────────────────────────────

export interface SubjectResult {
    subject_id: number;
    subject_name: string;
    obtained: number | null;
    max_marks: number;
    percent: number | null;
    grade: string | null;
    grade_point: number | null;
    is_absent: boolean;
    is_pass: boolean | null;
}

export interface ExamResult {
    exam_id: number;
    exam_name: string;
    term: string | null;
    sat_on: string | null;
    subjects: SubjectResult[];
    total_obtained: number;
    total_max: number;
    percent: number;
    gpa: number;
    grade: string | null;
    subjects_passed: number;
    subjects_failed: number;
    result: 'PASS' | 'FAIL' | 'PENDING';
}

export interface StudentProfile {
    student: {
        id: number;
        name: string;
        first_name: string | null;
        last_name: string | null;
        admission_no: string | null;
        status: string | null;
        dob: string | null;
        gender: string | null;
        blood_group: string | null;
        city: string | null;
        state: string | null;
        admission_date: string | null;
    };
    enrollment: {
        class_id: number;
        class_name: string | null;
        section_id: number;
        section_name: string | null;
        academic_year: string | null;
    } | null;
    guardians: {
        parent_id: number;
        name: string;
        relationship: string | null;
        is_primary_contact: boolean;
        phone: string | null;
        email: string | null;
        occupation: string | null;
    }[];
    results: {
        exams: ExamResult[];
        exams_taken: number;
        latest: ExamResult | null;
    };
    fees: {
        total_assigned: number;
        total_paid: number;
        balance: number;
        ledger: {
            fee_structure_id: number;
            name: string;
            frequency: string;
            assigned: number;
            paid: number;
            balance: number;
        }[];
        payments: {
            id: number;
            amount: number;
            method: string | null;
            receipt_no: string | null;
            fee_head: string | null;
            paid_at: string | null;
        }[];
    };
    attendance: {
        year_total: number;
        year_present: number;
        year_pct: number | null;
        last_30_total: number;
        last_30_present: number;
        last_30_pct: number | null;
        absences: number;
        recent: { date: string; status: string }[];
    };
    assignments: {
        total: number;
        by_status: Record<string, number>;
        recent: {
            assignment_id: number;
            title: string;
            subject_name: string | null;
            due_date: string | null;
            status: string;
            grade: string | null;
        }[];
    };
    leave: { pending_count: number; requests: LeaveRequest[] };
}

export const profilesService = {
    getTeacherProfile: async (id: number, days?: number): Promise<TeacherProfile> => {
        const response = await api.get(`people/teachers/${id}/profile`, {
            params: days ? { days } : undefined,
        });
        return response.data;
    },

    getStudentProfile: async (id: number): Promise<StudentProfile> => {
        const response = await api.get(`people/students/${id}/profile`);
        return response.data;
    },
};
