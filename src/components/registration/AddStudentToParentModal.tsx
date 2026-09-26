import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, CheckCircle2, Link2, Loader2, Plus, Search } from 'lucide-react';

import {
    Avatar,
    Banner,
    Button,
    Dialog,
    FormRow,
    Person,
    SearchField,
    SegmentedControl,
    SelectField,
    Stepper,
    TextField,
} from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatISODate } from '../../utils/nepaliDate';
import { cn } from '../../utils/cn';
import { errorText, fullName } from '../../features/people/format';
import { bloodGroupOptions, genderOptions } from '../../features/people/options';

interface AddStudentToParentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Relationship = 'father' | 'mother' | 'guardian' | 'other';
const RELATIONSHIPS: Relationship[] = ['father', 'mother', 'guardian', 'other'];
const NAME = /^[A-Za-z\s'.-]{2,}$/;

interface ChildDraft {
    first_name: string;
    middle_name: string;
    last_name: string;
    dob: string;
    gender: string;
    blood_group: string;
    admission_date: string;
    admission_no: string;
}

const emptyChild = (): ChildDraft => ({
    first_name: '', middle_name: '', last_name: '', dob: '', gender: '', blood_group: '',
    admission_date: formatISODate(new Date()), admission_no: '',
});

/**
 * Add a child to a family already on the register: pick the parent, then
 * enter the child (POST /people/students with parent_id).
 *
 * The old version posted camelCase fields and gender "male", which the API
 * rejects, so it could never succeed; this sends the API's own field names.
 */
export function AddStudentToParentModal({ isOpen, onClose }: AddStudentToParentModalProps) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<0 | 1 | 'done'>(0);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [parent, setParent] = useState<Parent | null>(null);
    const [relationship, setRelationship] = useState<Relationship>('father');
    const [error, setError] = useState<string | null>(null);
    const [addedName, setAddedName] = useState('');

    const form = useForm<ChildDraft>({ defaultValues: emptyChild() });
    const { errors } = form.formState;
    const dobValue = useWatch({ control: form.control, name: 'dob' });
    const admittedValue = useWatch({ control: form.control, name: 'admission_date' });

    useEffect(() => {
        const id = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const parents = useQuery({
        queryKey: ['parents', 'pick', search],
        queryFn: () => peopleService.getParents({ search, limit: 8 }),
        enabled: isOpen && search.length >= 2,
    });

    const reset = () => {
        setStep(0);
        setSearchInput('');
        setSearch('');
        setParent(null);
        setRelationship('father');
        setError(null);
        form.reset(emptyChild());
    };
    const close = () => { reset(); onClose(); };

    const mutation = useMutation({
        mutationFn: (c: ChildDraft) =>
            peopleService.createStudent({
                first_name: c.first_name.trim(),
                middle_name: c.middle_name || undefined,
                last_name: c.last_name.trim(),
                dob: c.dob,
                gender: c.gender,
                blood_group: c.blood_group || undefined,
                admission_date: c.admission_date,
                admission_no: c.admission_no || undefined,
                parent_id: parent?.id,
                relationship_type: relationship,
                is_primary_contact: true,
            }),
        onSuccess: (_, c) => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['people-count'] });
            setAddedName(`${c.first_name} ${c.last_name}`.trim());
            setStep('done');
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const busy = mutation.isPending;
    const opt = t('peopleForms.optional');
    const results: Parent[] = parents.data?.parents ?? [];

    if (step === 'done') {
        return (
            <Dialog
                open={isOpen}
                onClose={close}
                size="sm"
                icon={CheckCircle2}
                iconTone="ok"
                title={t('addChild.done.title')}
                subtitle={t('addChild.done.body', { child: addedName, parent: parent ? fullName(parent) : '' })}
                closeLabel={t('common.close')}
                footer={
                    <>
                        <Button variant="quiet" leftIcon={Plus} onClick={() => { form.reset(emptyChild()); setError(null); setStep(1); }}>{t('addChild.action.another')}</Button>
                        <Button onClick={close}>{t('addChild.action.done')}</Button>
                    </>
                }
            />
        );
    }

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={Link2}
            eyebrow={t('addChild.eyebrow', { n: step + 1 })}
            title={t('addChild.title')}
            subtitle={step === 0 ? t('addChild.subtitle.parent') : t('addChild.subtitle.child', { name: parent ? parent.first_name : '' })}
            closeLabel={t('common.close')}
            stepper={<Stepper label={t('addChild.title')} current={step} steps={[t('addChild.steps.parent'), t('addChild.steps.child')]} />}
            onSubmit={step === 1 ? form.handleSubmit((c) => { setError(null); mutation.mutate(c); }) : undefined}
            footer={
                step === 0 ? (
                    <>
                        <Button variant="quiet" onClick={close} className="sm:mr-auto">{t('addChild.action.cancel')}</Button>
                        <Button disabled={!parent} onClick={() => setStep(1)}>{t('addChild.action.next')}</Button>
                    </>
                ) : (
                    <>
                        <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => setStep(0)} disabled={busy} className="sm:mr-auto">{t('addChild.action.back')}</Button>
                        <Button type="submit" leftIcon={Plus} loading={busy}>{busy ? t('addChild.action.adding') : t('addChild.action.add')}</Button>
                    </>
                )
            }
        >
            {step === 0 && (
                <>
                    <SearchField value={searchInput} onChange={setSearchInput} placeholder={t('addChild.search')} clearLabel={t('common.clear')} />
                    <div role="listbox" aria-label={t('addChild.steps.parent')} className="flex min-h-[180px] flex-col">
                        {search.length < 2 ? (
                            <p className="flex flex-1 items-center justify-center gap-2 px-4 text-center type-small text-muted">
                                <Search size={16} aria-hidden /> {t('addChild.searchHint')}
                            </p>
                        ) : parents.isPending ? (
                            <p className="flex flex-1 items-center justify-center gap-2 type-small text-muted">
                                <Loader2 size={16} className="animate-spin" aria-hidden /> {t('addChild.searching')}
                            </p>
                        ) : parents.isError ? (
                            <Banner tone="bad" title={t('addChild.error.search')} />
                        ) : results.length === 0 ? (
                            <p className="flex flex-1 items-center justify-center px-4 text-center type-small text-muted">{t('addChild.noMatch')}</p>
                        ) : (
                            <ul className="flex flex-col gap-1.5">
                                {results.map((p) => {
                                    const on = parent?.id === p.id;
                                    return (
                                        <li key={p.id}>
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={on}
                                                onClick={() => setParent(p)}
                                                className={cn(
                                                    'flex w-full items-center gap-3 rounded-row border px-3.5 py-2.5 text-left outline-none transition-colors',
                                                    'focus-visible:ring-3 focus-visible:ring-focus/60',
                                                    on ? 'border-primary bg-primary-soft' : 'border-line-subtle bg-surface hover:bg-surface-2',
                                                )}
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <Person name={fullName(p)} sub={[p.phone || p.user?.phone, p.email || p.user?.email].filter(Boolean).join(', ') || p.occupation} />
                                                </span>
                                                {on && <Check size={18} className="shrink-0 text-primary" aria-hidden />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}

            {step === 1 && parent && (
                <>
                    {error && <Banner tone="bad" title={t('addChild.error.title')}>{error}</Banner>}
                    <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                        <Avatar name={fullName(parent)} size={34} />
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="type-caption text-muted">{t('addChild.parentLabel')}</span>
                            <span className="truncate type-small-semibold text-ink">{fullName(parent)}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(0)}>{t('addChild.change')}</Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="type-small-semibold text-ink">{t('registerFamily.field.relationshipTo', { name: parent.first_name })}</p>
                        <SegmentedControl<Relationship>
                            aria-label={t('registerFamily.field.relationshipTo', { name: parent.first_name })}
                            value={relationship}
                            onChange={setRelationship}
                            className="w-full [&>*]:flex-1"
                            options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`registerFamily.relationship.${r}`) }))}
                        />
                    </div>
                    <FormRow>
                        <TextField label={t('peopleForms.label.firstName')} autoComplete="off" error={errors.first_name?.message}
                            {...form.register('first_name', { required: t('registerFamily.error.firstName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                        <TextField label={t('peopleForms.label.lastName')} autoComplete="off" error={errors.last_name?.message}
                            {...form.register('last_name', { required: t('registerFamily.error.lastName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                    </FormRow>
                    <FormRow>
                        <TextField type="date" label={t('peopleForms.label.dob')} error={errors.dob?.message} hint={dobValue ? df.date(dobValue, 'medium') : undefined}
                            {...form.register('dob', { required: t('registerFamily.error.dob') })} />
                        <SelectField label={t('peopleForms.label.gender')} placeholder={t('peopleForms.choose')} options={genderOptions(t)} error={errors.gender?.message}
                            {...form.register('gender', { required: t('registerFamily.error.gender') })} />
                    </FormRow>
                    <FormRow>
                        <TextField type="date" label={t('peopleForms.label.admissionDate')} error={errors.admission_date?.message} hint={admittedValue ? df.date(admittedValue, 'medium') : undefined}
                            {...form.register('admission_date', { required: t('registerFamily.error.admissionDate') })} />
                        <TextField label={t('addChild.admissionNo')} optional={opt} hint={t('addChild.admissionNoHint')} {...form.register('admission_no')} />
                    </FormRow>
                    <FormRow>
                        <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...form.register('blood_group')} />
                    </FormRow>
                    {/* POST /people/students links the parent but does not enrol. */}
                    <Banner tone="info" title={t('addChild.enrolNote')} />
                </>
            )}
        </Dialog>
    );
}
