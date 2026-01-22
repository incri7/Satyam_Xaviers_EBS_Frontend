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
    }
};
