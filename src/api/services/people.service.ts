import { api } from '../axios';
import type {
    ParentUpdate, StudentUpdate, TeacherUpdate, StaffUpdate, UserUpdate
} from '../../types/people';

export const peopleService = {
    // Shared Registration
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

    // Parents
    getParents: async (params?: { search?: string; page?: number; limit?: number }) => {
        try {
            const response = await api.get('people/parents', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch parents';
        }
    },
    getParent: async (id: number) => {
        const response = await api.get(`people/parents/${id}`);
        return response.data;
    },
    updateParent: async (id: number, data: ParentUpdate) => {
        const response = await api.put(`people/parents/${id}`, data);
        return response.data;
    },

    // Students
    getStudents: async (params?: { search?: string; page?: number; limit?: number; filter_by_status?: string }) => {
        try {
            const response = await api.get('people/students', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch students';
        }
    },
    getStudent: async (id: number) => {
        const response = await api.get(`people/students/${id}`);
        return response.data;
    },
    createStudent: async (data: any) => {
        const response = await api.post('people/students', data);
        return response.data;
    },
    updateStudent: async (id: number, data: StudentUpdate) => {
        const response = await api.put(`people/students/${id}`, data);
        return response.data;
    },
    deleteStudent: async (id: number) => {
        const response = await api.delete(`people/students/${id}`);
        return response.data;
    },

    // Teachers
    getTeachers: async (params?: { search?: string; page?: number; limit?: number; is_active?: boolean }) => {
        try {
            const response = await api.get('people/teachers', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'Failed to fetch teachers';
        }
    },
    getTeacher: async (id: number) => {
        const response = await api.get(`people/teachers/${id}`);
        return response.data;
    },
    updateTeacher: async (id: number, data: TeacherUpdate) => {
        const response = await api.put(`people/teachers/${id}`, data);
        return response.data;
    },

    // Staff
    getStaffList: async (params?: { search?: string; page?: number; limit?: number; is_active?: boolean }) => {
        const response = await api.get('people/staff', { params });
        return response.data;
    },
    getStaff: async (id: number) => {
        const response = await api.get(`people/staff/${id}`);
        return response.data;
    },
    updateStaff: async (id: number, data: StaffUpdate) => {
        const response = await api.put(`people/staff/${id}`, data);
        return response.data;
    },

    // Users
    getUsers: async (params?: { search?: string; page?: number; limit?: number; is_active?: boolean }) => {
        const response = await api.get('people/users', { params });
        return response.data;
    },
    getUser: async (id: number) => {
        const response = await api.get(`people/users/${id}`);
        return response.data;
    },
    updateUser: async (id: number, data: UserUpdate) => {
        const response = await api.put(`people/users/${id}`, data);
        return response.data;
    },
    deleteUser: async (id: number) => {
        const response = await api.delete(`people/users/${id}`);
        return response.data;
    },

    // Profile
    getMe: async () => {
        const response = await api.get('people/me');
        return response.data;
    }
};
