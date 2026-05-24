import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export interface WSEvent {
    type: string;
    payload: Record<string, unknown>;
}

type EventHandler = (event: WSEvent) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws';
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
            if (unmountedRef.current) return;
            if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                attemptsRef.current += 1;
                reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [accessToken, isAuthenticated]);

    useEffect(() => {
        unmountedRef.current = false;
        connect();
        return () => {
            unmountedRef.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);
}
