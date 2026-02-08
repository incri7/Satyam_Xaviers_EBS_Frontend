import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionsStore } from '../store/usePermissionsStore';
import { permissionsService } from '../api/services/permissions.service';

export const usePermissionsInit = () => {
    const { isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
    const { setPermissions, _hasHydrated: permsHydrated } = usePermissionsStore();

    useEffect(() => {
        const fetchMyPermissions = async () => {
            if (authHydrated && permsHydrated && isAuthenticated) {
                try {
                    const data = await permissionsService.getMyPermissions();
                    setPermissions(data);
                } catch (error) {
                    console.error('Failed to background fetch permissions:', error);
                }
            }
        };

        fetchMyPermissions();
    }, [authHydrated, permsHydrated, isAuthenticated, setPermissions]);
};
