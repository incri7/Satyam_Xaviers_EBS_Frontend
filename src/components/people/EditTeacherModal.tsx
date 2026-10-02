import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, FormSection, SelectField, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Teacher, TeacherUpdate } from '../../types/people';
import { errorText, fullName } from '../../features/people/format';
import { bloodGroupOptions, blanksToNull, genderOptions } from '../../features/people/options';

import { BsDateField } from '../common/BsDateField';
import { joinDateBounds, staffDobBounds } from '../../features/people/rules';
interface EditTeacherModalProps {
    teacher: Teacher;
    isOpen: boolean;
    onClose: () => void;
}

/** Edit a teacher's staff record. Their sign-in account is managed under User accounts. */
export function EditTeacherModal({ teacher, isOpen, onClose }: EditTeacherModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<TeacherUpdate>();
    const dobValue = useWatch({ control, name: 'dob' });
    const joinedValue = useWatch({ control, name: 'join_date' });

    useEffect(() => {
        reset({
            first_name: teacher.first_name,
            middle_name: teacher.middle_name ?? '',
            last_name: teacher.last_name,
            staff_code: teacher.staff_code ?? '',
            join_date: teacher.join_date ?? '',
            designation: teacher.designation ?? '',
            dob: teacher.dob ?? '',
            gender: teacher.gender ?? '',
            blood_group: teacher.blood_group ?? '',
            address_line: teacher.address_line ?? '',
            city: teacher.city ?? '',
            state: teacher.state ?? '',
            pincode: teacher.pincode ?? '',
            qualification: teacher.qualification ?? '',
            experience_years: teacher.experience_years,
        });
    }, [teacher, reset]);

    const mutation = useMutation({
        mutationFn: (data: TeacherUpdate) => peopleService.updateTeacher(teacher.id, blanksToNull(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['teacher', teacher.id] });
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
            icon={BookOpen}
            title={t('peopleForms.title.editTeacher')}
            subtitle={t('peopleForms.subtitle.edit', { name: fullName(teacher) })}
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
                    <TextField label={t('peopleForms.label.lastName')} error={errors.last_name?.message} {...register('last_name', { required: t('peopleForms.error.lastName') })} />
                </FormRow>
                <FormRow>
                    <input type="hidden" {...register('dob')} />
                    <BsDateField label={t('peopleForms.label.dob')} optional={opt} value={dobValue} min={staffDobBounds().min} max={staffDobBounds().max}
                        onChange={(v) => setValue('dob', v, { shouldDirty: true })} />
                    <SelectField label={t('peopleForms.label.gender')} optional={opt} placeholder={t('peopleForms.choose')} options={genderOptions(t)} {...register('gender')} />
                </FormRow>
            </FormSection>

            <FormSection title={t('peopleForms.section.work')}>
                <FormRow>
                    <TextField label={t('peopleForms.label.designation')} optional={opt} {...register('designation')} />
                    <TextField label={t('peopleForms.label.staffCode')} optional={opt} {...register('staff_code')} />
                </FormRow>
                <FormRow>
                    <TextField label={t('peopleForms.label.qualification')} optional={opt} {...register('qualification')} />
                    <TextField
                        type="number"
                        inputMode="numeric"
                        min={0}
                        label={t('peopleForms.label.experience')}
                        optional={opt}
                        error={errors.experience_years?.message}
                        {...register('experience_years', {
                            setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                            validate: (v) => v === undefined || (Number.isFinite(v) && v >= 0) || t('peopleForms.error.experience'),
                        })}
                    />
                </FormRow>
                <FormRow>
                    <input type="hidden" {...register('join_date')} />
                    <BsDateField label={t('peopleForms.label.joinDate')} optional={opt} value={joinedValue} min={joinDateBounds().min} max={joinDateBounds().max}
                        onChange={(v) => setValue('join_date', v, { shouldDirty: true })} />
                    <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...register('blood_group')} />
                </FormRow>
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
