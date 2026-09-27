import { useQuery } from '@tanstack/react-query';

import { aiService } from '../../api/services/ai.service';
import { attendanceService } from '../../api/services/attendance.service';
import { examsService } from '../../api/services/exams.service';
import { leavesService } from '../../api/services/leaves.service';
import { timetableService } from '../../api/services/timetable.service';
import { currentAcademicYear } from '../../utils/academicYear';

const MINUTE = 60 * 1000;

/** The teacher's register(s) for today. */
export function useMyRegister(enabled = true) {
    return useQuery({ queryKey: ['attendance', 'my-register'], queryFn: attendanceService.getMyRegister, enabled, staleTime: MINUTE });
}

/** The teacher's periods today, in order. JS Sunday is 0; the API's Monday is. */
export function useMyDay(enabled = true) {
    const day = (new Date().getDay() + 6) % 7;
    return useQuery({
        queryKey: ['timetable', 'me', day],
        queryFn: () => timetableService.getMine(day),
        select: (slots) => [...slots].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.period_number - b.period_number),
        enabled,
        staleTime: 5 * MINUTE,
    });
}

/** Rule-based welfare flags (3+ days absent in a row), optionally for one class. */
export function useWelfareFlags(classId?: number, enabled = true) {
    return useQuery({
        queryKey: ['ai', 'risk-flags', classId ?? 'all'],
        queryFn: () => aiService.getRiskFlags(classId),
        select: (flags) => flags.filter((f) => f.consecutive_absences >= 3).sort((a, b) => b.consecutive_absences - a.consecutive_absences),
        enabled,
        staleTime: 5 * MINUTE,
        retry: 1,
    });
}

export function useMyLeaveBalance() {
    return useQuery({ queryKey: ['leaves', 'my-balance'], queryFn: () => leavesService.getMyBalance(), staleTime: 5 * MINUTE });
}

/** The newest exam of this academic year: the one marks are being entered for. */
export function useCurrentExam(enabled = true) {
    return useQuery({
        queryKey: ['exams', 'list', 'current'],
        queryFn: () => examsService.listExams(),
        select: (res) => {
            const year = currentAcademicYear();
            const mine = res.exams.filter((e) => e.academic_year === year);
            const pool = mine.length ? mine : res.exams;
            return { exams: [...pool].sort((a, b) => b.id - a.id), current: pool.reduce<typeof pool[number] | undefined>((best, e) => (!best || e.id > best.id ? e : best), undefined) };
        },
        enabled,
        staleTime: 10 * MINUTE,
    });
}

export function useMarksProgress(examId?: number) {
    return useQuery({
        queryKey: ['exams', examId, 'progress'],
        queryFn: () => examsService.getMarksProgress(examId!),
        enabled: !!examId,
        staleTime: 2 * MINUTE,
    });
}

export function useAbsentToday(enabled = true) {
    return useQuery({ queryKey: ['attendance', 'absent-today'], queryFn: attendanceService.getAbsentToday, enabled, staleTime: MINUTE });
}
