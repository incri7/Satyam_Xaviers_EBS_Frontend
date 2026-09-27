import { api } from '../axios';

/** An item in the signed-in person's feed: what happened, not a sentence. */
export interface FeedItem {
    /** "n:12" for an event, "notice:5" for a notice. */
    id: string;
    kind: FeedKind;
    params: Record<string, string | number | null | undefined>;
    created_at: string;
    read: boolean;
}

export type FeedKind =
    | 'leave.requested' | 'leave.decided'
    | 'attendance.absent' | 'attendance.unmarked' | 'welfare.flag'
    | 'fee.reminder' | 'fee.paid'
    | 'audit.archive_requested' | 'audit.archive_decided' | 'audit.alert'
    | 'notice';

export interface Feed {
    items: FeedItem[];
    unread_count: number;
}

export const notificationsService = {
    getFeed: async (limit = 50): Promise<Feed> => {
        const response = await api.get<Feed>('notifications', { params: { limit } });
        return response.data;
    },
    markRead: async (ids: string[]): Promise<{ unread_count: number }> => {
        const response = await api.post<{ unread_count: number }>('notifications/read', { ids });
        return response.data;
    },
    markAllRead: async (): Promise<{ unread_count: number }> => {
        const response = await api.post<{ unread_count: number }>('notifications/read-all');
        return response.data;
    },
};
