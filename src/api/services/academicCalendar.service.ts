import { api } from '../axios';

export interface AcademicYear {
    id: number;
    name: string;
    bs_year: string | null;
    start_date: string;
    end_date: string;
    is_current: boolean;
    working_days_count: number | null;
}

export interface HolidayEntry {
    date: string;
    label: string;
    day_type?: string;
}

export interface TermSetup {
    term_number: number;
    name: string;
    start_date: string;
    end_date: string;
}

export interface CalendarSetupRequest {
    weekend_days?: number[];
    holidays: HolidayEntry[];
    terms: TermSetup[];
}

export interface CalendarSummary {
    academic_year_id: number;
    total_days: number;
    working_days: number;
    holidays: number;
    weekends: number;
    term_breaks: number;
    exam_days: number;
    half_days: number;
    emergency_closures: number;
}

export interface AttendanceClassRow {
    class_id: number;
    class_name: string;
    total_students: number;
    avg_attendance_pct: number | null;
}

export interface AttendanceStudentRow {
    student_id: number;
    student_name: string;
    admission_no: string;
    days_present: number;
    working_days: number;
    attendance_pct: number | null;
}

export interface PromotionDecision {
    student_id: number;
    student_name: string;
    class_name: string;
    academic_year: string;
    attendance_pct: number;
    marks_pct: number;
    recommendation: 'PROMOTE' | 'HOLD_BACK' | 'REVIEW_REQUIRED' | 'GRADUATING';
    details: Record<string, unknown>;
}

export interface PromotionEvalResponse {
    academic_year_id: number;
    promote: PromotionDecision[];
    hold_back: PromotionDecision[];
    review_required: PromotionDecision[];
    graduating: PromotionDecision[];
}

export interface PromotionConfirmEntry {
    student_id: number;
    final_decision: 'PROMOTE' | 'HOLD_BACK' | 'REVIEW_REQUIRED' | 'GRADUATING';
    to_class_id: number;
    to_section_id?: number;
}

export const academicCalendarService = {
    createYear: async (data: {
        name: string;
        bs_year?: string;
        start_date: string;
        end_date: string;
        is_current?: boolean;
    }): Promise<AcademicYear> => {
        const res = await api.post('academic-calendar/years', data);
        return res.data;
    },

    listYears: async (): Promise<AcademicYear[]> => {
        const res = await api.get('academic-calendar/years');
        return res.data;
    },

    getCurrentYear: async (): Promise<AcademicYear> => {
        const res = await api.get('academic-calendar/years/current');
        return res.data;
    },

    setupDays: async (yearId: number, body: CalendarSetupRequest): Promise<CalendarSummary> => {
        const res = await api.post(`academic-calendar/years/${yearId}/setup-days`, body);
        return res.data;
    },

    patchDay: async (date: string, dayType: string, label?: string) => {
        const res = await api.patch(`academic-calendar/days/${date}`, { day_type: dayType, label });
        return res.data;
    },

    getYearSummary: async (yearId: number): Promise<CalendarSummary> => {
        const res = await api.get(`academic-calendar/years/${yearId}/summary`);
        return res.data;
    },

    reportAttendanceSchool: async (academicYearId: number): Promise<AttendanceClassRow[]> => {
        const res = await api.get('academic-calendar/reports/attendance/school', {
            params: { academic_year_id: academicYearId },
        });
        return res.data;
    },

    reportAttendanceClass: async (classId: number, academicYearId: number): Promise<AttendanceStudentRow[]> => {
        const res = await api.get(`academic-calendar/reports/attendance/class/${classId}`, {
            params: { academic_year_id: academicYearId },
        });
        return res.data;
    },

    evaluatePromotion: async (academicYearId: number): Promise<PromotionEvalResponse> => {
        const res = await api.post('academic-calendar/promotion/evaluate', null, {
            params: { academic_year_id: academicYearId },
        });
        return res.data;
    },

    confirmPromotion: async (body: {
        from_academic_year_id: number;
        to_academic_year_name: string;
        decisions: PromotionConfirmEntry[];
    }) => {
        const res = await api.post('academic-calendar/promotion/confirm', body);
        return res.data;
    },
};
