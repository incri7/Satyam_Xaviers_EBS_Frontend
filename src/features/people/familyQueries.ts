import { useQuery } from '@tanstack/react-query';

import { peopleService, type CoGuardian, type Sibling } from '../../api/services/people.service';

/** A student's brothers and sisters still at the school (sharing a guardian). */
export function useSiblings(studentId: number | null | undefined, { currentOnly = true } = {}) {
    const q = useQuery({
        queryKey: ['students', 'siblings', studentId],
        queryFn: () => peopleService.getSiblings(studentId!),
        enabled: !!studentId,
        staleTime: 30_000,
    });
    const all: Sibling[] = q.data ?? [];
    return currentOnly ? all.filter((s) => s.status === 'active') : all;
}

/** The other guardians of a guardian's children: the father of an elder brother. */
export function useCoGuardians(parentId: number | null | undefined) {
    const q = useQuery({
        queryKey: ['parents', 'co-guardians', parentId],
        queryFn: () => peopleService.getCoGuardians(parentId!),
        enabled: !!parentId,
        staleTime: 30_000,
    });
    return (q.data ?? []) as CoGuardian[];
}

/** The ids ticked in a list where everything starts ticked: all but the skipped. */
export const ticked = (ids: number[], skipped: number[]) => ids.filter((id) => !skipped.includes(id));
