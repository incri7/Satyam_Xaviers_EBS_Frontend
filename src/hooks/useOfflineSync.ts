import { useEffect, useCallback, useState } from 'react';
import { getQueuedAttendance, clearQueuedAttendance, getQueueCount } from '../lib/offlineQueue';
import { attendanceService } from '../api/services/attendance.service';

export function useOfflineSync() {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshCount = useCallback(async () => {
        try {
            const count = await getQueueCount();
            setPendingCount(count);
        } catch {
            // IndexedDB unavailable
        }
    }, []);

    const sync = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;
        const queued = await getQueuedAttendance();
        if (queued.length === 0) return;

        setIsSyncing(true);
        try {
            const records = queued.map(r => ({
                student_id: r.student_id,
                date: r.date,
                status: r.status as any,
                class_id: r.class_id,
                section_id: r.section_id,
            }));
            await attendanceService.bulkCreateAttendance(records);
            const ids = queued.map(r => r.id!).filter(Boolean);
            await clearQueuedAttendance(ids);
            setPendingCount(0);
        } catch {
            // Will retry on next online event
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    useEffect(() => {
        refreshCount();
        window.addEventListener('online', sync);
        // Attempt sync immediately in case we're already online with queued records
        if (navigator.onLine) sync();
        return () => window.removeEventListener('online', sync);
    }, [sync, refreshCount]);

    return { pendingCount, isSyncing, syncNow: sync };
}
