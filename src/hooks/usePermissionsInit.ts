import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionsStore } from '../store/usePermissionsStore';
import { permissionsService } from '../api/services/permissions.service';

export const usePermissionsInit = () => {
    const { isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
    const { permissions, setPermissions, _hasHydrated: permsHydrated } = usePermissionsStore();

    useEffect(() => {
        const fetchMyPermissions = async () => {
            // Skip if already loaded — login() fetches permissions immediately after auth,
            // so this hook only needs to run on page refresh when store is empty.
            if (authHydrated && permsHydrated && isAuthenticated && permissions.length === 0) {
                try {
                    const data = await permissionsService.getMyPermissions();
                    setPermissions(data);
                } catch (error) {
                    console.error('Failed to background fetch permissions:', error);
                }
            }
        };

        fetchMyPermissions();
    }, [authHydrated, permsHydrated, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
};
