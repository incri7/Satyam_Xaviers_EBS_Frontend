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
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sunken p-[3px] font-ui"
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
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] type-label-s outline-none transition-colors',
                            'focus-visible:ring-3 focus-visible:ring-focus/60',
                            active ? 'bg-surface text-ink shadow-e1' : 'text-ink-2 hover:text-ink',
                        )}
                    >
                        <Icon size={15} aria-hidden="true" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ViewToggle;
