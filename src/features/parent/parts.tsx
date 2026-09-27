import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Phone, Umbrella, X, type LucideIcon } from 'lucide-react';

import { Badge, IconTile, type BadgeTone, type IconTileTone } from '../../design-system';
import type { ChildSummary, WeekDay } from '../../api/services/parent.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { isoLocal } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';
import { childClass, lookOf, type Look } from './helpers';

const SURFACE: Record<Look, string> = {
    present: 'bg-[linear-gradient(140deg,#0F8A5F,#0A6246)] text-white shadow-[0_14px_28px_-14px_rgb(10_98_70/0.6)]',
    half: 'bg-[linear-gradient(140deg,#0F8A5F,#0A6246)] text-white shadow-[0_14px_28px_-14px_rgb(10_98_70/0.6)]',
    absent: 'bg-[linear-gradient(140deg,#D8352A,#9E2019)] text-white shadow-[0_14px_28px_-14px_rgb(158_32_25/0.6)]',
    leave: 'bg-hero text-white shadow-glow-primary',
    unmarked: 'bg-surface text-ink ring-1 ring-inset ring-line',
    closed: 'bg-surface text-ink ring-1 ring-inset ring-line',
};

/**
 * Figma D01 status card: today's answer in one glance, colour first. Green
 * in school, red absent (with call and leave actions), navy on leave, white
 * while the register is still open or on a day the school is closed.
 */
export function StatusPanel({ child, schoolPhone, onLeave, className, showName = true }: {
    child: ChildSummary;
    schoolPhone: string | null;
    onLeave?: () => void;
    className?: string;
    showName?: boolean;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const look = lookOf(child);
    const onColour = look !== 'unmarked' && look !== 'closed';
    const time = child.marked_at ? df.time(child.marked_at) : '';
    const teacher = child.class_teacher_name;
    const Icon = look === 'absent' ? X : look === 'leave' ? Umbrella : Check;
    const title = t(`parentHome.status.${look}`);
    const line = {
        present: t('parentHome.line.present', { time }) + (teacher ? ` ${t('parentHome.line.teacher', { name: teacher })}` : ''),
        half: t('parentHome.line.half', { time }),
        absent: t('parentHome.line.absent', { time }) + (teacher ? ` ${t('parentHome.line.teacher', { name: teacher })}` : '') + ` ${t('parentHome.line.smsSent')}`,
        leave: t('parentHome.line.leave'),
        unmarked: t('parentHome.line.unmarked'),
        closed: t('parentHome.line.closed'),
    }[look];

    return (
        <section aria-label={t('parentHome.statusFor', { name: child.first_name })}
            className={cn('relative flex flex-col gap-1.5 overflow-hidden rounded-[20px] p-[18px] lg:rounded-2xl lg:p-[22px]', SURFACE[look], className)}>
            {showName && <p className={cn('type-small', onColour ? 'text-white/85' : 'text-muted')}>{[child.first_name, childClass(child)].filter(Boolean).join(', ')}</p>}
            <div className="flex items-center gap-2.5">
                {look !== 'unmarked' && look !== 'closed' && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20"><Icon size={18} aria-hidden /></span>
                )}
                <h2 className={cn('type-h1', !onColour && 'text-ink')}>{title}</h2>
            </div>
            <p className={cn('type-small', onColour ? 'text-white/88' : 'text-ink-2')}>{line}</p>
            <WeekStrip days={child.week} onColour={onColour} />
            {look === 'absent' && (schoolPhone || onLeave) && (
                <div className="relative z-10 flex flex-wrap gap-2 pt-2.5">
                    {schoolPhone && (
                        <a href={`tel:${schoolPhone}`}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 type-small-semibold text-bad outline-none hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/60">
                            <Phone size={15} aria-hidden />{t('parentHome.callSchool')}
                        </a>
                    )}
                    {onLeave && (
                        <button type="button" onClick={onLeave}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/14 px-4 type-small-semibold text-white ring-1 ring-inset ring-white/26 outline-none hover:bg-white/22 focus-visible:ring-3 focus-visible:ring-white/60">
                            <Umbrella size={15} aria-hidden />{t('parentHome.markLeave')}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}

/** Sunday to Saturday: a pill per day, today outlined, closed days dashed. */
export function WeekStrip({ days, onColour, className }: { days: WeekDay[]; onColour: boolean; className?: string }) {
    const { t } = useTranslation();
    const today = isoLocal(new Date());
    return (
        <ol aria-label={t('parentHome.thisWeek')} className={cn('grid grid-cols-7 gap-1.5 pt-2 lg:gap-2', className)}>
            {days.map((d) => {
                const isToday = d.date === today;
                const future = d.date > today;
                const label = !d.school_day ? t('parentHome.off') : d.status ? t(`parentHome.mark.${d.status}`, { defaultValue: d.status }) : future ? '' : '·';
                const weekday = t(`parentHome.day.${new Date(`${d.date}T12:00:00`).getDay()}`);
                const absent = d.status === 'A';
                return (
                    <li key={d.date} className="flex min-w-0 flex-col items-center gap-1">
                        <span className={cn('type-micro', onColour ? 'text-white/85' : 'text-muted')}>{weekday}</span>
                        <span aria-label={`${weekday}: ${d.status ? t(`parentHome.markLong.${d.status}`, { defaultValue: d.status }) : !d.school_day ? t('parentHome.closedDay') : t('parentHome.notMarked')}`}
                            className={cn(
                                'grid h-[30px] w-full place-items-center rounded-[10px]',
                                !d.school_day ? cn('border border-dashed type-micro', onColour ? 'border-white/45 text-white/80' : 'border-line text-muted')
                                    : absent ? (onColour ? 'bg-white text-bad type-caption-semibold' : 'bg-bad text-white type-caption-semibold')
                                        : onColour ? 'bg-white/18 text-white type-caption-semibold' : d.status ? 'bg-ok-soft text-ok type-caption-semibold' : 'bg-sunken text-muted type-caption',
                                isToday && (onColour ? 'ring-[1.5px] ring-white/80' : 'ring-2 ring-primary'),
                            )}>
                            {label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/** A figure tile under the child's name: label, value, a badge that reads it. */
export function InfoTile({ icon, tone, label, value, badge, badgeTone, className }: {
    icon: LucideIcon;
    tone: IconTileTone;
    label: string;
    value: ReactNode;
    badge?: string;
    badgeTone?: BadgeTone;
    className?: string;
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1 rounded-row border border-line-subtle bg-surface-2 p-3.5', className)}>
            <div className="flex items-center gap-2">
                <IconTile icon={icon} tone={tone} size={26} />
                <span className="min-w-0 truncate type-small text-muted">{label}</span>
            </div>
            <span className="type-figure-m text-ink">{value}</span>
            {badge && <Badge tone={badgeTone ?? 'neutral'} className="w-fit">{badge}</Badge>}
        </div>
    );
}
