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
    /** Resolved server-side — the list used to render raw primary keys. */
    class_name?: string | null;
    section_name?: string | null;
    subject_name?: string | null;
    teacher_name?: string | null;
    /** Marking progress, so the list answers "what still needs grading?". */
    submission_count: number;
    submitted_count: number;
    graded_count: number;
}

export interface AssignmentFilterOption {
    id: number;
    name: string;
}

export interface AssignmentFilterOptions {
    classes: AssignmentFilterOption[];
    sections: AssignmentFilterOption[];
    subjects: AssignmentFilterOption[];
    teachers: AssignmentFilterOption[];
}

export type AssignmentSort = 'due_date' | 'title' | 'class' | 'subject' | 'teacher';

export interface AssignmentListParams {
    class_id?: number;
    section_id?: number;
    teacher_id?: number;
    subject_id?: number;
    due_before?: string;
    due_after?: string;
    status?: 'overdue' | 'upcoming';
    search?: string;
    sort_by?: AssignmentSort;
    sort_dir?: 'asc' | 'desc';
    skip?: number;
    limit?: number;
}

export interface AssignmentCreate {
    title: string;
    description?: string;
    class_id: number;
    section_id: number;
    subject_id: number;
    due_date: string;
    teacher_id?: number; // omitted → backend uses the caller's own teacher record
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
    /** A teacher grades people, not row ids. */
    student_name?: string | null;
    admission_no?: string | null;
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

    listAssignments: async (params?: AssignmentListParams): Promise<AssignmentListResponse> => {
        const response = await api.get<AssignmentListResponse>('assignments/', { params });
        return response.data;
    },

    /** Only the classes, subjects and teachers that appear in the caller's
     *  own assignments — a filter that offers empty results is worse than none. */
    getFilterOptions: async (classId?: number): Promise<AssignmentFilterOptions> => {
        const response = await api.get<AssignmentFilterOptions>('assignments/filter-options', {
            params: classId ? { class_id: classId } : undefined,
        });
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
