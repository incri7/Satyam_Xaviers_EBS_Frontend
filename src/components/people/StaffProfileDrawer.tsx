import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, CalendarDays, KeyRound, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';

import { Button, Dialog, Skeleton } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { ActiveBadge } from '../../features/people/shared';

interface Props {
    staffId: number | null;
    onClose: () => void;
}

/**
 * One staff member's record, opened from the Staff register. Staff have no
 * profile page of their own, so this is a dialog (a sheet on phones).
 */
export function StaffProfileDrawer({ staffId, onClose }: Props) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { data, isPending } = useQuery({
        queryKey: ['staff-profile', staffId],
        queryFn: () => peopleService.getStaffProfile(staffId as number),
        enabled: !!staffId,
    });

    const name = data ? [data.first_name, data.last_name].filter(Boolean).join(' ') : '';
    const rows: [LucideIcon, string, string | null | undefined][] = data
        ? [
            [Phone, t('peopleForms.label.phone'), data.phone],
            [Mail, t('peopleForms.label.email'), data.email],
            [Briefcase, t('peopleForms.label.designation'), data.designation],
            [CalendarDays, t('peoplePage.col.joined'), data.join_date ? df.date(data.join_date, 'medium') : null],
            // The profile's email comes from the sign-in account, so it doubles as "has an account".
            [KeyRound, t('peoplePage.col.signIn'), data.email ? t('peoplePage.value.hasSignIn') : t('peoplePage.value.noSignIn')],
            [MapPin, t('peopleForms.label.address'), [data.address_line, data.city, data.state].filter(Boolean).join(', ') || null],
        ]
        : [];

    return (
        <Dialog
            open={staffId !== null}
            onClose={onClose}
            size="sm"
            icon={Briefcase}
            title={name || t('peoplePage.tabs.staff')}
            subtitle={data ? [data.designation, data.staff_code].filter(Boolean).join(', ') : undefined}
            closeLabel={t('common.close')}
            footer={<Button variant="quiet" onClick={onClose}>{t('common.close')}</Button>}
        >
            {isPending || !data ? (
                <div aria-hidden className="flex flex-col gap-3">
                    {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9" />)}
                </div>
            ) : (
                <>
                    <div><ActiveBadge active={data.is_active !== false} /></div>
                    <dl className="flex flex-col">
                        {rows.map(([Icon, label, value]) => (
                            <div key={label} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-muted"><Icon size={16} aria-hidden /></span>
                                <div className="flex min-w-0 flex-col">
                                    <dt className="type-caption text-muted">{label}</dt>
                                    <dd className="break-words type-small-medium text-ink">{value || '—'}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>
                </>
            )}
        </Dialog>
    );
}
