export type NoticeAudienceScope = 'all' | 'role' | 'class_section' | 'student';
export type NoticePriority = 'low' | 'medium' | 'high';

export interface Notice {
    id: number;
    title: string;
    body: string;
    scope: NoticeAudienceScope;
    priority: NoticePriority;
    role?: string;
    class_id?: number;
    section_id?: number;
    student_id?: number;
    posted_by_user_id: number;
    valid_from?: string;
    valid_to?: string;
    created_at: string;
    updated_at: string;
}

export interface NoticeCreate {
    title: string;
    body: string;
    scope: NoticeAudienceScope;
    priority?: NoticePriority;
    role?: string;
    class_id?: number;
    section_id?: number;
    student_id?: number;
    posted_by_user_id?: number;
    valid_from?: string;
    valid_to?: string;
}

export interface NoticeUpdate {
    title?: string;
    body?: string;
    scope?: NoticeAudienceScope;
    priority?: NoticePriority;
    role?: string;
    class_id?: number;
    section_id?: number;
    student_id?: number;
    valid_from?: string;
    valid_to?: string;
}
