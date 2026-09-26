import { useQuery } from '@tanstack/react-query';

import { leavesService } from '../../api/services/leaves.service';
import { useAuthStore } from '../../store/useAuthStore';

/** Roles that decide other people's leave (routes: /leave-approvals). */
const APPROVERS = ['admin', 'principal'];

/**
 * Leave requests waiting for a decision. Shared by the sidebar badge and the
 * dashboard's "Review leave" action, so both show the same number.
 */
export function usePendingLeaveCount() {
    const role = useAuthStore((s) => s.user?.role ?? '');
    const query = useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: leavesService.getPendingLeaves,
        enabled: APPROVERS.includes(role),
        staleTime: 60 * 1000,
    });
    return { ...query, count: query.data?.length ?? 0 };
}
