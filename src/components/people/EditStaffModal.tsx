import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, Phone } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, FormSection, SelectField, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Staff, StaffUpdate } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { errorText, fullName } from '../../features/people/format';
import { bloodGroupOptions, blanksToNull, genderOptions } from '../../features/people/options';

interface EditStaffModalProps {
    staff: Staff;
    isOpen: boolean;
    onClose: () => void;
}

/** Edit an office or support staff record. */
export function EditStaffModal({ staff, isOpen, onClose }: EditStaffModalProps) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<StaffUpdate>();
    const dobValue = useWatch({ control, name: 'dob' });
    const joinedValue = useWatch({ control, name: 'join_date' });

    useEffect(() => {
        reset({
            first_name: staff.first_name,
            middle_name: staff.middle_name ?? '',
            last_name: staff.last_name ?? '',
            staff_code: staff.staff_code ?? '',
            designation: staff.designation ?? '',
            join_date: staff.join_date ?? '',
            dob: staff.dob ?? '',
            gender: staff.gender ?? '',
            blood_group: staff.blood_group ?? '',
            address_line: staff.address_line ?? '',
            city: staff.city ?? '',
            state: staff.state ?? '',
            pincode: staff.pincode ?? '',
            phone: staff.phone ?? '',
        });
    }, [staff, reset]);

    const mutation = useMutation({
        mutationFn: (data: StaffUpdate) => peopleService.updateStaff(staff.id, blanksToNull(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const bs = (v?: string) => (v ? df.date(v, 'medium') : undefined);
    const opt = t('peopleForms.optional');
    const saving = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            dismissible={!saving}
            icon={Briefcase}
            title={t('peopleForms.title.editStaff')}
            subtitle={t('peopleForms.subtitle.edit', { name: fullName(staff) })}
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
                    <TextField label={t('peopleForms.label.firstName')} error={errors.first_name?.message} {...register('first_name', { required: t('peopleForms.error.firstName') })} />
                    <TextField label={t('peopleForms.label.lastName')} optional={opt} {...register('last_name')} />
                </FormRow>
                <FormRow>
                    <TextField type="date" label={t('peopleForms.label.dob')} optional={opt} hint={bs(dobValue)} {...register('dob')} />
                    <SelectField label={t('peopleForms.label.gender')} optional={opt} placeholder={t('peopleForms.choose')} options={genderOptions(t)} {...register('gender')} />
                </FormRow>
            </FormSection>

            <FormSection title={t('peopleForms.section.work')}>
                <FormRow>
                    <TextField label={t('peopleForms.label.designation')} optional={opt} {...register('designation')} />
                    <TextField label={t('peopleForms.label.staffCode')} optional={opt} {...register('staff_code')} />
                </FormRow>
                <FormRow>
                    <TextField type="date" label={t('peopleForms.label.joinDate')} optional={opt} hint={bs(joinedValue)} {...register('join_date')} />
                    <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...register('blood_group')} />
                </FormRow>
            </FormSection>

            <FormSection title={t('peopleForms.section.contact')}>
                <TextField type="tel" inputMode="tel" leftIcon={Phone} label={t('peopleForms.label.phone')} optional={opt} {...register('phone')} />
                <TextField label={t('peopleForms.label.address')} optional={opt} {...register('address_line')} />
                <FormRow>
                    <TextField label={t('peopleForms.label.city')} optional={opt} {...register('city')} />
                    <TextField label={t('peopleForms.label.state')} optional={opt} {...register('state')} />
                </FormRow>
            </FormSection>
        </Dialog>
    );
}
