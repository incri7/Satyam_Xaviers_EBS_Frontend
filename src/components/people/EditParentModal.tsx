import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, FormSection, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent, ParentUpdate } from '../../types/people';
import { errorText, fullName } from '../../features/people/format';
import { blanksToNull } from '../../features/people/options';
import { NAME_MAX, NEPALI_NAME_MAX, optionalName, requiredName, validNepaliName } from '../../features/people/rules';

interface EditParentModalProps {
    parent: Parent;
    isOpen: boolean;
    onClose: () => void;
}

/** Edit a parent or guardian record. */
export function EditParentModal({ parent, isOpen, onClose }: EditParentModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ParentUpdate>();

    useEffect(() => {
        reset({
            first_name: parent.first_name,
            middle_name: parent.middle_name ?? '',
            name_nepali: parent.name_nepali ?? '',
            last_name: parent.last_name,
            occupation: parent.occupation ?? '',
            national_id: parent.national_id ?? '',
            address_line: parent.address_line ?? '',
            city: parent.city ?? '',
            state: parent.state ?? '',
            pincode: parent.pincode ?? '',
        });
    }, [parent, reset]);

    const mutation = useMutation({
        mutationFn: (data: ParentUpdate) => peopleService.updateParent(parent.id, blanksToNull(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parents'] });
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const opt = t('peopleForms.optional');
    const saving = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            dismissible={!saving}
            icon={Home}
            title={t('peopleForms.title.editParent')}
            subtitle={t('peopleForms.subtitle.edit', { name: fullName(parent) })}
            closeLabel={t('common.close')}
            onSubmit={handleSubmit((data) => { setError(null); mutation.mutate(data); })}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={saving}>{t('peopleForms.action.cancel')}</Button>
                    <Button type="submit" loading={saving}>{saving ? t('peopleForms.action.saving') : t('peopleForms.action.save')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('peopleForms.error.saveTitle')}>{error}</Banner>}

            <FormSection title={t('peopleForms.section.personal')}>
                <FormRow>
                    <TextField label={t('peopleForms.label.firstName')} maxLength={NAME_MAX} error={errors.first_name?.message} {...register('first_name', { validate: requiredName(t, 'first') })} />
                    <TextField label={t('peopleForms.label.middleName')} optional={opt} maxLength={NAME_MAX} error={errors.middle_name?.message} {...register('middle_name', { validate: optionalName(t) })} />
                </FormRow>
                <FormRow>
                    <TextField label={t('peopleForms.label.lastName')} maxLength={NAME_MAX} error={errors.last_name?.message} {...register('last_name', { validate: requiredName(t, 'last') })} />
                    <TextField label={t('peopleForms.label.occupation')} optional={opt} {...register('occupation')} />
                </FormRow>
                <TextField label={t('peopleRules.nameNepali')} optional={opt} lang="ne" autoComplete="off" maxLength={NEPALI_NAME_MAX}
                    hint={t('peopleRules.nameNepaliHint')} error={errors.name_nepali?.message} {...register('name_nepali', { validate: validNepaliName(t) })} />
                <TextField label={t('peopleForms.label.nationalId')} optional={opt} {...register('national_id')} />
            </FormSection>

            <FormSection title={t('peopleForms.section.contact')}>
                <TextField label={t('peopleForms.label.address')} optional={opt} {...register('address_line')} />
                <FormRow>
                    <TextField label={t('peopleForms.label.city')} optional={opt} {...register('city')} />
                    <TextField label={t('peopleForms.label.state')} optional={opt} {...register('state')} />
                </FormRow>
            </FormSection>
        </Dialog>
    );
}
