import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layers, Plus } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { errorText } from '../../features/people/format';
import { cn } from '../../utils/cn';

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ClassForm {
    name: string;
    seats: string;
}

/**
 * Figma H09 "Create class": the class and its sections in one go. The API
 * creates them one by one (POST class, then POST section per letter); if a
 * section fails the class still exists, and the dialog says which failed.
 * Figma's streams are left out: the backend has no streams.
 */
export function CreateClassModal({ isOpen, onClose }: CreateClassModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [letters, setLetters] = useState<string[]>(['A']);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<ClassForm>({ defaultValues: { name: '', seats: '40' } });
    const { errors } = form.formState;
    const seats = Number(useWatch({ control: form.control, name: 'seats' })) || 0;

    const close = () => {
        form.reset({ name: '', seats: '40' });
        setLetters(['A']);
        setError(null);
        onClose();
    };

    const mutation = useMutation({
        mutationFn: async (v: ClassForm) => {
            const klass = await academicsService.createClass({ name: v.name.trim() });
            const results = await Promise.allSettled(
                letters.map((name) => academicsService.createSection({ name, class_id: klass.id, capacity: Number(v.seats) })),
            );
            const failed = letters.filter((_, i) => results[i].status === 'rejected');
            return { failed };
        },
        onSuccess: ({ failed }) => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['sections'] });
            if (failed.length) setError(t('classesPage.createClass.partial', { sections: failed.join(', ') }));
            else close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const toggle = (l: string) =>
        setLetters((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l].sort()));

    const summary =
        letters.length === 0
            ? t('classesPage.createClass.summaryNone')
            : letters.length === 1
                ? t('classesPage.createClass.summaryOne', { seats: seats })
                : t('classesPage.createClass.summary', { n: letters.length, seats: seats * letters.length });

    const busy = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={Layers}
            title={t('classesPage.createClass.title')}
            subtitle={t('classesPage.createClass.sub')}
            closeLabel={t('common.close')}
            onSubmit={form.handleSubmit((v) => { setError(null); mutation.mutate(v); })}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button type="submit" leftIcon={Plus} loading={busy}>{busy ? t('classesPage.createClass.creating') : t('classesPage.createClass.create')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('classesPage.createClass.failed')}>{error}</Banner>}
            <FormRow>
                <TextField label={t('classesPage.createClass.name')} placeholder={t('classesPage.createClass.namePlaceholder')} autoComplete="off" error={errors.name?.message}
                    {...form.register('name', { validate: (v) => v.trim() !== '' || t('classesPage.createClass.nameRequired') })} />
                <TextField type="number" inputMode="numeric" min={1} label={t('classesPage.createClass.seats')} error={errors.seats?.message}
                    {...form.register('seats', { validate: (v) => Number(v) >= 1 || t('classesPage.createClass.seatsInvalid') })} />
            </FormRow>
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 type-small-semibold text-ink">{t('classesPage.createClass.sections')}</legend>
                <div className="flex flex-wrap gap-2">
                    {LETTERS.map((l) => {
                        const on = letters.includes(l);
                        return (
                            <button key={l} type="button" aria-pressed={on} onClick={() => toggle(l)}
                                className={cn(
                                    'grid size-11 place-items-center rounded-row border-[1.5px] type-title outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                    on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink-2 hover:bg-sunken',
                                )}>
                                {l}
                            </button>
                        );
                    })}
                </div>
                <p className="type-caption text-muted">{t('classesPage.createClass.sectionsHint')}</p>
            </fieldset>
            <Banner tone="info" title={summary} />
        </Dialog>
    );
}
