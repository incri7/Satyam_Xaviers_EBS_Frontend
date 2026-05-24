import { api } from '../axios';

export interface NLQResponse {
    answer: string;
    provider: string;
    cached: boolean;
}

export interface ReportCardNarrativeResponse {
    student_id: number;
    narrative: string;
    provider: string;
    cached: boolean;
}

export interface RiskFlag {
    student_id: number;
    student_name: string;
    risk_score: number;
    attendance_flag: boolean;
    fee_default_flag: boolean;
    consecutive_absences: number;
    attendance_pct: number;
    computed_at: string;
}

export const aiService = {
    query: async (question: string): Promise<NLQResponse> => {
        const response = await api.post('ai/query', { question });
        return response.data;
    },

    generateReportCardNarrative: async (
        studentId: number,
        examId: number,
    ): Promise<ReportCardNarrativeResponse> => {
        const response = await api.post('ai/narrative/report-card', {
            student_id: studentId,
            exam_id: examId,
        });
        return response.data;
    },

    getRiskFlags: async (classId?: number): Promise<RiskFlag[]> => {
        const response = await api.get('ai/risk-flags', {
            params: classId ? { class_id: classId } : undefined,
        });
        return response.data;
    },

    dismissRiskFlag: async (studentId: number): Promise<void> => {
        await api.post(`ai/risk-flags/${studentId}/dismiss`);
    },
};
