import { useQuery } from '@tanstack/react-query';

import { parentService, type MarkRecord } from '../../api/services/parent.service';

const MINUTE = 60 * 1000;

/** One Nepali month for the calendar, plus this school year's figure and absences. */
export function useChildMonth(id: number, bsYear: number, bsMonth: number) {
    return useQuery({
        queryKey: ['parent', 'child-attendance', id, bsYear, bsMonth],
        queryFn: () => parentService.getChildAttendanceMonth(id, bsYear, bsMonth),
        enabled: !!id,
        staleTime: MINUTE,
        placeholderData: (prev) => (prev?.student_id === id ? prev : undefined),
    });
}

export function useChildMarks(id: number) {
    return useQuery({ queryKey: ['parent', 'child-marks', id], queryFn: () => parentService.getChildMarks(id), enabled: !!id, staleTime: 5 * MINUTE });
}

export function useChildFees(id: number) {
    return useQuery({ queryKey: ['parent', 'child-fees', id], queryFn: () => parentService.getChildFees(id), enabled: !!id, staleTime: MINUTE });
}

export interface ExamGroup {
    examId: number;
    name: string;
    term: string | null;
    /** Over the papers sat; an absent paper has no mark to average. */
    percent: number | null;
    papers: MarkRecord[];
}

/** Marks grouped by exam, oldest first. */
export function groupByExam(marks: MarkRecord[]): ExamGroup[] {
    const map = new Map<number, ExamGroup & { got: number; out: number }>();
    for (const m of marks) {
        const key = m.exam_id ?? -1;
        const g = map.get(key) ?? { examId: key, name: m.exam_name, term: m.exam_term, percent: null, papers: [], got: 0, out: 0 };
        g.papers.push(m);
        if (!m.is_absent && m.obtained !== null && m.max_marks !== null) {
            g.got += Number(m.obtained);
            g.out += Number(m.max_marks);
        }
        map.set(key, g);
    }
    return [...map.values()]
        .sort((a, b) => a.examId - b.examId)
        .map(({ got, out, ...g }) => ({ ...g, percent: out ? Math.round((got / out) * 1000) / 10 : null }));
}

export const paperPercent = (m: MarkRecord) =>
    m.is_absent || m.obtained === null || !Number(m.max_marks) ? null : Math.round((Number(m.obtained) / Number(m.max_marks)) * 1000) / 10;
