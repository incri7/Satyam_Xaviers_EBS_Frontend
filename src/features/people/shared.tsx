import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '../../design-system';

const STUDENT_TONE: Record<string, BadgeTone> = {
    active: 'ok',
    passed_out: 'brand',
    transferred: 'info',
    discontinued: 'neutral',
};

/** A student's register status as a badge (Figma "Badge", with dot). */
export function StudentStatusBadge({ status }: { status?: string | null }) {
    const { t } = useTranslation();
    if (!status) return <span className="text-muted">—</span>;
    return (
        <Badge tone={STUDENT_TONE[status] ?? 'neutral'} dot>
            {t(`peoplePage.status.${status}`, { defaultValue: status })}
        </Badge>
    );
}

/** Active or inactive, for staff, parents and accounts. */
export function ActiveBadge({ active }: { active: boolean }) {
    const { t } = useTranslation();
    return (
        <Badge tone={active ? 'ok' : 'neutral'} dot>
            {active ? t('peoplePage.status.active') : t('peoplePage.status.inactive')}
        </Badge>
    );
}
