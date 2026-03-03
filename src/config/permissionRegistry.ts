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
    'finance_summary': [
        { resource: 'finances', action: 'read' }
    ],

    // Academics
    'classes_create': [
        { resource: 'classes', action: 'create' }
    ],
    'classes_update': [
        { resource: 'classes', action: 'update' }
    ],
    'classes_delete': [
        { resource: 'classes', action: 'delete' }
    ],
    'sections_create': [
        { resource: 'sections', action: 'create' }
    ],
    'sections_update': [
        { resource: 'sections', action: 'update' }
    ],
    'sections_delete': [
        { resource: 'sections', action: 'delete' }
    ],
    'enrollments_create': [
        { resource: 'enrollments', action: 'create' }
    ],
    'enrollments_update': [
        { resource: 'enrollments', action: 'update' }
    ],
    'enrollments_delete': [
        { resource: 'enrollments', action: 'delete' }
    ],

    // Add more component IDs here as you build the app...
};

export type ComponentId = keyof typeof PERMISSION_REGISTRY;
