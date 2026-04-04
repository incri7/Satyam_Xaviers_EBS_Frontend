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

// Permission-related types
export interface Permission {
    id: number;
    role: string;
    resource: string;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    created_at: string;
    updated_at: string;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'view';

export type PermissionsResponse = Permission[];

// Admin Permission Management Types

export const RoleEnum = {
    ADMIN: 'admin',
    PRINCIPAL: 'principal',
    TEACHER: 'teacher',
    STUDENT: 'student',
    STAFF: 'staff',
    PARENT: 'parent',
} as const;

export type RoleEnumType = typeof RoleEnum[keyof typeof RoleEnum];

export interface PermissionCreatePayload {
    role: RoleEnumType | string;
    resource: string;
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface PermissionUpdatePayload {
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface UserCreatePayload {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
    password?: string;
}
