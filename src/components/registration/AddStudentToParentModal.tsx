import { useRef, useState, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Link2, Plus } from 'lucide-react';

import {
    Avatar,
    Banner,
    Button,
    Dialog,
    FormRow,
    SegmentedControl,
    SelectField,
    Stepper,
    TextField,
} from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent, Student } from '../../types/people';
import { formatISODate } from '../../utils/nepaliDate';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { BsDateField } from '../common/BsDateField';
import { errorText, fieldErrors, fullName, possibleDuplicate, studentWithGuardians } from '../../features/people/format';
import { bloodGroupOptions, genderOptions } from '../../features/people/options';
import { StudentPicker } from '../../features/people/StudentPicker';
import { ParentPicker } from '../../features/people/ParentPicker';
import { ClassSectionFields } from '../../features/people/ClassSectionFields';
import { NAME_MAX, NEPALI_NAME_MAX, dobBounds, optionalName, requiredName, tidy, validAdmission, validDob, validNepaliName } from '../../features/people/rules';

interface AddStudentToParentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Relationship = 'father' | 'mother' | 'guardian' | 'other';
const RELATIONSHIPS: Relationship[] = ['father', 'mother', 'guardian', 'other'];

interface ChildDraft {
    first_name: string;
    middle_name: string;
    last_name: string;
    name_nepali: string;
    dob: string;
    gender: string;
    blood_group: string;
    class_id: string;
    section_id: string;
    admission_date: string;
    admission_no: string;
}

const emptyChild = (): ChildDraft => ({
    first_name: '', middle_name: '', last_name: '', name_nepali: '', dob: '', gender: '', blood_group: '', class_id: '', section_id: '',
    admission_date: formatISODate(new Date()), admission_no: '',
});

/**
 * Add a child to a family already on the register: pick the parent, then
 * enter a new child (POST /people/students with parent_id, enrolled in the
 * class and section given) or pick one already at the school
 * (POST /people/students/{id}/guardians). The same fields and rules as
 * Register student.
 */
