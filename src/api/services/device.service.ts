import { api } from '../axios';

export interface DeviceRegistration {
    id: number;
    fcm_token: string;
    device_name: string | null;
}

export const deviceService = {
    /**
     * Register an FCM push token for the current user.
     * Call this once after login and whenever the token refreshes.
     * Requires VITE_FIREBASE_* env vars to be set.
     */
    registerToken: async (fcmToken: string, deviceName?: string): Promise<DeviceRegistration> => {
        const response = await api.post<DeviceRegistration>('auth/devices', {
            fcm_token: fcmToken,
            device_name: deviceName ?? navigator.userAgent.slice(0, 100),
        });
        return response.data;
    },

    unregisterToken: async (fcmToken: string): Promise<void> => {
        await api.delete(`auth/devices/${encodeURIComponent(fcmToken)}`);
    },
};

/**
 * Request notification permission and get the FCM token.
 * Returns null if Firebase is not configured or permission is denied.
 * Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID,
 * VITE_FIREBASE_VAPID_KEY in .env to enable push notifications.
 */
export async function requestFCMToken(): Promise<string | null> {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if (!apiKey || !projectId || !appId || !vapidKey) {
        return null;
    }

    try {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');

        if (!(await isSupported())) return null;
        if (Notification.permission === 'denied') return null;

        const firebaseConfig = {
            apiKey,
            projectId,
            appId,
            messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID ?? '',
        };

        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        return await getToken(messaging, { vapidKey });
    } catch {
        return null;
    }
}
