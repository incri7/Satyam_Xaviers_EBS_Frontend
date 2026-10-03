import { useTranslation } from 'react-i18next';

import { SelectField } from '../../design-system';
import { RELATIONSHIPS, type GuardianRelationship } from '../../api/services/people.service';

/**
 * How a guardian is related to a child. Always chosen: a default recorded
 * mothers as fathers. Eleven kinds (step-parents, grandparents, an elder
 * brother) are too many for a segmented control.
 */
export function RelationshipSelect({ label, value, onChange, error }: {
    label: string;
    value: GuardianRelationship | '' | null | undefined;
    onChange: (r: GuardianRelationship) => void;
    error?: string;
}) {
    const { t } = useTranslation();
    return (
        <SelectField
            label={label}
            value={value ?? ''}
            placeholder={t('peopleForms.choose')}
            error={error}
            options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`registerFamily.relationship.${r}`) }))}
            onChange={(e) => e.target.value && onChange(e.target.value as GuardianRelationship)}
        />
    );
}
