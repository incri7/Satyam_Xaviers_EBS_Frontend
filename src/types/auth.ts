export interface User {
    id: number;
    email: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    role: 'principal' | 'teacher' | 'student' | 'admin' | string;
    is_active: boolean;
    must_change_password: boolean;
    profile_image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    user: User;
}

export interface RefreshResponse {
    access_token: string;
    token_type: string;
}

export interface ApiError {
    message: string;
    detail?: string;
}
