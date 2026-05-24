import { api } from '../axios';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'unpaid';
export type LeaveApplicantType = 'student' | 'teacher' | 'staff';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRead {
    id: number;
    applicant_type: LeaveApplicantType;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: LeaveStatus;
    applicant_student_id: number | null;
    applicant_teacher_id: number | null;
    approved_by_user_id: number | null;
    decided_at: string | null;
    substitute_teacher_id: number | null;
    created_at: string;
}

export interface LeaveListResponse {
    leaves: LeaveRead[];
    total_count: number;
}

export interface LeaveCreate {
    applicant_type: LeaveApplicantType;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason?: string;
    applicant_student_id?: number;
    applicant_teacher_id?: number;
}

export interface LeaveStatusUpdate {
    status: LeaveStatus;
    substitute_teacher_id?: number;
}

export interface LeaveBalance {
    year: number;
    casual_total: number;
    casual_used: number;
    casual_remaining: number;
    sick_total: number;
    sick_used: number;
    sick_remaining: number;
    earned_total: number;
    earned_used: number;
    earned_remaining: number;
    maternity_total: number;
    maternity_used: number;
    maternity_remaining: number;
    unpaid_total: number;
    unpaid_used: number;
}

export interface PendingLeaveRead {
    id: number;
    applicant_type: LeaveApplicantType;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string | null;
    applicant_name: string;
    applicant_teacher_id: number | null;
    applicant_student_id: number | null;
    created_at: string;
}

export interface SubstituteCandidate {
    teacher_id: number;
    name: string;
    designation: string | null;
    shared_subjects: string[];
}

export const leavesService = {
    submitLeave: async (data: LeaveCreate): Promise<LeaveRead> => {
        const response = await api.post('leaves/', data);
        return response.data;
    },

    listLeaves: async (params?: {
        leave_status?: LeaveStatus;
        applicant_type?: LeaveApplicantType;
        limit?: number;
        offset?: number;
    }): Promise<LeaveListResponse> => {
        const response = await api.get('leaves/', { params });
        return response.data;
    },

    getMyBalance: async (year?: number): Promise<LeaveBalance> => {
        const response = await api.get('leaves/my-balance', { params: year ? { year } : undefined });
        return response.data;
    },

    getPendingLeaves: async (): Promise<PendingLeaveRead[]> => {
        const response = await api.get('leaves/pending');
        return response.data;
    },

    getSuggestedSubstitutes: async (leaveId: number): Promise<SubstituteCandidate[]> => {
        const response = await api.get(`leaves/${leaveId}/suggest-substitute`);
        return response.data;
    },

    updateLeaveStatus: async (leaveId: number, data: LeaveStatusUpdate): Promise<LeaveRead> => {
        const response = await api.patch(`leaves/${leaveId}/status`, data);
        return response.data;
    },

    getChildLeaves: async (studentId: number): Promise<LeaveListResponse> => {
        const response = await api.get(`leaves/my-child/${studentId}`);
        return response.data;
    },
};
