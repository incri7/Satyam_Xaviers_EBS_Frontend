import { api } from '../axios';
import type {
    ParentUpdate, StudentUpdate, TeacherUpdate, StaffUpdate, UserUpdate,
    UnifiedRegistrationCreate, UnifiedRegistrationResponse,
    UserRegistrationCreate, UserRegistrationResponse
} from '../../types/people';
 
export const peopleService = {
    // Shared Registration
    registerParentStudent: async (data: UnifiedRegistrationCreate): Promise<UnifiedRegistrationResponse> => {
        try {
            const response = await api.post<UnifiedRegistrationResponse>('people/register/parent-student', data);
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
    },

    // Unified User Registration (atomic user + role profile)
    registerUser: async (data: UserRegistrationCreate): Promise<UserRegistrationResponse> => {
        try {
            const response = await api.post<UserRegistrationResponse>('people/register/user', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || 'User registration failed';
        }
    },
};
