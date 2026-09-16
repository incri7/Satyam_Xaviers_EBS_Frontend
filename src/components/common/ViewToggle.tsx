import React from 'react';
import { Rows3, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../utils/cn';

export type ViewMode = 'table' | 'cards';

/**
 * Switch a list between a table and a card grid.
 *
 * Table is the default everywhere it is used: these registers are read to
 * compare and look things up ("which section is this student in", "how many
 * classes are there"), and a card repeats its own field labels on every
 * record — 401 enrolments means the word CLASS is rendered 401 times. A table
 * prints each label once and lets the eye run down a column. Cards stay
 * available because they are easier to read on a phone.
 *
 * The choice is remembered per list, so someone who prefers cards for
 * enrolments is not opted back out on their next visit.
 */
export const ViewToggle: React.FC<{
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}> = ({ value, onChange }) => {
    const { t } = useTranslation();

    const options: { mode: ViewMode; icon: typeof Rows3; label: string }[] = [
        { mode: 'table', icon: Rows3, label: t('common.tableView') },
        { mode: 'cards', icon: LayoutGrid, label: t('common.cardView') },
    ];

    return (
        <div
            role="group"
            aria-label={t('common.viewAs')}
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0"
        >
            {options.map(({ mode, icon: Icon, label }) => {
                const active = value === mode;
                return (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => onChange(mode)}
                        aria-pressed={active}
                        title={label}
                        className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                            active
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700',
                        )}
                    >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                );
            })}
        </div>
    );
};

/** Remember the choice per list, so it survives a reload. */
export function useViewMode(storageKey: string, fallback: ViewMode = 'table') {
    const [mode, setMode] = React.useState<ViewMode>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved === 'cards' || saved === 'table' ? saved : fallback;
        } catch {
            return fallback;
        }
    });

    const set = React.useCallback(
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

export default ViewToggle;
