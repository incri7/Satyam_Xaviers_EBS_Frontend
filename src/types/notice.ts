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
    posted_by_name?: string;
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

/** Null clears a field: a date taken off, or the old target when the audience changes. */
export interface NoticeUpdate {
    title?: string;
    body?: string;
    scope?: NoticeAudienceScope;
    priority?: NoticePriority;
    role?: string | null;
    class_id?: number | null;
    section_id?: number | null;
    student_id?: number | null;
    valid_from?: string | null;
    valid_to?: string | null;
}
