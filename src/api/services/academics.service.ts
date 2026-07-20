import { api } from '../axios';
import type {
    Class,
    ClassCreate,
    ClassUpdate,
    ClassListResponse,
    Section,
    SectionCreate,
    SectionUpdate,
    SectionListResponse,
    Enrollment,
    EnrollmentCreate,
    EnrollmentUpdate,
    EnrollmentBulkCreate,
    EnrollmentListResponse
} from '../../types/academic';

export const academicsService = {
    // Classes
    getClasses: async (params?: { search?: string; page?: number; limit?: number }): Promise<ClassListResponse> => {
        const response = await api.get<ClassListResponse>('academics/classes', { params });
        return response.data;
    },

    getClass: async (id: number): Promise<Class> => {
        const response = await api.get<Class>(`academics/classes/${id}`);
        return response.data;
    },

    createClass: async (data: ClassCreate): Promise<Class> => {
        const response = await api.post<Class>('academics/classes', data);
        return response.data;
    },

    updateClass: async (id: number, data: ClassUpdate): Promise<Class> => {
        const response = await api.put<Class>(`academics/classes/${id}`, data);
        return response.data;
    },

    deleteClass: async (id: number): Promise<void> => {
        await api.delete(`academics/classes/${id}`);
    },

    // Sections
    getSections: async (params?: { class_id?: number; search?: string; page?: number; limit?: number }): Promise<SectionListResponse> => {
        const response = await api.get<SectionListResponse>('academics/sections', { params });
        return response.data;
    },

    getSection: async (id: number): Promise<Section> => {
        const response = await api.get<Section>(`academics/sections/${id}`);
        return response.data;
    },

    createSection: async (data: SectionCreate): Promise<Section> => {
        const response = await api.post<Section>('academics/sections', data);
        return response.data;
    },

    updateSection: async (id: number, data: SectionUpdate): Promise<Section> => {
        const response = await api.put<Section>(`academics/sections/${id}`, data);
        return response.data;
    },

    deleteSection: async (id: number): Promise<void> => {
        await api.delete(`academics/sections/${id}`);
    },

    // Enrollments
    getEnrollments: async (params?: {
        skip?: number;
        limit?: number;
        student_id?: number;
        class_id?: number;
        section_id?: number;
        academic_year?: string;
        include_inactive?: boolean
    }): Promise<EnrollmentListResponse> => {
        const response = await api.get<EnrollmentListResponse>('academics/enrollments', { params });
        return response.data;
    },

    getEnrollment: async (id: number): Promise<Enrollment> => {
        const response = await api.get<Enrollment>(`academics/enrollments/${id}`);
        return response.data;
    },

    createEnrollment: async (data: EnrollmentCreate): Promise<Enrollment> => {
        const response = await api.post<Enrollment>('academics/enrollments', data);
        return response.data;
    },

    bulkEnroll: async (data: EnrollmentBulkCreate): Promise<Enrollment[]> => {
        const response = await api.post<Enrollment[]>('academics/enrollments/bulk', data);
        return response.data;
    },

    updateEnrollment: async (id: number, data: EnrollmentUpdate): Promise<Enrollment> => {
        const response = await api.put<Enrollment>(`academics/enrollments/${id}`, data);
        return response.data;
    },

    deleteEnrollment: async (id: number): Promise<void> => {
        await api.delete(`academics/enrollments/${id}`);
    },

    // Subjects & teacher-subject mapping
    getSubjects: async (): Promise<Subject[]> => {
        const response = await api.get<Subject[]>('academics/subjects');
        return response.data;
    },

    createSubject: async (name: string): Promise<Subject> => {
        const response = await api.post<Subject>('academics/subjects', { name });
        return response.data;
    },

    getMySubjects: async (): Promise<Subject[]> => {
        const response = await api.get<Subject[]>('academics/subjects/my');
        return response.data;
    },

    getTeacherOptions: async (): Promise<TeacherOption[]> => {
        const response = await api.get<TeacherOption[]>('academics/teachers/options');
        return response.data;
    },

    setTeacherSubjects: async (teacherId: number, subjectIds: number[]): Promise<Subject[]> => {
        const response = await api.put<Subject[]>(`academics/teachers/${teacherId}/subjects`, { subject_ids: subjectIds });
        return response.data;
    },

    // Sections where the logged-in teacher is class teacher
    getMySections: async (): Promise<MySection[]> => {
        const response = await api.get<MySection[]>('academics/my-sections');
        return response.data;
    },

    // Class drilldown
    getClassDetail: async (classId: number): Promise<ClassDetail> => {
        const response = await api.get<ClassDetail>(`academics/classes/${classId}/detail`);
        return response.data;
    },
    getClassSubjects: async (classId: number): Promise<ClassSubjectRow[]> => {
        const response = await api.get<ClassSubjectRow[]>(`academics/classes/${classId}/subjects`);
        return response.data;
    },
    setClassSubjects: async (classId: number, subjectIds: number[]): Promise<ClassSubjectRow[]> => {
        const response = await api.put<ClassSubjectRow[]>(`academics/classes/${classId}/subjects`, { subject_ids: subjectIds });
        return response.data;
    },
    setClassSubjectTeacher: async (classSubjectId: number, teacherId: number | null): Promise<ClassSubjectRow> => {
        const response = await api.put<ClassSubjectRow>(`academics/class-subjects/${classSubjectId}/teacher`, { teacher_id: teacherId });
        return response.data;
    },
};

export interface ClassSubjectRow {
    id: number;
    subject_id: number;
    subject_name: string;
    teacher_id: number | null;
    teacher_name: string | null;
}

export interface ClassDetail {
    id: number;
    name: string;
    subject_count: number;
    sections: {
        id: number;
        name: string;
        capacity: number | null;
        enrolled_count: number;
        class_teacher_id: number | null;
        class_teacher_name: string | null;
    }[];
}

export interface Subject {
    id: number;
    name: string;
}

export interface TeacherOption {
    id: number;
    name: string;
    designation?: string | null;
    subjects: Subject[];
}

export interface MySection {
    section_id: number;
    section_name: string;
    class_id: number;
    class_name: string;
}
