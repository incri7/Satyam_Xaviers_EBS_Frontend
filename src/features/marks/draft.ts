export interface MarkDraft {
    obtained: string;
    is_absent: boolean;
}

/** Why a typed mark cannot be saved, or null when it can. */
export function markProblem(d: MarkDraft | undefined, max: number): 'over' | 'negative' | 'nan' | null {
    if (!d || d.is_absent || d.obtained.trim() === '') return null;
    const n = Number(d.obtained);
    if (!Number.isFinite(n)) return 'nan';
    if (n < 0) return 'negative';
    if (n > max) return 'over';
    return null;
}
