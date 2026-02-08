import { useQuery } from '@tanstack/react-query';
import { permissionsService } from '../api/services/permissions.service';

export const usePermissionOptions = () => {
    const { data: options = { roles: [], resources: [] }, isLoading, error } = useQuery({
        queryKey: ['permission-options'],
        queryFn: permissionsService.getPermissionOptions,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        options,
        isLoading,
        error: error instanceof Error ? error.message : null
    };
};
