import { useQuery } from '@tanstack/react-query';

import { academicsService } from '../../api/services/academics.service';

/** The classes, for a class picker. Shared cache with the rest of the app. */
export function useClasses(enabled = true) {
    const q = useQuery({ queryKey: ['classes'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled });
    return q.data?.classes ?? [];
}
