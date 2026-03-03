export interface Parent {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    occupation?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
    national_id?: string;
    user_id?: number;
    created_at: string;
    updated_at: string;
}

export interface Student {
    id: number;
    admission_no?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    dob: string;
    gender: string;
    blood_group: string;
    status: string;
    city?: string;
    state?: string;
    pincode?: string;
    admission_date: string;
    created_at: string;
    updated_at: string;
}

export interface StudentListResponse {
    message: string;
    students: Student[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ParentListResponse {
    message: string;
    parents: Parent[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface Teacher {
    id: number;
    user_id?: number;
    staff_code?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    join_date?: string;
    designation?: string;
    dob?: string;
    gender?: string;
    blood_group?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
    qualification?: string;
    experience_years?: number;
    created_at: string;
    updated_at: string;
}

export interface TeacherListResponse {
    message: string;
    teachers: Teacher[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}
