import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '../../design-system';
import { cn } from '../../utils/cn';
import { markProblem, type MarkDraft } from './draft';

/**
 * Figma C04 marks row: roll, the student, the mark out of the paper's
 * maximum, and Absent. Enter moves to the next student's box, so a teacher
 * can type down a column without touching the mouse.
 */
export const EntryRow = memo(function EntryRow({ roll, id, name, sub, draft, max, changed, onChange, onEnter }: {
    roll: number;
    id: number;
    name: string;
    sub?: string;
    draft: MarkDraft;
    max: number;
    changed: boolean;
    onChange: (id: number, next: MarkDraft) => void;
    onEnter: (roll: number) => void;
}) {
    const { t } = useTranslation();
    const problem = markProblem(draft, max);
    const inputId = `mark-${id}`;
    return (
        <li className={cn('flex items-center gap-3 px-4 py-2.5 lg:px-5', draft.is_absent && 'bg-bad-soft/40', problem && 'bg-warn-soft/50')}>
            <span className="w-6 shrink-0 text-right type-caption tabular-nums text-muted">{String(roll).padStart(2, '0')}</span>
            <Avatar name={name} size={36} className="max-sm:hidden" />
            <label htmlFor={inputId} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate type-small-semibold text-ink">{name}</span>
                <span className={cn('truncate type-caption', problem ? 'text-bad' : changed ? 'text-warn' : 'text-muted')}>
                    {problem === 'over' ? t('marksPage.overMax', { max }) : problem ? t('marksPage.badNumber') : changed ? t('attendancePage.unsaved') : sub}
                </span>
            </label>
            <input id={inputId} data-roll={roll} inputMode="decimal" autoComplete="off"
                value={draft.is_absent ? '' : draft.obtained} disabled={draft.is_absent}
                placeholder={draft.is_absent ? t('marksPage.absentShort') : '—'}
                aria-invalid={!!problem}
                aria-describedby={undefined}
                onChange={(e) => onChange(id, { obtained: e.target.value.replace(/[^\d.]/g, ''), is_absent: false })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(roll); } }}
                className={cn(
                    'h-11 w-20 shrink-0 rounded-field border bg-surface px-3 text-right type-body-semibold tabular-nums text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-3 focus:ring-focus/40 disabled:bg-sunken sm:w-24',
                    problem ? 'border-bad' : 'border-line',
                )} />
            <span className="w-10 shrink-0 type-caption tabular-nums text-muted max-sm:hidden">/ {max}</span>
            <button type="button" aria-pressed={draft.is_absent} onClick={() => onChange(id, { obtained: '', is_absent: !draft.is_absent })}
                className={cn(
                    'h-11 shrink-0 rounded-[10px] px-3 type-small-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                    draft.is_absent ? 'bg-bad-soft text-bad ring-[1.5px] ring-inset ring-bad/40' : 'bg-sunken text-muted hover:text-ink-2',
                )}>
                {t('marksPage.absentShort')}
            </button>
        </li>
    );
});
