import { api } from '../axios';

export interface SchoolProfile {
    id: number;
    name: string;
    name_nepali: string | null;
    motto: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address_line: string | null;
    city: string | null;
    district: string | null;
    province: string | null;
    pan_no: string | null;
    registration_no: string | null;
    estd_year: string | null;
    principal_name: string | null;
}

/** Something not set up yet, from /school/setup-check. */
export interface SetupGap {
    key: string;
    count: number;
    severity: 'block' | 'warn';
    examples: string[];
}

export interface GradeBandIn {
    grade: string;
    min_percent: number;
    max_percent: number;
    grade_point: number;
    description?: string | null;
    is_pass: boolean;
    sort_order: number;
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
    /** Admin and principal: create the profile or change the fields given. */
    updateProfile: async (data: Partial<Omit<SchoolProfile, 'id'>>): Promise<SchoolProfile> => {
        const res = await api.put('school/profile', data);
        return res.data;
    },
    /** The whole scale at once: bands must cover 0 to 100 with no gap. */
    replaceGradeBands: async (bands: GradeBandIn[]): Promise<GradeBand[]> => {
        const res = await api.put('school/grade-bands', { bands });
        return res.data;
    },
    getSetupCheck: async (): Promise<SetupGap[]> => {
        const res = await api.get('school/setup-check');
        return res.data;
    },
};
