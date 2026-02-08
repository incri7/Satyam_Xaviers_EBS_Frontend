import type { PermissionAction } from '../types/auth';

export interface ComponentPermission {
    resource: string;
    action: PermissionAction;
}

export const PERMISSION_REGISTRY: Record<string, ComponentPermission[]> = {
    // Dashboard Components
    'dashboard_banner': [
        { resource: 'parents', action: 'create' }
    ],
    'dashboard_stats': [
        { resource: 'students', action: 'read' }
    ],
    'enrollment_trends': [
        { resource: 'students', action: 'read' }
    ],
    'registration_modal': [
        { resource: 'parents', action: 'create' }
    ],
    'add_student_modal': [
        { resource: 'students', action: 'create' }
    ],

    // Quick Actions
    'action_register_parent': [
        { resource: 'parents', action: 'create' }
    ],
    'action_add_student': [
        { resource: 'students', action: 'create' }
    ],
    'action_leave_requests': [
        { resource: 'staff', action: 'read' }
    ],
    'action_review_notices': [
        { resource: 'staff', action: 'create' }
    ],
    'action_generate_reports': [
        { resource: 'finances', action: 'read' }
    ],

    // Add more component IDs here as you build the app...
};

export type ComponentId = keyof typeof PERMISSION_REGISTRY;
