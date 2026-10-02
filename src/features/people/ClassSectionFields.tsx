import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { FormRow, SelectField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import type { Section } from '../../types/academic';
import { useClasses } from './useClasses';

/**
 * Class, then section, for a new student. A class with one section fills it
 * in; with several, a section must be picked. A student enrolled with no
 * section was missing from every section's attendance register.
 */
export function ClassSectionFields({
    classId,
    sectionId,
    onChange,
    classError,
    sectionError,
    enabled = true,
}: {
    classId: string;
    sectionId: string;
    /** Both at once: choosing a class sets (or clears) the section too. */
    onChange: (next: { class_id: string; section_id: string; section_name: string }) => void;
    classError?: string;
    sectionError?: string;
    enabled?: boolean;
}) {
    const { t } = useTranslation();
    const classes = useClasses(enabled);
    const sections = useQuery({
        queryKey: ['sections', 'class', classId],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: enabled && !!classId,
    });
    const list: Section[] = sections.data?.sections ?? [];

    const pickClass = async (id: string) => {
        if (!id) return onChange({ class_id: '', section_id: '', section_name: '' });
        onChange({ class_id: id, section_id: '', section_name: '' });
        // The only section is the answer; no need to ask.
        const res = await academicsService.getSections({ class_id: Number(id), limit: 100 }).catch(() => null);
        if (res?.sections.length === 1) onChange({ class_id: id, section_id: String(res.sections[0].id), section_name: res.sections[0].name });
    };

    return (
        <FormRow>
            <SelectField label={t('registerFamily.field.class')} optional={t('peopleForms.optional')} placeholder={t('peopleForms.choose')}
                hint={classId ? undefined : t('peopleRules.classHint')} error={classError} value={classId}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                onChange={(e) => void pickClass(e.target.value)} />
            <SelectField label={t('peopleRules.section')} placeholder={classId ? t('peopleForms.choose') : t('peopleRules.classFirst')}
                disabled={!classId || list.length === 0} error={sectionError} value={sectionId}
                hint={classId && list.length === 1 ? t('peopleRules.onlySection') : undefined}
                options={list.map((s) => ({ value: String(s.id), label: s.name }))}
                onChange={(e) => onChange({ class_id: classId, section_id: e.target.value, section_name: list.find((s) => String(s.id) === e.target.value)?.name ?? '' })} />
        </FormRow>
    );
}
