import { api } from '../axios';

export interface AssignmentSummary {
    id: number;
    title: string;
    subject_id: number;
    subject_name: string;
    due_date: string;
    submission_status: 'pending' | 'submitted' | 'graded' | 'missing';
}

export interface MarkTrendEntry {
    exam_name: string;
    subject_name: string;
    obtained: number | null;
    max_marks: number;
    percentage: number | null;
    trend: 'up' | 'down' | 'stable' | 'first';
}

export interface StudentHomeData {
    student_id: number;
    student_name: string;
    admission_no: string;
    class_name: string | null;
    section_name: string | null;
    academic_year: string | null;
    today_status: string;
    attendance_present: number;
    attendance_total: number;
    attendance_pct: number;
    pending_assignments: AssignmentSummary[];
    recent_marks: MarkTrendEntry[];
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
