import { api } from '../axios';

export interface Assignment {
    id: number;
    title: string;
    description?: string;
    class_id: number;
    section_id: number;
    subject_id: number;
    due_date: string;
    teacher_id: number;
}

export interface AssignmentCreate {
    title: string;
    description?: string;
    class_id: number;
    section_id: number;
    subject_id: number;
    due_date: string;
    teacher_id: number;
}

export interface AssignmentListResponse {
    assignments: Assignment[];
    total_count: number;
}

export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'missing';

export interface Submission {
    id: number;
    assignment_id: number;
    student_id: number;
    status: SubmissionStatus;
    submitted_at?: string;
    grade?: string;
    remarks?: string;
}

export interface SubmissionUpdate {
    status: SubmissionStatus;
    grade?: string;
    remarks?: string;
}

export interface SubmissionListResponse {
    submissions: Submission[];
    total_count: number;
}

export const assignmentsService = {
    createAssignment: async (data: AssignmentCreate): Promise<Assignment> => {
        const response = await api.post<Assignment>('assignments/', data);
        return response.data;
    },

    listAssignments: async (params?: {
        class_id?: number;
        section_id?: number;
        teacher_id?: number;
        subject_id?: number;
    }): Promise<AssignmentListResponse> => {
        const response = await api.get<AssignmentListResponse>('assignments/', { params });
        return response.data;
    },

    listMyAssignments: async (): Promise<AssignmentListResponse> => {
        const response = await api.get<AssignmentListResponse>('assignments/my-classes');
        return response.data;
    },

    getAssignment: async (id: number): Promise<Assignment> => {
        const response = await api.get<Assignment>(`assignments/${id}`);
        return response.data;
    },

    listSubmissions: async (assignmentId: number): Promise<SubmissionListResponse> => {
        const response = await api.get<SubmissionListResponse>(`assignments/${assignmentId}/submissions`);
        return response.data;
    },

    updateSubmission: async (
        assignmentId: number,
        studentId: number,
        data: SubmissionUpdate
    ): Promise<Submission> => {
        const response = await api.patch<Submission>(
            `assignments/${assignmentId}/submissions/${studentId}`,
            data
        );
        return response.data;
    },
};
