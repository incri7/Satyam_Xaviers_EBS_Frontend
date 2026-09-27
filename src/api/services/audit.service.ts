import { api } from '../axios';

export type AuditScope = 'all' | 'own_classes' | 'own_actions';

export interface AuditEventType {
    key: string;
    category: string;
    label: string;
    sensitivity: 'normal' | 'admin';
    /** Admin only: the APIs that record this event. */
    routes?: { method: string; path: string }[];
}

export interface AuditCatalogue {
    categories: { key: string; label: string }[];
    events: AuditEventType[];
    /** Admin only: APIs that change data but are deliberately not audited. */
    not_audited?: { method: string; path: string; reason: string }[];
}

export interface AuditGrant {
    id?: number;
    role: string | null;
    user_id: number | null;
    user_name?: string | null;
    scope: AuditScope;
}

export interface AuditBucket {
    id: number;
    name: string;
    description: string | null;
    events: string[];
    created_at: string;
    updated_at: string;
    grants?: AuditGrant[];
}

/** A bucket as its viewer sees it: which events, how widely, how far back. */
export interface MyAuditBucket extends AuditBucket {
    scope: AuditScope;
    /** Days back without asking; null for admin. */
    window_days: number | null;
}

export interface AuditChange {
    table: string;
    id: number | string | (number | string)[] | null;
    action: 'create' | 'update' | 'delete';
    /** create/delete: values; update: [before, after]. */
    fields: Record<string, unknown>;
    ref?: Record<string, unknown>;
}

export interface AuditEntry {
    id: number;
    occurred_at: string;
    event: string;
    category: string;
    label: string;
    request_id: string | null;
    actor_user_id: number | null;
    actor_name: string | null;
    actor_role: string | null;
    changes: AuditChange[];
    params: { students?: Record<string, string>; more?: Record<string, number>; [k: string]: unknown };
    student_ids: number[];
    class_ids: number[];
    /** Records in this entry from classes the viewer does not have. */
    hidden_records?: number;
    ip_address?: string | null;
    user_agent?: string | null;
    path?: string | null;
    method?: string | null;
}

export interface AuditPage {
    entries: AuditEntry[];
    total_count: number;
    /** More than total_count match; the count stops there to stay fast. */
    total_capped: boolean;
    scope: AuditScope;
    window_start: string | null;
}

export interface AuditEventQuery {
    bucket_id?: number;
    start_date?: string;
    end_date?: string;
    event?: string;
    category?: string;
    actor_user_id?: number;
    actor_role?: string;
    student_id?: number;
    class_id?: number;
    /** With record_id: one record's whole history. */
    table?: string;
    record_id?: string;
    /** Who did it, or a student's name. */
    search?: string;
    sort?: 'newest' | 'oldest';
    skip?: number;
    limit?: number;
}

export interface ArchiveRequest {
    id: number;
    requester_user_id: number;
    requester_name: string | null;
    bucket_id: number;
    bucket_name: string | null;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    decided_by_name: string | null;
    decided_at: string | null;
    decision_note: string | null;
    expires_at: string | null;
    created_at: string;
}

export const auditService = {
    getCatalogue: async (): Promise<AuditCatalogue> => (await api.get<AuditCatalogue>('audit/catalogue')).data,
    myBuckets: async (): Promise<MyAuditBucket[]> => (await api.get<MyAuditBucket[]>('audit/my-buckets')).data,
    getEvents: async (params: AuditEventQuery): Promise<AuditPage> => (await api.get<AuditPage>('audit/events', { params })).data,

    listBuckets: async (): Promise<AuditBucket[]> => (await api.get<AuditBucket[]>('audit/buckets')).data,
    createBucket: async (body: { name: string; description?: string | null; events: string[] }): Promise<AuditBucket> =>
        (await api.post<AuditBucket>('audit/buckets', body)).data,
    updateBucket: async (id: number, body: { name?: string; description?: string | null; events?: string[] }): Promise<AuditBucket> =>
        (await api.put<AuditBucket>(`audit/buckets/${id}`, body)).data,
    deleteBucket: async (id: number): Promise<void> => { await api.delete(`audit/buckets/${id}`); },
    setGrants: async (id: number, grants: AuditGrant[]): Promise<AuditBucket> =>
        (await api.put<AuditBucket>(`audit/buckets/${id}/grants`, {
            grants: grants.map(({ role, user_id, scope }) => ({ role, user_id, scope })),
        })).data,

    requestOlder: async (body: { bucket_id: number; start_date: string; end_date: string; reason: string }): Promise<ArchiveRequest> =>
        (await api.post<ArchiveRequest>('audit/archive-requests', body)).data,
    listRequests: async (status?: ArchiveRequest['status']): Promise<ArchiveRequest[]> =>
        (await api.get<ArchiveRequest[]>('audit/archive-requests', { params: status ? { status } : undefined })).data,
    decideRequest: async (id: number, body: { status: 'approved' | 'rejected'; note?: string }): Promise<ArchiveRequest> =>
        (await api.patch<ArchiveRequest>(`audit/archive-requests/${id}`, body)).data,
};
