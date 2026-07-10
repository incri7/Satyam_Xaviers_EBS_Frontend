/** Single source of truth for each role's landing route. */
export const homeForRole = (role?: string | null): string => {
    switch (role) {
        case 'teacher': return '/home/teacher';
        case 'parent': return '/home/parent';
        case 'accountant': return '/home/accountant';
        case 'coordinator': return '/home/coordinator';
        case 'student': return '/home/student';
        case 'principal': return '/home/principal';
        default: return '/dashboard';
    }
};
