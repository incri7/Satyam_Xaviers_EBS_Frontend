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
    applicant_user_id: number | null;
    approved_by_user_id: number | null;
    decided_at: string | null;
    substitute_teacher_id: number | null;
    created_at: string;
    /** School days covered: Saturdays and calendar holidays are not counted. */
    days?: number | null;
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
    applicant_user_id?: number;
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
    applicant_user_id: number | null;
    created_at: string;
    /** School days covered. */
    days: number;
    /** The applicant's allowance of this kind before this request; null for
     *  students and unpaid leave. */
    balance: { total: number; used: number; remaining: number } | null;
}

export interface SubstituteCandidate {
    teacher_id: number;
    name: string;
    designation: string | null;
    shared_subjects: string[];
}

export interface StaffLeaveBalanceRow {
    user_id: number;
    name: string;
    email: string | null;
    role: string;
    /** "M" | "F" | "O", from the Teacher/Staff profile. Null where it was
     *  never recorded — such a person matches no gender filter. */
    gender: string | null;
    year: number;
    casual_total: number;
    casual_used: number;
    sick_total: number;
    sick_used: number;
    earned_total: number;
    earned_used: number;
    maternity_total: number;
    maternity_used: number;
    unpaid_total: number;
    unpaid_used: number;
    /** False when no row exists for the year — approved leave is then deducted
     *  from nothing and the balance reads 0/0 forever. */
    configured: boolean;
}

export interface StaffLeaveBalanceList {
    year: number;
    rows: StaffLeaveBalanceRow[];
    total_count: number;
    unconfigured_count: number;
    /** Only meaningful under a gender filter: people with no gender on record,
     *  who therefore match nothing and would otherwise vanish unannounced. */
    unknown_gender_count: number;
}

export interface LeaveEntitlementWrite {
    casual_total: number;
    sick_total: number;
    earned_total: number;
    maternity_total: number;
    unpaid_total: number;
}

export const leavesService = {
    /** Everyone entitled to leave, configured or not — the unconfigured are
     *  exactly the people who need attention, so they are not filtered out. */
    /** What a year opens with, per the school's policy — so the grant form is
     *  filled in rather than a blank the user has to guess at. */
    getEntitlementDefaults: async () => {
        const res = await api.get<{
            year: number;
            casual_total: number;
            sick_total: number;
            earned_total: number;
            maternity_total: number;
            unpaid_total: number;
        }>('leaves/balances/defaults');
        return res.data;
    },

    listLeaveBalances: async (params: {
        year?: number; search?: string; role?: string; gender?: string;
    } = {}) => {
        const res = await api.get<StaffLeaveBalanceList>('leaves/balances', { params });
        return res.data;
    },

    /** Totals only. The used counts are the record of leave actually approved
     *  and are not writable here. */
    setLeaveEntitlement: async (
        userId: number,
        year: number,
        body: LeaveEntitlementWrite,
    ) => {
        const res = await api.put<StaffLeaveBalanceRow>(
            `leaves/balances/${userId}`, body, { params: { year } },
        );
        return res.data;
    },

    /** Year rollover: open the year for everyone with no entitlement yet.
     *  Existing rows are left alone unless overwrite_existing is set.
     *
     *  Totals left out fall back to the school's stated leave policy, so the
     *  client does not carry its own copy of the numbers. The response echoes
     *  what was actually applied. */
    grantLeaveEntitlement: async (body: {
        year?: number;
        /** Narrow who receives it — a role shares a contract, and a gender
         *  filter is what makes maternity leave meaningful. */
        role?: string;
        gender?: string;
        casual_total?: number;
        sick_total?: number;
        earned_total?: number;
        maternity_total?: number;
        unpaid_total?: number;
        overwrite_existing?: boolean;
    }) => {
        const res = await api.post<{
            year: number;
            created: number;
            updated: number;
            skipped: number;
            /** Under a gender filter: left out for having no gender on record. */
            skipped_unknown_gender: number;
            /** What the server actually used, including any figure the caller
             *  omitted and the school's policy supplied. */
            applied: {
                casual_total: number;
                sick_total: number;
                earned_total: number;
                maternity_total: number;
                unpaid_total: number;
            };
        }>('leaves/balances/grant', body);
        return res.data;
    },

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

    /** Take back a request that is still waiting. Only its applicant can. */
    withdrawLeave: async (leaveId: number): Promise<void> => {
        await api.post(`leaves/${leaveId}/withdraw`);
    },

    getChildLeaves: async (studentId: number): Promise<LeaveListResponse> => {
        const response = await api.get(`leaves/my-child/${studentId}`);
        return response.data;
    },
};