export function AddStudentToParentModal({ isOpen, onClose }: AddStudentToParentModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const [step, setStep] = useState<0 | 1 | 'done'>(0);
    const [parent, setParent] = useState<Parent | null>(null);
    // No default: staff choose. "Father" by default recorded mothers as fathers.
    const [relationship, setRelationship] = useState<Relationship | ''>('');
    const [relError, setRelError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [duplicate, setDuplicate] = useState<string | null>(null);
    const [addedName, setAddedName] = useState('');
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [picked, setPicked] = useState<Student | null>(null);
    const [pickError, setPickError] = useState<string | undefined>();
    const sending = useRef(false);

    const form = useForm<ChildDraft>({ defaultValues: emptyChild() });
    const { errors } = form.formState;
    const [dobValue, admittedValue, classId, sectionId] = useWatch({ control: form.control, name: ['dob', 'admission_date', 'class_id', 'section_id'] });
    const born = dobBounds();
    const parentName = parent ? fullName(parent) : '';

    const reset = () => {
        setStep(0);
        setParent(null);
        setRelationship('');
        setRelError(false);
        setError(null);
        setDuplicate(null);
        setMode('new');
        setPicked(null);
        setPickError(undefined);
        form.reset(emptyChild());
    };
    const close = () => { reset(); onClose(); };
    const started = step === 1 && (form.formState.isDirty || !!picked || !!relationship);
    const requestClose = () => {
        if (!started) return close();
        confirm({
            title: t('peopleRules.discardTitle'),
            body: t('peopleRules.discardBody'),
            confirmLabel: t('peopleRules.discard'),
            cancelLabel: t('peopleRules.keepEditing'),
            tone: 'danger',
            onConfirm: close,
        });
    };

    const refresh = (studentId?: number) => {
        ['students', 'parents'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
        queryClient.invalidateQueries({ queryKey: ['people-count'] });
        if (studentId) queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
    };
    const failed = (err: unknown) => {
        const dup = possibleDuplicate(err);
        if (dup) return setDuplicate(dup.message);
        // A field the server refused is marked on the field itself.
        const fields = fieldErrors(err);
        const known = Object.keys(fields).filter((f) => f in emptyChild());
        known.forEach((f) => form.setError(f as keyof ChildDraft, { message: fields[f] }));
        if (known.length === 0) setError(errorText(err, t('peoplePage.error.body')));
    };

    const create = useMutation({
        mutationFn: ({ c, allowDuplicate }: { c: ChildDraft; allowDuplicate: boolean }) =>
            peopleService.createStudent({
                first_name: tidy(c.first_name),
                middle_name: tidy(c.middle_name) || undefined,
                last_name: tidy(c.last_name),
                name_nepali: tidy(c.name_nepali) || undefined,
                dob: c.dob,
                gender: c.gender,
                blood_group: c.blood_group || undefined,
                admission_date: c.admission_date,
                admission_no: c.admission_no.trim() || undefined,
                class_id: c.class_id ? Number(c.class_id) : undefined,
                section_id: c.section_id ? Number(c.section_id) : undefined,
                parent_id: parent?.id,
                relationship_type: relationship || undefined,
                is_primary_contact: true,
                allow_duplicate: allowDuplicate,
            }),
        onSuccess: (st: Student, { c }) => {
            refresh(st?.id);
            setAddedName(tidy(`${c.first_name} ${c.last_name}`));
            setStep('done');
        },
        onError: failed,
        onSettled: () => { sending.current = false; },
    });

    const link = useMutation({
        mutationFn: (st: Student) => peopleService.addGuardian(st.id, { parent_id: parent!.id, relationship_type: relationship || undefined }),
        onSuccess: (_, st) => {
            refresh(st.id);
            setAddedName(fullName(st));
            setPicked(null);
            setStep('done');
        },
        onError: failed,
        onSettled: () => { sending.current = false; },
    });

    const busy = create.isPending || link.isPending;

    const submitChild = (e: FormEvent<HTMLFormElement>, allowDuplicate = false) => {
        e.preventDefault();
        setError(null);
        setDuplicate(null);
        if (!relationship) setRelError(true);
        if (mode === 'existing') {
            if (!picked) setPickError(t('registerFamily.error.pickStudent'));
            if (!picked || !relationship || sending.current) return;
            sending.current = true;
            return link.mutate(picked);
        }
        void form.handleSubmit((c) => {
            // A second click in the same instant used to add the child twice.
            if (!relationship || sending.current) return;
            sending.current = true;
            create.mutate({ c, allowDuplicate });
        })(e);
    };

    if (step === 'done') {
        return (
            <Dialog
                open={isOpen}
                onClose={close}
                size="sm"
                icon={CheckCircle2}
                iconTone="ok"
                title={t('addChild.done.title')}
                subtitle={t('addChild.done.body', { child: addedName, parent: parentName })}
                closeLabel={t('common.close')}
                footer={
                    <>
                        <Button variant="quiet" leftIcon={Plus} onClick={() => { form.reset(emptyChild()); setPicked(null); setRelationship(''); setRelError(false); setError(null); setStep(1); }}>{t('addChild.action.another')}</Button>
                        <Button onClick={close}>{t('addChild.action.done')}</Button>
                    </>
                }
            />
        );
    }

    return (
        <>
            {confirmUI}
            <Dialog
                open={isOpen}
                onClose={requestClose}
                dismissible={!busy}
                icon={Link2}
                eyebrow={t('addChild.eyebrow', { n: step + 1 })}
                title={t('addChild.title')}
                subtitle={step === 0 ? t('addChild.subtitle.parent') : t('addChild.subtitle.child', { name: parentName })}
                closeLabel={t('common.close')}
                stepper={<Stepper label={t('addChild.title')} current={step} steps={[t('addChild.steps.parent'), t('addChild.steps.child')]} />}
                onSubmit={step === 1 ? (e) => submitChild(e) : (e) => { e.preventDefault(); if (parent) setStep(1); }}
                footer={
                    step === 0 ? (
                        <>
                            <Button variant="quiet" onClick={close} className="sm:mr-auto">{t('addChild.action.cancel')}</Button>
                            <Button type="submit" disabled={!parent}>{t('addChild.action.next')}</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => setStep(0)} disabled={busy} className="sm:mr-auto">{t('addChild.action.back')}</Button>
                            {mode === 'new' ? (
                                <Button type="submit" leftIcon={Plus} loading={busy} disabled={!!duplicate}>{busy ? t('addChild.action.adding') : t('addChild.action.add')}</Button>
                            ) : (
                                <Button type="submit" leftIcon={Link2} loading={busy}>{t('addChild.action.link')}</Button>
                            )}
                        </>
                    )
                }
            >
                {step === 0 && <ParentPicker label={t('addChild.steps.parent')} value={parent} onChange={setParent} />}

                {step === 1 && parent && (
                    <>
                        {error && <Banner tone="bad" title={t('addChild.error.title')}>{error}</Banner>}
                        {duplicate && (
                            <Banner tone="warn" title={t('peopleRules.duplicateTitle')}
                                action={<Button variant="quiet" size="sm" loading={busy} onClick={() => { setDuplicate(null); void form.handleSubmit((c) => { if (sending.current) return; sending.current = true; create.mutate({ c, allowDuplicate: true }); })(); }}>{t('peopleRules.addAnyway')}</Button>}>
                                {duplicate}
                            </Banner>
                        )}
                        <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                            <Avatar name={parentName} size={34} />
                            <div className="flex min-w-0 flex-1 flex-col">
                                <span className="type-caption text-muted">{t('addChild.parentLabel')}</span>
                                <span className="truncate type-small-semibold text-ink">{parentName}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep(0)}>{t('addChild.change')}</Button>
                        </div>
                        <SegmentedControl<'new' | 'existing'>
                            aria-label={t('registerFamily.mode.label')}
                            value={mode}
                            onChange={(m) => { setMode(m); setPickError(undefined); setError(null); setDuplicate(null); }}
                            className="w-full [&>*]:flex-1"
                            options={[{ value: 'new', label: t('registerFamily.mode.new') }, { value: 'existing', label: t('registerFamily.mode.existing') }]}
                        />
                        <div className="flex flex-col gap-2">
                            <p className="type-small-semibold text-ink">{t('peopleRules.relationshipFrom', { parent: parentName })}</p>
                            <SegmentedControl<Relationship>
                                aria-label={t('peopleRules.relationshipFrom', { parent: parentName })}
                                value={relationship as Relationship}
                                onChange={(r) => { setRelationship(r); setRelError(false); }}
                                className="w-full [&>*]:flex-1"
                                options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`registerFamily.relationship.${r}`) }))}
                            />
                            {relError && !relationship && <p role="alert" className="type-caption text-bad">{t('peopleRules.relationshipRequired')}</p>}
                        </div>
                        {mode === 'existing' && (
                            <StudentPicker label={t('registerFamily.field.existing')} value={picked} onChange={(st) => { setPicked(st); setPickError(undefined); }}
                                error={pickError} describe={studentWithGuardians} />
                        )}
                        {mode === 'new' && (
                            <>
                                <FormRow>
                                    <TextField label={t('peopleForms.label.firstName')} autoComplete="off" maxLength={NAME_MAX} error={errors.first_name?.message}
                                        {...form.register('first_name', { validate: requiredName(t, 'first') })} />
                                    <TextField label={t('peopleForms.label.middleName')} optional={t('peopleForms.optional')} autoComplete="off" maxLength={NAME_MAX} error={errors.middle_name?.message}
                                        {...form.register('middle_name', { validate: optionalName(t) })} />
                                </FormRow>
                                <FormRow>
                                    <TextField label={t('peopleForms.label.lastName')} autoComplete="off" maxLength={NAME_MAX} error={errors.last_name?.message}
                                        {...form.register('last_name', { validate: requiredName(t, 'last') })} />
                                    <SelectField label={t('peopleForms.label.gender')} placeholder={t('peopleForms.choose')} options={genderOptions(t)} error={errors.gender?.message}
                                        {...form.register('gender', { required: t('registerFamily.error.gender') })} />
                                </FormRow>
                                <TextField label={t('peopleRules.nameNepali')} optional={t('peopleForms.optional')} lang="ne" autoComplete="off" maxLength={NEPALI_NAME_MAX}
                                    hint={t('peopleRules.nameNepaliHint')} error={errors?.name_nepali?.message} {...form.register('name_nepali', { validate: validNepaliName(t) })} />
                                <input type="hidden" {...form.register('dob', { validate: validDob(t) })} />
                                <BsDateField label={t('peopleForms.label.dob')} value={dobValue} min={born.min} max={born.max} error={errors.dob?.message}
                                    onChange={(v) => {
                                        form.setValue('dob', v, { shouldDirty: true, shouldValidate: !!errors.dob });
                                        if (errors.admission_date) void form.trigger('admission_date');
                                    }} />
                                <SelectField label={t('peopleForms.label.bloodGroup')} optional={t('peopleForms.optional')} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...form.register('blood_group')} />
                                <input type="hidden" {...form.register('section_id', {
                                    validate: (v) => !form.getValues('class_id') || !!v || t('peopleRules.sectionRequired'),
                                })} />
                                <ClassSectionFields
                                    enabled={isOpen}
                                    classId={classId}
                                    sectionId={sectionId}
                                    sectionError={errors.section_id?.message}
                                    onChange={(n) => {
                                        form.setValue('class_id', n.class_id, { shouldDirty: true });
                                        form.setValue('section_id', n.section_id, { shouldDirty: true, shouldValidate: !!errors.section_id });
                                    }}
                                />
                                <input type="hidden" {...form.register('admission_date', { validate: validAdmission(t, () => form.getValues('dob')) })} />
                                <BsDateField label={t('peopleForms.label.admissionDate')} value={admittedValue} min={dobValue || born.min} max={formatISODate(new Date())}
                                    error={errors.admission_date?.message}
                                    onChange={(v) => form.setValue('admission_date', v, { shouldDirty: true, shouldValidate: !!errors.admission_date })} />
                                <FormRow>
                                    <TextField label={t('addChild.admissionNo')} optional={t('peopleForms.optional')} hint={t('addChild.admissionNoHint')} maxLength={50}
                                        error={errors.admission_no?.message} {...form.register('admission_no')} />
                                </FormRow>
                            </>
                        )}
                    </>
                )}
            </Dialog>
        </>
    );
}
