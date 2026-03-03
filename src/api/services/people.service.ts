import { api } from '../axios';

export const peopleService = {
    registerParentStudent: async (data: any) => {
        try {
            const response = await api.post('people/register/parent-student', {
                user_in: {
                    email: data.userAccount.email,
                    phone: data.userAccount.phone,
                    password: data.userAccount.password,
                    role: 'parent'
                },
                parent_in: {
                    first_name: data.parentProfile.firstName,
                    last_name: data.parentProfile.lastName,
                    middle_name: data.parentProfile.middleName,
                    occupation: data.parentProfile.occupation,
                    national_id: data.parentProfile.nationalId,
                    address_line: data.parentProfile.address,
                    city: data.parentProfile.city,
                    state: data.parentProfile.state,
                    pincode: data.parentProfile.pincode
                },
                students_in: data.students.map((s: any) => ({
                    first_name: s.firstName,
                    last_name: s.lastName,
                    middle_name: s.middleName || '',
                    admission_no: s.admissionNo,
                    relationship_type: s.relationship.toLowerCase(),
                    is_primary_contact: s.isPrimary,
                    dob: s.dob,
                    gender: s.gender,
                    blood_group: s.bloodGroup,
                    city: s.city,
                    state: s.state,
                    pincode: s.pincode,
                    class_id: s.grade,
                    admission_date: s.admissionDate
                }))
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Registration failed';
        }
    },

    getParents: async (search?: string) => {
        try {
            const params = search ? { search } : {};
            const response = await api.get('people/parents', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch parents';
        }
    },

    createStudent: async (data: any) => {
        try {
            const response = await api.post('people/students', {
                first_name: data.firstName,
                last_name: data.lastName,
                middle_name: data.middleName || '',
                dob: data.dob,
                gender: data.gender,
                blood_group: data.bloodGroup,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                admission_date: data.admissionDate,
                admission_no: data.admissionNo,
                parent_id: data.parentId,
                class_id: data.classId,
                status: 'active'
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to create student';
        }
    },

    getStudents: async (params?: { search?: string; page?: number; limit?: number }) => {
        try {
            const response = await api.get('people/students', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch students';
        }
    },

    getTeachers: async (params?: { search?: string; page?: number; limit?: number }) => {
        try {
            const response = await api.get('people/teachers', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch teachers';
        }
    }
};
