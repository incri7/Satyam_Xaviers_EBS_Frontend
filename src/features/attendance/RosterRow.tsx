import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '../../design-system';
import { cn } from '../../utils/cn';
import type { AttendanceStatus } from '../../api/services/attendance.service';
import { STATUSES, STATUS_KEY, STATUS_ON } from './status';

/**
 * Figma C02 register row: roll number, the student, and the four status
 * buttons. Letters on the buttons keep a 44-student register on one phone
 * screen width; each button still says the full word to a screen reader.
 */
export const RosterRow = memo(function RosterRow({ roll, id, name, sub, status, changed, onMark }: {
    roll: number;
    id: number;
    name: string;
    sub?: string;
    status?: AttendanceStatus;
    /** Differs from what the server holds: unsaved. */
    changed: boolean;
    onMark: (id: number, status: AttendanceStatus) => void;
}) {
    const { t } = useTranslation();
    return (
        <li className={cn('flex items-center gap-3 px-4 py-2.5 lg:px-5', status === 'A' && 'bg-bad-soft/40')}>
            <span className="w-6 shrink-0 text-right type-caption tabular-nums text-muted">{String(roll).padStart(2, '0')}</span>
            <Avatar name={name} size={36} className="max-sm:hidden" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate type-small-semibold text-ink">{name}</span>
                <span className={cn('truncate type-caption', !status ? 'text-warn' : 'text-muted')}>
                    {!status ? t('attendancePage.notMarked') : changed ? t('attendancePage.unsaved') : sub}
                </span>
            </span>
            <span role="radiogroup" aria-label={name} className="flex shrink-0 gap-1">
                {STATUSES.map((s) => {
                    const on = status === s;
                    return (
                        <button key={s} type="button" role="radio" aria-checked={on} aria-label={t(STATUS_KEY[s])} title={t(STATUS_KEY[s])}
                            onClick={() => onMark(id, s)}
                            className={cn(
                                'grid h-10 min-w-10 place-items-center rounded-[10px] px-2 type-small-semibold outline-none transition-colors duration-100 focus-visible:ring-3 focus-visible:ring-focus/60',
                                on ? cn('ring-[1.5px] ring-inset', STATUS_ON[s]) : 'bg-sunken text-muted hover:text-ink-2',
                            )}>
                            {s}
                        </button>
                    );
                })}
            </span>
        </li>
    );
});
