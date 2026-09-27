import { api } from '../axios';

export interface TokenInfo {
    valid: boolean;
    student_name: string;
    student_id: number;
    class_name: string | null;
    section_name: string | null;
    school_phone: string | null;
}

export interface ParentRegisterIn {
    phone: string;
    password: string;
    first_name?: string;
    last_name?: string;
}

export interface ParentRegisterOut {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user_id: number;
    role: string;
}

export interface RegistrationTokenRead {
    token: string;
    student_id: number;
    expires_at: string;
    registration_url: string;
}

export const registrationService = {
    /** Admin/principal/coordinator: mint a one-time parent registration link for a student. */
    generateToken: async (studentId: number): Promise<RegistrationTokenRead> => {
        const res = await api.post('/register/generate', { student_id: studentId });
        return res.data;
    },

    getTokenInfo: async (token: string): Promise<TokenInfo> => {
        const res = await api.get(`/register/${token}`);
        return res.data;
    },

    completeRegistration: async (token: string, data: ParentRegisterIn): Promise<ParentRegisterOut> => {
        const res = await api.post(`/register/${token}`, data);
        return res.data;
    },
};
