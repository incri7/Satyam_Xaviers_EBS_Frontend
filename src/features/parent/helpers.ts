import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { parentService, type ChildSummary } from '../../api/services/parent.service';
import { schoolService, type GradeBand } from '../../api/services/school.service';
import { isoLocal } from '../../utils/nepaliDate';

const MINUTE = 60 * 1000;

export const childName = (c: Pick<ChildSummary, 'first_name' | 'last_name'>) => [c.first_name, c.last_name].filter(Boolean).join(' ');
export const childClass = (c: Pick<ChildSummary, 'class_name' | 'section_name'>) => [c.class_name, c.section_name].filter(Boolean).join(' ');

/** The parent's children with today's status. The sidebar reads the same key. */
export function useChildren() {
    return useQuery({ queryKey: ['parent', 'my-children'], queryFn: parentService.getMyChildren, staleTime: MINUTE, select: (r) => r.children });
}

/** Children who have left the school: off the home cards, but their fees are still the family's. */
export function useFormerChildren() {
    return useQuery({ queryKey: ['parent', 'my-children'], queryFn: parentService.getMyChildren, staleTime: MINUTE, select: (r) => r.former ?? [] });
}

/** The school office number from the letterhead, for tel: links. */
export function useSchoolPhone() {
    const q = useQuery({ queryKey: ['school', 'profile'], queryFn: schoolService.getProfile, staleTime: 60 * MINUTE, retry: false });
    return q.data?.phone?.trim() || null;
}

export function useGradeBands() {
    return useQuery({ queryKey: ['school', 'grade-bands'], queryFn: schoolService.getGradeBands, staleTime: 60 * MINUTE, retry: false });
}

/** NEB letter grading, used until the school sets its own scale. */
const NEB: { grade: string; min: number; gp: number; pass: boolean }[] = [
    { grade: 'A+', min: 90, gp: 4.0, pass: true },
    { grade: 'A', min: 80, gp: 3.6, pass: true },
    { grade: 'B+', min: 70, gp: 3.2, pass: true },
    { grade: 'B', min: 60, gp: 2.8, pass: true },
    { grade: 'C+', min: 50, gp: 2.4, pass: true },
    { grade: 'C', min: 40, gp: 2.0, pass: true },
    { grade: 'D', min: 35, gp: 1.6, pass: true },
    { grade: 'NG', min: 0, gp: 0, pass: false },
];

/** Letter grade and grade point for a percentage, on the school's scale. */
export function gradeFor(percent: number, bands?: GradeBand[]): { grade: string; gp: number; pass: boolean } {
    if (bands?.length) {
        const band = bands.find((b) => percent >= Number(b.min_percent) && percent <= Number(b.max_percent))
            ?? [...bands].sort((a, b) => Number(b.min_percent) - Number(a.min_percent)).find((b) => percent >= Number(b.min_percent));
        if (band) return { grade: band.grade, gp: Number(band.grade_point), pass: band.is_pass };
    }
    const row = NEB.find((r) => percent >= r.min) ?? NEB[NEB.length - 1];
    return { grade: row.grade, gp: row.gp, pass: row.pass };
}

/** "84" for 84.00, "84.5" for 84.50: marks are Decimal strings, never floats on screen. */
export const markText = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
};

export type Look = 'present' | 'absent' | 'leave' | 'half' | 'unmarked' | 'closed';

export function lookOf(c: ChildSummary): Look {
    const today = c.week.find((d) => d.date === isoLocal(new Date()));
    if (c.today_status === 'P') return 'present';
    if (c.today_status === 'A') return 'absent';
    if (c.today_status === 'L') return 'leave';
    if (c.today_status === 'HD') return 'half';
    return today && !today.school_day ? 'closed' : 'unmarked';
}


/** The child a /parent/child/:studentId/* page is about, from the cached list. */
export function useChildParam(): { id: number; child?: ChildSummary; children: ChildSummary[]; loading: boolean } {
    const { studentId } = useParams<{ studentId: string }>();
    const id = Number(studentId);
    const kids = useChildren();
    const children = kids.data ?? [];
    return { id, child: children.find((c) => c.student_id === id), children, loading: kids.isPending };
}
