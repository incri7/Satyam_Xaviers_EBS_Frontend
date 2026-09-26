import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layers, Plus } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SelectField, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { errorText } from '../../features/people/format';

interface CreateSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    className: string;
    /** Next free letter, e.g. "C". */
    suggestedName?: string;
    /** Seats of the class's other sections, as a sensible default. */
    suggestedSeats?: number;
}

interface SectionForm {
    name: string;
    capacity: string;
    class_teacher_id: string;
}

/**
 * Add a section to a class (POST /academics/sections). This dialog existed
 * but nothing opened it; the class page's "Add section" now does.
 */
export function CreateSectionModal({ isOpen, onClose, classId, className, suggestedName = '', suggestedSeats = 40 }: CreateSectionModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const defaults = { name: suggestedName, capacity: String(suggestedSeats), class_teacher_id: '' };
    const form = useForm<SectionForm>({ values: defaults });
    const { errors } = form.formState;
    const teachers = useQuery({ queryKey: ['teacher-options'], queryFn: academicsService.getTeacherOptions, enabled: isOpen, staleTime: 5 * 60 * 1000 });

    const close = () => { setError(null); onClose(); };

    const mutation = useMutation({
        mutationFn: (v: SectionForm) =>
            academicsService.createSection({
                name: v.name.trim(),
                class_id: classId,
                capacity: Number(v.capacity),
                class_teacher_id: v.class_teacher_id ? Number(v.class_teacher_id) : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections'] });
            queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
            close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const busy = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            size="sm"
            icon={Layers}
            title={t('classesPage.createSection.title')}
            subtitle={className}
            closeLabel={t('common.close')}
            onSubmit={form.handleSubmit((v) => { setError(null); mutation.mutate(v); })}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button type="submit" leftIcon={Plus} loading={busy}>{busy ? t('classesPage.createSection.creating') : t('classesPage.createSection.create')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('classesPage.createSection.failed')}>{error}</Banner>}
            <FormRow>
                <TextField label={t('classesPage.createSection.name')} autoComplete="off" error={errors.name?.message}
                    {...form.register('name', { validate: (v) => v.trim() !== '' || t('classesPage.createSection.nameRequired') })} />
                <TextField type="number" inputMode="numeric" min={1} label={t('classesPage.createSection.seats')} error={errors.capacity?.message}
                    {...form.register('capacity', { validate: (v) => Number(v) >= 1 || t('classesPage.createClass.seatsInvalid') })} />
            </FormRow>
            <SelectField label={t('classesPage.createSection.teacher')} optional={t('peopleForms.optional')} placeholder={t('classesPage.createSection.later')}
                options={(teachers.data ?? []).map((tc) => ({ value: tc.id, label: tc.name }))} {...form.register('class_teacher_id')} />
        </Dialog>
    );
}
