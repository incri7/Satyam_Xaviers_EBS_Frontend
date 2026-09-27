import { api } from '../axios';
import type { WeekDay } from './parent.service';

export interface AssignmentSummary {
    id: number;
    title: string;
    subject_id: number;
    subject_name: string;
    due_date: string;
    submission_status: 'pending' | 'submitted' | 'graded' | 'missing';
    grade: string | null;
}

export interface MarkTrendEntry {
    exam_name: string;
    subject_name: string;
    obtained: number | null;
    max_marks: number;
    percentage: number | null;
    trend: 'up' | 'down' | 'stable' | 'first';
}

export interface TodaySlot {
    period_number: number;
    subject_name: string;
    teacher_name: string | null;
    start_time: string | null;
    end_time: string | null;
}

export interface ExamAverage {
    exam_id: number;
    exam_name: string;
    percent: number | null;
}

export interface StudentHomeData {
    student_id: number;
    student_name: string;
    admission_no: string;
    class_name: string | null;
    section_name: string | null;
    academic_year: string | null;
    today_status: string;
    marked_at: string | null;
    today_timetable: TodaySlot[];
    /** This school year, on school days: present (half days count half) of attendance_total. */
    attendance_present: number;
    attendance_total: number;
    attendance_pct: number;
    attendance_absent: number;
    attendance_leave: number;
    week: WeekDay[];
    /** Missing work first, then due in the next seven days. */
    pending_assignments: AssignmentSummary[];
    latest_exam_name: string | null;
    recent_marks: MarkTrendEntry[];
    /** Average per exam, oldest first. */
    exam_trend: ExamAverage[];
}

export const studentService = {
    getHome: async (): Promise<StudentHomeData> => {
        const response = await api.get('student/home');
        return response.data;
    },

    submitAssignment: async (assignmentId: number): Promise<{
        assignment_id: number;
        student_id: number;
        status: string;
        submitted_at: string | null;
    }> => {
        const response = await api.patch(`student/assignments/${assignmentId}/submit`);
        return response.data;
    },
};
