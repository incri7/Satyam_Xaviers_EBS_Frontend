import { api } from '../axios';

export interface Exam {
    id: number;
    name: string;
    academic_year: string;
    term?: string;
    exam_type?: string;
}

export interface ExamListResponse {
    exams: Exam[];
    total_count: number;
}

export interface MarkEntry {
    student_id: number;
    obtained?: number | null;
    is_absent: boolean;
}

export interface MarksBatchCreate {
    schedule_id: number;
    marks: MarkEntry[];
}

export interface MarkRead {
    id: number;
    schedule_id: number;
    student_id: number;
    obtained?: number | null;
    is_absent: boolean;
}

export interface MarksGridResponse {
    schedule_id: number;
    marks: MarkRead[];
}

export interface MarksProgressEntry {
    schedule_id: number;
    class_id: number;
    section_id: number;
    subject_name: string;
    total_enrolled: number;
    marks_entered: number;
    completion_pct: number;
}

export interface MarksProgressResponse {
    exam_id: number;
    exam_name: string;
    entries: MarksProgressEntry[];
    overall_pct: number;
}

export const examsService = {
    listExams: async (params?: { academic_year?: string; exam_type?: string }): Promise<ExamListResponse> => {
        const response = await api.get<ExamListResponse>('exams/', { params });
        return response.data;
    },

    getExam: async (id: number): Promise<Exam> => {
        const response = await api.get<Exam>(`exams/${id}`);
        return response.data;
    },

    createExam: async (data: Omit<Exam, 'id'>): Promise<Exam> => {
        const response = await api.post<Exam>('exams/', data);
        return response.data;
    },

    getMarksForClass: async (
        examId: number,
        classId: number,
        params?: { section_id?: number; subject_id?: number }
    ): Promise<MarksGridResponse> => {
        const response = await api.get<MarksGridResponse>(`exams/${examId}/marks/${classId}`, { params });
        return response.data;
    },

    batchSaveMarks: async (examId: number, batch: MarksBatchCreate): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>(`exams/${examId}/marks/batch`, batch);
        return response.data;
    },

    getMarksProgress: async (examId: number): Promise<MarksProgressResponse> => {
        const response = await api.get<MarksProgressResponse>(`exams/${examId}/marks/progress`);
        return response.data;
    },
};
