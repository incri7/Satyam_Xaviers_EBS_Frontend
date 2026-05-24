import { api } from '../axios';

export interface TokenInfo {
    valid: boolean;
    student_name: string;
    student_id: number;
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

export const registrationService = {
    getTokenInfo: async (token: string): Promise<TokenInfo> => {
        const res = await api.get(`/register/${token}`);
        return res.data;
    },

    completeRegistration: async (token: string, data: ParentRegisterIn): Promise<ParentRegisterOut> => {
        const res = await api.post(`/register/${token}`, data);
        return res.data;
    },
};
