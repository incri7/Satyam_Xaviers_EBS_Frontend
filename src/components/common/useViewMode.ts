import { useCallback, useState } from 'react';

import type { ViewMode } from './ViewToggle';

/** Remember the choice per list, so it survives a reload. */
export function useViewMode(storageKey: string, fallback: ViewMode = 'table') {
    const [mode, setMode] = useState<ViewMode>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved === 'cards' || saved === 'table' ? saved : fallback;
        } catch {
            return fallback;
        }
    });

    const set = useCallback(
        (next: ViewMode) => {
            setMode(next);
            try {
                localStorage.setItem(storageKey, next);
            } catch {
                /* private mode — the choice just won't persist */
            }
        },
        [storageKey],
    );

    return [mode, set] as const;
}
