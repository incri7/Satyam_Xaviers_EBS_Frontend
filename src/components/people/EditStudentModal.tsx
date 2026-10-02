import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, FormSection, SelectField, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Student, StudentUpdate } from '../../types/people';
import { errorText, fullName } from '../../features/people/format';
import { BsDateField } from '../common/BsDateField';
import { formatISODate } from '../../utils/nepaliDate';
import { NAME_MAX, dobBounds, optionalName, requiredName, validAdmission, validDob } from '../../features/people/rules';
import { bloodGroupOptions, blanksToNull, genderOptions, studentStatusOptions } from '../../features/people/options';

interface EditStudentModalProps {
    student: Student;
    isOpen: boolean;
    onClose: () => void;
}

/** Edit a student's register record (the H07 field style, one step). */
export function EditStudentModal({ student, isOpen, onClose }: EditStudentModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<StudentUpdate>();
    const dobValue = useWatch({ control, name: 'dob' });
    const admittedValue = useWatch({ control, name: 'admission_date' });

    useEffect(() => {
        reset({
            first_name: student.first_name,
            middle_name: student.middle_name ?? '',
            last_name: student.last_name,
            dob: student.dob ?? '',
            gender: student.gender ?? '',
            blood_group: student.blood_group ?? '',
            status: student.status,
            admission_date: student.admission_date ?? '',
            city: student.city ?? '',
            state: student.state ?? '',
            pincode: student.pincode ?? '',
        });
    }, [student, reset]);

    const mutation = useMutation({
        mutationFn: (data: StudentUpdate) => peopleService.updateStudent(student.id, blanksToNull(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['student', student.id] });
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
            icon={GraduationCap}
            title={t('peopleForms.title.editStudent')}
            subtitle={t('peopleForms.subtitle.edit', { name: fullName(student) })}
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
                    <SelectField label={t('peopleForms.label.gender')} placeholder={t('peopleForms.choose')} options={genderOptions(t)} {...register('gender')} />
                </FormRow>
                <input type="hidden" {...register('dob', { validate: (v) => !v || validDob(t)(v) })} />
                <BsDateField label={t('peopleForms.label.dob')} value={dobValue} min={dobBounds().min} max={dobBounds().max} error={errors.dob?.message}
                    onChange={(v) => setValue('dob', v, { shouldDirty: true, shouldValidate: true })} />
                <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...register('blood_group')} />
            </FormSection>

            <FormSection title={t('peopleForms.section.school')}>
                <SelectField label={t('peopleForms.label.status')} options={studentStatusOptions(t)} {...register('status')} />
                <input type="hidden" {...register('admission_date', { validate: (v) => !v || validAdmission(t, () => dobValue)(v) })} />
                <BsDateField label={t('peopleForms.label.admissionDate')} value={admittedValue} max={formatISODate(new Date())}
                    error={errors.admission_date?.message}
                    onChange={(v) => setValue('admission_date', v, { shouldDirty: true, shouldValidate: true })} />
            </FormSection>

            <FormSection title={t('peopleForms.section.contact')}>
                <FormRow>
                    <TextField label={t('peopleForms.label.city')} optional={opt} {...register('city')} />
                    <TextField label={t('peopleForms.label.state')} optional={opt} {...register('state')} />
                </FormRow>
            </FormSection>
        </Dialog>
    );
}
