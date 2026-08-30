import type { PermissionAction } from '../types/auth';

export interface ComponentPermission {
    resource: string;
    action: PermissionAction;
}

// NOTE: deliberately not annotated `Record<string, ...>`. The `satisfies` form
// keeps the keys as literals so `ComponentId` is a real union — an unregistered
// or misspelled id becomes a compile error instead of a silent runtime denial.
export const PERMISSION_REGISTRY = {
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

    // Finances — fee structures & discounts both sit on the `finances` resource
    'finances_create': [
        { resource: 'finances', action: 'create' }
    ],
    'finances_update': [
        { resource: 'finances', action: 'update' }
    ],
    'finances_delete': [
        { resource: 'finances', action: 'delete' }
    ],
    // FinancesPage builds this id from its `discounts` tab; discounts are
    // governed by the finances resource, not a resource of their own.
    'discounts_create': [
        { resource: 'finances', action: 'create' }
    ],
    'payments_create': [
        { resource: 'payments', action: 'create' }
    ],
    'expenses_create': [
        { resource: 'expenses', action: 'create' }
    ],
    'expenses_update': [
        { resource: 'expenses', action: 'update' }
    ],
    'expenses_delete': [
        { resource: 'expenses', action: 'delete' }
    ],

    // People
    'users_create': [
        { resource: 'users', action: 'create' }
    ],
    'users_delete': [
        { resource: 'users', action: 'delete' }
    ],
    'parents_update': [
        { resource: 'parents', action: 'update' }
    ],
    'teachers_update': [
        { resource: 'teachers', action: 'update' }
    ],
    'staff_create': [
        { resource: 'staff', action: 'create' }
    ],
    'staff_update': [
        { resource: 'staff', action: 'update' }
    ],
    'staff_delete': [
        { resource: 'staff', action: 'delete' }
    ],

    // People
    'students_update': [
        { resource: 'students', action: 'update' }
    ],
    'students_delete': [
        { resource: 'students', action: 'delete' }
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
} satisfies Record<string, ComponentPermission[]>;

export type ComponentId = keyof typeof PERMISSION_REGISTRY;
