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
    user?: User;
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
    parent_links?: any[]; // Simplified for now
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

export interface Staff {
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
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    email: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    role: string;
    is_active: boolean;
    must_change_password: boolean;
    profile_image_url?: string;
    last_login?: string;
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

export interface TeacherListResponse {
    message: string;
    teachers: Teacher[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface StaffListResponse {
    message: string;
    staff: Staff[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface UserListResponse {
    message: string;
    users: User[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
}

// Payloads
export interface ParentUpdate {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    occupation?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
    national_id?: string;
}

export interface StudentUpdate {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    dob?: string;
    gender?: string;
    blood_group?: string;
    status?: string;
    city?: string;
    state?: string;
    pincode?: string;
    admission_date?: string;
}

export interface TeacherUpdate {
    staff_code?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
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
}

export interface StaffUpdate {
    staff_code?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    join_date?: string;
    designation?: string;
    dob?: string;
    gender?: string;
    blood_group?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface UserUpdate {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
}

// Unified Registration Payloads
export interface ParentUnifiedCreate {
    first_name: string;
    last_name: string;
    middle_name?: string;
    occupation?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
    national_id?: string;
}

export interface UserUnifiedCreate {
    email: string;
    phone?: string;
    password?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
}

export interface StudentCreate {
    first_name: string;
    last_name: string;
    middle_name?: string;
    dob: string;
    gender: string;
    blood_group?: string;
    admission_no?: string;
    admission_date: string;
    class_id?: number;
    relationship_type?: string;
    is_primary_contact?: boolean;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface UnifiedRegistrationCreate {
    user_in: UserUnifiedCreate;
    parent_in: ParentUnifiedCreate;
    students_in: StudentCreate[];
}

export interface UnifiedRegistrationResponse {
    message: string;
    user: User;
    parent: Parent;
    students: Student[];
}

// --- Unified User Registration (Teacher/Staff/Admin/etc.) ---

export interface TeacherUnifiedCreate {
    first_name: string;
    last_name: string;
    middle_name?: string;
    staff_code?: string;
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
}

export interface StaffUnifiedCreate {
    first_name: string;
    last_name: string;
    middle_name?: string;
    staff_code?: string;
    join_date?: string;
    designation?: string;
    dob?: string;
    gender?: string;
    blood_group?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface UserRegistrationCreate {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
    teacher_in?: TeacherUnifiedCreate;
    staff_in?: StaffUnifiedCreate;
}

export interface UserRegistrationResponse {
    message: string;
    user: User;
    teacher?: Teacher;
    staff?: Staff;
}
