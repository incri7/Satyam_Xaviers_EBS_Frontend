import { api } from '../axios';

export interface SchoolProfile {
    id: number;
    name: string;
    name_nepali: string | null;
    phone: string | null;
    email: string | null;
    address_line: string | null;
    city: string | null;
}

export interface GradeBand {
    id: number;
    grade: string;
    min_percent: number | string;
    max_percent: number | string;
    grade_point: number | string;
    description: string | null;
    is_pass: boolean;
    sort_order: number;
}

/** Read-only for every signed-in person: letterhead and grading scale. */
export const schoolService = {
    getProfile: async (): Promise<SchoolProfile> => {
        const res = await api.get('school/profile');
        return res.data;
    },
    getGradeBands: async (): Promise<GradeBand[]> => {
        const res = await api.get('school/grade-bands');
        return res.data;
    },
};
