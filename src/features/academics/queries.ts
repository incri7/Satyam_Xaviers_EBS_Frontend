import { useQuery } from '@tanstack/react-query';

import { academicsService } from '../../api/services/academics.service';
import type { Class, Section } from '../../types/academic';
import { classRank } from '../dashboard/queries';

/**
 * Classes with their sections, counts and class teachers (Figma F08).
 *
 * Built from three list calls rather than one detail call per class: all
 * classes, all sections (which carry enrolled_count, capacity and
 * class_teacher_id), and the teacher list for names.
 */
export type Stage = 'pre' | 'primary' | 'lower' | 'secondary' | 'higher' | 'other';
export const STAGES: Stage[] = ['pre', 'primary', 'lower', 'secondary', 'higher', 'other'];

/** Nepal's school levels: pre-primary, 1–5, 6–8, 9–10, 11–12. */
export function stageOf(className: string): Stage {
    const rank = classRank(className);
    if (rank < 0) return 'pre';
    if (rank >= 1 && rank <= 5) return 'primary';
    if (rank >= 6 && rank <= 8) return 'lower';
    if (rank >= 9 && rank <= 10) return 'secondary';
    if (rank >= 11 && rank <= 12) return 'higher';
    return 'other';
}

export interface ClassOverview {
    klass: Class;
    stage: Stage;
    sections: (Section & { teacherName: string | null })[];
    students: number;
    /** Sum of section capacities; 0 when no section sets one. */
    capacity: number;
    teacherNames: string[];
    /** Sections without a class teacher, e.g. "8 A". */
    missingTeacher: string[];
}

const PAGE = 100;

async function allSections(): Promise<Section[]> {
    const first = await academicsService.getSections({ page: 1, limit: PAGE });
    const pages = first.total_pages ?? 1;
    const rest = await Promise.all(
        Array.from({ length: Math.max(0, pages - 1) }, (_, i) => academicsService.getSections({ page: i + 2, limit: PAGE })),
    );
    return [first, ...rest].flatMap((r) => r.sections ?? []);
}

export function useClassOverview() {
    const classes = useQuery({
        queryKey: ['classes', 'all'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        staleTime: 60 * 1000,
    });
    const sections = useQuery({
        queryKey: ['sections', 'all'],
        queryFn: allSections,
        staleTime: 60 * 1000,
    });
    const teachers = useQuery({
        queryKey: ['teacher-options'],
        queryFn: academicsService.getTeacherOptions,
        staleTime: 5 * 60 * 1000,
    });

    const names = new Map((teachers.data ?? []).map((t) => [t.id, t.name]));
    const rows: ClassOverview[] = (classes.data?.classes ?? [])
        .map((klass) => {
            const own = (sections.data ?? [])
                .filter((s) => s.class_id === klass.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => ({ ...s, teacherName: s.class_teacher_id ? names.get(s.class_teacher_id) ?? null : null }));
            const shortName = klass.name.replace(/^class\s+/i, '');
            return {
                klass,
                stage: stageOf(klass.name),
                sections: own,
                students: own.reduce((n, s) => n + (s.enrolled_count ?? 0), 0),
                capacity: own.reduce((n, s) => n + (s.capacity ?? 0), 0),
                teacherNames: [...new Set(own.map((s) => s.teacherName).filter((n): n is string => !!n))],
                missingTeacher: own.filter((s) => !s.class_teacher_id).map((s) => `${shortName} ${s.name}`),
            };
        })
        .sort((a, b) => classRank(a.klass.name) - classRank(b.klass.name) || a.klass.name.localeCompare(b.klass.name));

    return {
        rows,
        isPending: classes.isPending || sections.isPending,
        isError: classes.isError || sections.isError,
        refetch: () => { void classes.refetch(); void sections.refetch(); void teachers.refetch(); },
    };
}

/** Seat-use tone: green with room, amber from 75%, red when full. */
export function seatTone(filled: number, capacity: number): 'ok' | 'warn' | 'bad' {
    if (!capacity) return 'ok';
    if (filled >= capacity) return 'bad';
    return filled / capacity >= 0.75 ? 'warn' : 'ok';
}
