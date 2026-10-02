import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Phone, UserPlus } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { StaffCreate } from '../../types/people';
import { errorText } from '../../features/people/format';
import { withoutBlanks } from '../../features/people/options';

import { BsDateField } from '../common/BsDateField';
import { joinDateBounds } from '../../features/people/rules';
interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Figma H08 "Add staff member", for office and support staff. Teachers and
 * anyone who signs in are added with an account (WorkforceRegistrationModal).
 */
export function AddStaffModal({ isOpen, onClose }: AddStaffModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<StaffCreate>();
    const joinedValue = useWatch({ control, name: 'join_date' });

    const close = () => { reset(); setError(null); onClose(); };

    const mutation = useMutation({
        mutationFn: (data: StaffCreate) => peopleService.createStaff(withoutBlanks(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            queryClient.invalidateQueries({ queryKey: ['people-count', 'staff'] });
            close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const opt = t('peopleForms.optional');
    const saving = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!saving}
            icon={UserPlus}
            title={t('peopleForms.title.addStaff')}
            subtitle={t('peopleForms.subtitle.addStaff')}
            closeLabel={t('common.close')}
            size="md"
            onSubmit={handleSubmit((data) => { setError(null); mutation.mutate(data); })}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={saving}>{t('peopleForms.action.cancel')}</Button>
                    <Button type="submit" leftIcon={UserPlus} loading={saving}>{saving ? t('peopleForms.action.adding') : t('peopleForms.action.add')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('peopleForms.error.addTitle')}>{error}</Banner>}
            <FormRow>
                <TextField label={t('peopleForms.label.firstName')} error={errors.first_name?.message} {...register('first_name', { required: t('peopleForms.error.firstName') })} />
                <TextField label={t('peopleForms.label.lastName')} optional={opt} {...register('last_name')} />
            </FormRow>
            <FormRow>
                <TextField label={t('peopleForms.label.designation')} optional={opt} {...register('designation')} />
                <TextField type="tel" inputMode="tel" leftIcon={Phone} label={t('peopleForms.label.phone')} optional={opt} {...register('phone')} />
            </FormRow>
            <FormRow>
                <input type="hidden" {...register('join_date')} />
                    <BsDateField label={t('peopleForms.label.joinDate')} optional={opt} value={joinedValue} min={joinDateBounds().min} max={joinDateBounds().max}
                        onChange={(v) => setValue('join_date', v, { shouldDirty: true })} />
                <TextField label={t('peopleForms.label.staffCode')} optional={opt} {...register('staff_code')} />
            </FormRow>
            <TextField label={t('peopleForms.label.address')} optional={opt} {...register('address_line')} />
            <FormRow>
                <TextField label={t('peopleForms.label.city')} optional={opt} {...register('city')} />
                <TextField label={t('peopleForms.label.state')} optional={opt} {...register('state')} />
            </FormRow>
        </Dialog>
    );
}
