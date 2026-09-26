import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export interface WSEvent {
    type: string;
    payload: Record<string, unknown>;
}

type EventHandler = (event: WSEvent) => void;

// Default: same-origin /ws (nginx proxies it to the backend). Works on any
// domain and gets wss:// automatically under HTTPS. Override for local dev
// against a bare backend with VITE_WS_URL=ws://localhost:8002/ws.
const WS_BASE =
    import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Connects to the backend WebSocket hub with auto-reconnect.
 * Pass a handler map: { 'attendance.updated': (e) => ... }
 */
export function useWebSocket(handlers: Record<string, EventHandler>) {
    const { accessToken, isAuthenticated } = useAuthStore();
    const wsRef = useRef<WebSocket | null>(null);
    const attemptsRef = useRef(0);
    const handlersRef = useRef(handlers);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmountedRef = useRef(false);
    // The latest connect, so a reconnect scheduled by an old socket uses the
    // current token rather than the one it was opened with.
    const connectRef = useRef<() => void>(() => {});

    // Keep handlers up to date without reconnecting
    useEffect(() => {
        handlersRef.current = handlers;
    });

    const connect = useCallback(() => {
        if (!accessToken || !isAuthenticated) return;
        if (unmountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const url = `${WS_BASE}?token=${accessToken}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            attemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const msg: WSEvent = JSON.parse(event.data);
                const handler = handlersRef.current[msg.type];
                if (handler) handler(msg);
            } catch {
                // malformed message — ignore
            }
        };

        ws.onclose = () => {
            // A socket replaced after a token refresh closes late; only the
            // current one may schedule a reconnect.
            if (unmountedRef.current || wsRef.current !== ws) return;
            if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                attemptsRef.current += 1;
                reconnectTimer.current = setTimeout(() => connectRef.current(), RECONNECT_DELAY_MS);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [accessToken, isAuthenticated]);

    useEffect(() => {
        connectRef.current = connect;
        unmountedRef.current = false;
        connect();
        return () => {
            unmountedRef.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            const ws = wsRef.current;
            wsRef.current = null;
            ws?.close();
        };
    }, [connect]);
}
