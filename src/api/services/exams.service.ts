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
    /** The paper's maximum, so inputs enforce the ceiling the save is checked against. */
    max_marks?: number | string;
    subject_name?: string;
}

export interface MarksProgressEntry {
    schedule_id: number;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
    subject_name: string;
    total_enrolled: number;
    marks_entered: number;
    completion_pct: number;
    /** The subject teacher of that class, when one is assigned. */
    teacher_id?: number | null;
    teacher_name?: string | null;
}

export interface MarksProgressResponse {
    exam_id: number;
    exam_name: string;
    entries: MarksProgressEntry[];
    overall_pct: number;
}

/** One paper of an exam: a subject, for one section, on one day. */
export interface Paper {
    id: number;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
    subject_id: number;
    subject_name: string;
    exam_date: string;
    start_time: string | null;
    end_time: string | null;
    max_marks: number;
    marks_entered: number;
    enrolled: number;
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

    updateExam: async (id: number, data: { name?: string; term?: string | null; exam_type?: string | null }): Promise<Exam> => {
        const response = await api.patch<Exam>(`exams/${id}`, data);
        return response.data;
    },

    /** Refused (409) once any marks are entered. */
    deleteExam: async (id: number): Promise<void> => {
        await api.delete(`exams/${id}`);
    },

    /** The routine: every paper, by date, with marks entered against the section's size. */
    listPapers: async (examId: number, classId?: number): Promise<Paper[]> => {
        const response = await api.get<Paper[]>(`exams/${examId}/schedules`, { params: classId ? { class_id: classId } : undefined });
        return response.data;
    },

    /** One class's papers for every section (or those named); existing papers are skipped. */
    createRoutine: async (examId: number, body: {
        class_id: number;
        section_ids?: number[];
        papers: { subject_id: number; exam_date: string; start_time?: string; end_time?: string; max_marks: number }[];
    }): Promise<{ created: number; skipped: number }> => {
        const response = await api.post(`exams/${examId}/routine`, body);
        return response.data;
    },

    updatePaper: async (examId: number, paperId: number, body: { exam_date?: string; start_time?: string | null; end_time?: string | null; max_marks?: number }): Promise<void> => {
        await api.patch(`exams/${examId}/schedules/${paperId}`, body);
    },

    /** Refused (409) once marks are entered for the paper. */
    deletePaper: async (examId: number, paperId: number): Promise<void> => {
        await api.delete(`exams/${examId}/schedules/${paperId}`);
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

    /**
     * One student's whole result for one exam — every subject, with the letter
     * grade and grade point derived from grade_bands at read time, plus the
     * school letterhead to print it under.
     *
     * Grades are never stored on the mark, so correcting a band re-grades
     * history instead of leaving stale letters behind.
     */
    getReportCard: async (examId: number, studentId: number): Promise<ReportCard> => {
        const response = await api.get<ReportCard>(`exams/${examId}/report-card/${studentId}`);
        return response.data;
    },

    /** Every marksheet in a class, in one request — one query for the class
     *  instead of one round trip per child, with the bands and letterhead
     *  loaded once rather than thirty times. */
    getClassReportCards: async (
        examId: number,
        params: { class_id: number; section_id?: number },
    ): Promise<ClassReportCards> => {
        const response = await api.get<ClassReportCards>(`exams/${examId}/report-cards`, { params });
        return response.data;
    },

    getMarksProgress: async (examId: number): Promise<MarksProgressResponse> => {
        const response = await api.get<MarksProgressResponse>(`exams/${examId}/marks/progress`);
        return response.data;
    },
};

export interface ReportCardSubject {
    subject_id: number;
    subject_name: string;
    max_marks: string;
    obtained: string | null;
    percent: string | null;
    grade: string | null;
    grade_point: string | null;
    is_absent: boolean;
    is_pass: boolean | null;
}

export interface ReportCard {
    school: {
        name: string;
        name_nepali: string | null;
        motto: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        logo_url: string | null;
        principal_name: string | null;
    };
    exam: { id: number; name: string; academic_year: string; term: string | null; exam_type: string | null };
    student_id: number;
    student_name: string;
    admission_no: string | null;
    class_name: string | null;
    section_name: string | null;
    subjects: ReportCardSubject[];
    total_max: string;
    total_obtained: string;
    percent: string;
    gpa: string;
    grade: string | null;
    subjects_passed: number;
    subjects_failed: number;
    result: 'PASS' | 'FAIL' | 'PENDING';
}

export interface ClassReportCards {
    exam: ReportCard['exam'];
    school: ReportCard['school'] | null;
    class_name: string | null;
    section_name: string | null;
    cards: ReportCard[];
    total_students: number;
    /** Enrolled but with nothing entered — they would print as blank paper. */
    without_marks: number;
}

export interface MarksComparison {
    student_id: number;
    exams: { id: number; name: string; academic_year: string; term?: string | null }[];
    subjects: {
        subject_id: number;
        subject_name: string;
        pct_by_exam: Record<string, number | null>;
    }[];
}

export const getMarksComparison = async (studentId: number): Promise<MarksComparison> => {
    const res = await api.get<MarksComparison>(`exams/marks/student/${studentId}/comparison`);
    return res.data;
};
