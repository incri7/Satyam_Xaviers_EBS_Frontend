import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Mail, Pencil, Phone, Plus, Trash2, UserPlus } from 'lucide-react';

import {
    Banner,
    Button,
    Dialog,
    FormRow,
    IconTile,
    SegmentedControl,
    SelectField,
    Stepper,
    TextField,
} from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent, Student, StudentCreate, UnifiedRegistrationCreate } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatISODate } from '../../utils/nepaliDate';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { errorText, fullName, parentContact, possibleDuplicate, studentWithGuardians } from '../../features/people/format';
import { StudentPicker } from '../../features/people/StudentPicker';
import { ClassSectionFields } from '../../features/people/ClassSectionFields';
import { useClasses } from '../../features/people/useClasses';
import { bloodGroupOptions, genderOptions } from '../../features/people/options';
import {
    NAME_MAX, dobBounds, mobileDigits, optionalName, requiredName, tidy, validAdmission, validDob, validMobile,
} from '../../features/people/rules';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Registering a guardian for this student, already at the school
        (from their profile): starts on the guardian step. */
    withStudent?: { id: number; name: string; sub?: string };
}

type Relationship = 'father' | 'mother' | 'guardian' | 'other';
const RELATIONSHIPS: Relationship[] = ['father', 'mother', 'guardian', 'other'];

/** A child already at the school, linked rather than created. */
interface ExistingChild {
    kind: 'existing';
    id: number;
    name: string;
    sub?: string;
    // Chosen by staff every time: a default of "father" recorded mothers as fathers.
    relationship: Relationship | '';
}
type ChildEntry = ({ kind: 'new' } & ChildDraft) | ExistingChild;

const nameOf = (c: ChildEntry) => (c.kind === 'new' ? tidy([c.first_name, c.middle_name, c.last_name].join(' ')) : c.name);

interface ChildDraft {
    first_name: string;
    middle_name: string;
    last_name: string;
    dob: string;
    gender: string;
    blood_group: string;
    class_id: string;
    section_id: string;
    /** For the review only; not sent. */
    section_name: string;
    admission_date: string;
    relationship: Relationship | '';
}

interface ParentDraft {
    first_name: string;
    last_name: string;
    occupation: string;
    phone: string;
    email: string;
    national_id: string;
    address_line: string;
    city: string;
    state: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyChild = (): ChildDraft => ({
    first_name: '', middle_name: '', last_name: '', dob: '', gender: '', blood_group: '', class_id: '', section_id: '', section_name: '',
    admission_date: formatISODate(new Date()), relationship: '',
});
const emptyParent: ParentDraft = { first_name: '', last_name: '', occupation: '', phone: '', email: '', national_id: '', address_line: '', city: '', state: '' };

/**
 * Figma H07 "Register student": Student → Parent → Review, in one request
 * (POST /people/register/parent-student) that creates the parent's account,
 * the parent record and each child. A family with several children adds them
 * from the Review step. A child may be one already at the school: the new
 * guardian is linked to them instead (a mother registered after the father).
 */
export function RegistrationModal({ isOpen, onClose, withStudent }: RegistrationModalProps) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [confirmUI, confirm] = useConfirmDialog();
    const startChildren = (): ChildEntry[] => (withStudent ? [{ kind: 'existing', id: withStudent.id, name: withStudent.name, sub: withStudent.sub, relationship: '' }] : []);
    const [step, setStep] = useState<0 | 1 | 2 | 'done'>(withStudent ? 1 : 0);
    const [children, setChildren] = useState<ChildEntry[]>(startChildren);
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [picked, setPicked] = useState<Student | null>(null);
    const [pickError, setPickError] = useState<string | undefined>();
    const [editing, setEditing] = useState<number | null>(null);
    const [parent, setParent] = useState<ParentDraft>(emptyParent);
    const [relErrors, setRelErrors] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [duplicate, setDuplicate] = useState<string | null>(null);
    // The number or e-mail typed belongs to a guardian on the register: the
    // children go to them, instead of failing on the last step.
    const [existingParent, setExistingParent] = useState<Parent | null>(null);
    // A guardian is settled: typed in, or picked from the register.
    const hasGuardian = !!parent.first_name || !!existingParent;
    // Set the moment Register is pressed: a second click in the same instant
    // used to send a second registration.
    const sending = useRef(false);

    const childForm = useForm<ChildDraft>({ defaultValues: emptyChild() });
    const parentForm = useForm<ParentDraft>({ defaultValues: emptyParent });
    const [dobValue, admittedValue, classId, sectionId] = useWatch({ control: childForm.control, name: ['dob', 'admission_date', 'class_id', 'section_id'] });
    const classes = useClasses(isOpen);
    const className = (id: string) => classes.find((c) => String(c.id) === id)?.name;
    const born = dobBounds();

    const [typedPhone, typedEmail] = useWatch({ control: parentForm.control, name: ['phone', 'email'] });
    const [lookup, setLookup] = useState('');
    useEffect(() => {
        const digits = mobileDigits(typedPhone);
        const email = (typedEmail ?? '').trim();
        const term = /^9[678]\d{8}$/.test(digits) ? digits : EMAIL.test(email) ? email : '';
        const id = setTimeout(() => setLookup(term), 400);
        return () => clearTimeout(id);
    }, [typedPhone, typedEmail]);
    const match = useQuery({
        queryKey: ['parents', 'match', lookup],
        queryFn: () => peopleService.getParents({ search: lookup, limit: 3 }),
        enabled: step === 1 && !!lookup,
        staleTime: 30_000,
    });
    const matched: Parent | undefined = (match.data?.parents as Parent[] | undefined)?.[0];
    const chooseExisting = (p: Parent) => {
        if (children.some((c) => !c.relationship)) { setRelErrors(true); return; }
        setExistingParent(p);
        setStep(2);
    };

    const reset = () => {
        setStep(withStudent ? 1 : 0);
        setChildren(startChildren());
        setMode('new');
        setPicked(null);
        setPickError(undefined);
        setEditing(null);
        setParent(emptyParent);
        setRelErrors(false);
        setError(null);
        setDuplicate(null);
        setExistingParent(null);
        childForm.reset(emptyChild());
        parentForm.reset(emptyParent);
    };
    const close = () => { reset(); onClose(); };
    const started = step !== 'done' && (children.length > (withStudent ? 1 : 0) || childForm.formState.isDirty || parentForm.formState.isDirty || !!parent.first_name);
    // Closing a half-filled registration asks first: it used to vanish.
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

    const mutation = useMutation({
        mutationFn: (allowDuplicate: boolean) => {
            const phone = `+977-${mobileDigits(parent.phone)}`;
            const guardian: Pick<UnifiedRegistrationCreate, 'user_in' | 'parent_in' | 'existing_parent_id'> = existingParent ? { existing_parent_id: existingParent.id } : {
                user_in: { email: parent.email.trim(), phone },
                parent_in: {
                    first_name: tidy(parent.first_name),
                    last_name: tidy(parent.last_name),
                    occupation: parent.occupation.trim() || undefined,
                    national_id: parent.national_id.trim() || undefined,
                    address_line: parent.address_line.trim() || undefined,
                    city: parent.city.trim() || undefined,
                    state: parent.state.trim() || undefined,
                    // Kept on the parent record too, so a guardian is reachable
                    // even before they sign in.
                    phone,
                    email: parent.email.trim(),
                },
            };
            const payload: UnifiedRegistrationCreate = {
                ...guardian,
                existing_students: children.flatMap((c) => (c.kind === 'existing' ? [{ student_id: c.id, relationship_type: c.relationship || undefined }] : [])),
                students_in: children.flatMap((c) => (c.kind === 'new' ? [c] : [])).map((c): StudentCreate => ({
                    first_name: tidy(c.first_name),
                    middle_name: tidy(c.middle_name) || undefined,
                    last_name: tidy(c.last_name),
                    dob: c.dob,
                    gender: c.gender,
                    blood_group: c.blood_group || undefined,
                    admission_date: c.admission_date,
                    class_id: c.class_id ? Number(c.class_id) : undefined,
                    section_id: c.section_id ? Number(c.section_id) : undefined,
                    relationship_type: c.relationship || undefined,
                    is_primary_contact: true,
                    allow_duplicate: allowDuplicate,
                    city: parent.city.trim() || undefined,
                    state: parent.state.trim() || undefined,
                })),
            };
            return peopleService.registerParentStudent(payload);
        },
        onSuccess: () => {
            ['students', 'parents', 'users'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            queryClient.invalidateQueries({ queryKey: ['people-count'] });
            setStep('done');
        },
        onError: (err) => {
            const dup = possibleDuplicate(err);
            if (dup) setDuplicate(dup.message);
            else setError(errorText(err, t('peoplePage.error.body')));
        },
        onSettled: () => { sending.current = false; },
    });
    const register = (allowDuplicate = false) => {
        if (sending.current) return;
        sending.current = true;
        setError(null);
        setDuplicate(null);
        mutation.mutate(allowDuplicate);
    };

    // ---- step actions -------------------------------------------------
    const saveNewChild = childForm.handleSubmit((draft) => {
        const entry: ChildEntry = { kind: 'new', ...draft };
        const next = editing === null ? [...children, entry] : children.map((c, i) => (i === editing ? entry : c));
        setChildren(next);
        setEditing(null);
        // A second child, or an edit, goes straight back to the review.
        setStep(hasGuardian ? 2 : 1);
    });
    const saveChild = (e: FormEvent<HTMLFormElement>) => {
        if (mode === 'new' || editing !== null) return void saveNewChild(e);
        e.preventDefault();
        if (!picked) { setPickError(t('registerFamily.error.pickStudent')); return; }
        setChildren([...children, { kind: 'existing', id: picked.id, name: fullName(picked), sub: studentWithGuardians(picked), relationship: '' }]);
        setPicked(null);
        setPickError(undefined);
        setStep(hasGuardian ? 2 : 1);
    };

    const saveParent = parentForm.handleSubmit((draft) => {
        if (children.some((c) => !c.relationship)) { setRelErrors(true); return; }
        setParent(draft);
        setStep(2);
    });

    const editChild = (i: number) => {
        const c = children[i];
        if (c.kind !== 'new') return;
        setEditing(i); setMode('new'); childForm.reset(c); setStep(0);
    };
    const addChild = () => { setEditing(null); setPicked(null); childForm.reset(emptyChild()); setStep(0); };
    const removeChild = (i: number) => {
        const next = children.filter((_, j) => j !== i);
        setChildren(next);
        if (next.length === 0) addChild();
    };
    const setRelationship = (i: number, r: Relationship) =>
        setChildren((list) => list.map((c, j) => (j === i ? { ...c, relationship: r } : c)));

    const busy = mutation.isPending;
    const opt = t('peopleForms.optional');
    const ce = childForm.formState.errors;
    const pe = parentForm.formState.errors;
    const draftName = tidy(`${parent.first_name} ${parent.last_name}`);

    // ---- done ---------------------------------------------------------
    if (step === 'done') {
        return (
            <Dialog
                open={isOpen}
                onClose={close}
                icon={CheckCircle2}
                iconTone="ok"
                title={t('registerFamily.done.title')}
                subtitle={existingParent ? t('peopleRules.doneExisting', { name: fullName(existingParent) }) : t('registerFamily.done.body', { name: draftName, email: parent.email })}
                closeLabel={t('common.close')}
                size="sm"
                footer={
                    <>
                        <Button variant="quiet" leftIcon={Plus} onClick={reset}>{t('registerFamily.action.another')}</Button>
                        <Button onClick={close}>{t('registerFamily.action.done')}</Button>
                    </>
                }
            />
        );
    }

    const subtitle =
        step === 0
            ? (mode === 'existing' && editing === null ? t('registerFamily.subtitle.existing')
                : children.length > 0 && editing === null ? t('registerFamily.subtitle.studentMore') : t('registerFamily.subtitle.student'))
            : step === 1
                ? children.length > 1 ? t('registerFamily.subtitle.parentMany') : t('registerFamily.subtitle.parent', { name: children[0] ? nameOf(children[0]) : '' })
                : t('registerFamily.subtitle.review');

    const footer =
        step === 0 ? (
            <>
                {children.length > 0 && hasGuardian ? (
                    <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => { setEditing(null); setStep(2); }} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                ) : (
                    <Button variant="quiet" onClick={requestClose} className="sm:mr-auto">{t('registerFamily.action.cancel')}</Button>
                )}
                <Button type="submit">{hasGuardian ? t('registerFamily.action.saveChild') : t('registerFamily.action.continueParent')}</Button>
            </>
        ) : step === 1 ? (
            <>
                {parent.first_name || !withStudent ? (
                    <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => setStep(parent.first_name ? 2 : 0)} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                ) : (
                    <Button variant="quiet" onClick={requestClose} className="sm:mr-auto">{t('registerFamily.action.cancel')}</Button>
                )}
                <Button type="submit">{t('registerFamily.action.continueReview')}</Button>
            </>
        ) : (
            <>
                <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => { setExistingParent(null); setStep(1); }} disabled={busy} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                <Button leftIcon={UserPlus} loading={busy} disabled={!!duplicate} onClick={() => register(false)}>
                    {busy ? t('registerFamily.action.registering') : t('registerFamily.action.register')}
                </Button>
            </>
        );

    return (
        <>
            {confirmUI}
            <Dialog
                open={isOpen}
                onClose={requestClose}
                dismissible={!busy}
                icon={UserPlus}
                eyebrow={t('registerFamily.eyebrow', { n: step + 1 })}
                title={t('registerFamily.title')}
                subtitle={subtitle}
                closeLabel={t('common.close')}
                stepper={
                    <Stepper
                        label={t('registerFamily.stepsLabel')}
                        current={step}
                        steps={[t('registerFamily.steps.student'), t('registerFamily.steps.parent'), t('registerFamily.steps.review')]}
                    />
                }
                onSubmit={step === 0 ? saveChild : step === 1 ? saveParent : (e) => e.preventDefault()}
                footer={footer}
            >
                {step === 0 && editing === null && (
                    <SegmentedControl<'new' | 'existing'>
                        aria-label={t('registerFamily.mode.label')}
                        value={mode}
                        onChange={(m) => { setMode(m); setPickError(undefined); }}
                        className="w-full [&>*]:flex-1"
                        options={[{ value: 'new', label: t('registerFamily.mode.new') }, { value: 'existing', label: t('registerFamily.mode.existing') }]}
                    />
                )}
                {step === 0 && mode === 'existing' && editing === null && (
                    <StudentPicker label={t('registerFamily.field.existing')} value={picked} onChange={(st) => { setPicked(st); setPickError(undefined); }}
                        error={pickError} describe={studentWithGuardians}
                        exclude={children.flatMap((c) => (c.kind === 'existing' ? [c.id] : []))} />
                )}
                {step === 0 && (mode === 'new' || editing !== null) && (
                    <>
                        <FormRow>
                            <TextField label={t('peopleForms.label.firstName')} autoComplete="off" maxLength={NAME_MAX} error={ce.first_name?.message}
                                {...childForm.register('first_name', { validate: requiredName(t, 'first') })} />
                            <TextField label={t('peopleForms.label.middleName')} optional={opt} autoComplete="off" maxLength={NAME_MAX} error={ce.middle_name?.message}
                                {...childForm.register('middle_name', { validate: optionalName(t) })} />
                        </FormRow>
                        <FormRow>
                            <TextField label={t('peopleForms.label.lastName')} autoComplete="off" maxLength={NAME_MAX} error={ce.last_name?.message}
                                {...childForm.register('last_name', { validate: requiredName(t, 'last') })} />
                            <TextField type="date" min={born.min} max={born.max} label={t('peopleForms.label.dob')} error={ce.dob?.message}
                                hint={dobValue ? df.date(dobValue, 'medium') : undefined}
                                {...childForm.register('dob', { validate: validDob(t), onChange: () => { if (childForm.getValues('admission_date')) void childForm.trigger('admission_date'); } })} />
                        </FormRow>
                        <FormRow>
                            <SelectField label={t('peopleForms.label.gender')} placeholder={t('peopleForms.choose')} options={genderOptions(t)} error={ce.gender?.message}
                                {...childForm.register('gender', { required: t('registerFamily.error.gender') })} />
                            <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...childForm.register('blood_group')} />
                        </FormRow>
                        <input type="hidden" {...childForm.register('section_id', {
                            validate: (v) => !childForm.getValues('class_id') || !!v || t('peopleRules.sectionRequired'),
                        })} />
                        <ClassSectionFields
                            enabled={isOpen}
                            classId={classId}
                            sectionId={sectionId}
                            sectionError={ce.section_id?.message}
                            onChange={(n) => {
                                childForm.setValue('class_id', n.class_id, { shouldDirty: true });
                                childForm.setValue('section_id', n.section_id, { shouldDirty: true, shouldValidate: !!ce.section_id });
                                childForm.setValue('section_name', n.section_name);
                            }}
                        />
                        <TextField type="date" max={formatISODate(new Date())} label={t('peopleForms.label.admissionDate')} error={ce.admission_date?.message}
                            hint={admittedValue ? df.date(admittedValue, 'medium') : undefined}
                            {...childForm.register('admission_date', { validate: validAdmission(t, () => childForm.getValues('dob')) })} />
                    </>
                )}

                {step === 1 && (
                    <>
                        {children.map((c, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <p className="type-small-semibold text-ink">{t('peopleRules.relationshipOf', { child: nameOf(c) })}</p>
                                <SegmentedControl<Relationship>
                                    aria-label={t('peopleRules.relationshipOf', { child: nameOf(c) })}
                                    value={c.relationship as Relationship}
                                    onChange={(r) => setRelationship(i, r)}
                                    className="w-full [&>*]:flex-1"
                                    options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`registerFamily.relationship.${r}`) }))}
                                />
                                {relErrors && !c.relationship && <p role="alert" className="type-caption text-bad">{t('peopleRules.relationshipRequired')}</p>}
                            </div>
                        ))}
                        <FormRow>
                            <TextField label={t('peopleForms.label.firstName')} autoComplete="off" maxLength={NAME_MAX} error={pe.first_name?.message}
                                {...parentForm.register('first_name', { validate: requiredName(t, 'first') })} />
                            <TextField label={t('peopleForms.label.lastName')} autoComplete="off" maxLength={NAME_MAX} error={pe.last_name?.message}
                                {...parentForm.register('last_name', { validate: requiredName(t, 'last') })} />
                        </FormRow>
                        {matched && (
                            <Banner tone="info" title={t('peopleRules.matchTitle', { name: fullName(matched) })}
                                action={<Button variant="quiet" size="sm" onClick={() => chooseExisting(matched)}>{t('peopleRules.matchUse')}</Button>}>
                                {[parentContact(matched), t('peopleRules.matchBody')].filter(Boolean).join(' · ')}
                            </Banner>
                        )}
                        <FormRow>
                            <TextField type="tel" inputMode="tel" leftIcon={Phone} label={t('registerFamily.field.mobile')} placeholder="98XXXXXXXX" hint={t('registerFamily.hint.mobile')} error={pe.phone?.message}
                                {...parentForm.register('phone', { required: t('registerFamily.error.mobile'), validate: validMobile(t) })} />
                            <TextField type="email" inputMode="email" autoCapitalize="none" leftIcon={Mail} label={t('registerFamily.field.email')} hint={t('registerFamily.hint.email')} error={pe.email?.message}
                                {...parentForm.register('email', { required: t('registerFamily.error.email'), pattern: { value: EMAIL, message: t('registerFamily.error.emailInvalid') } })} />
                        </FormRow>
                        <FormRow>
                            <TextField label={t('peopleForms.label.occupation')} optional={opt} maxLength={NAME_MAX} {...parentForm.register('occupation')} />
                            <TextField label={t('peopleForms.label.nationalId')} optional={opt} maxLength={50} {...parentForm.register('national_id')} />
                        </FormRow>
                        <TextField label={t('peopleForms.label.address')} optional={opt} maxLength={255} {...parentForm.register('address_line')} />
                        <FormRow>
                            <TextField label={t('peopleForms.label.city')} optional={opt} maxLength={NAME_MAX} {...parentForm.register('city')} />
                            <TextField label={t('peopleForms.label.state')} optional={opt} maxLength={NAME_MAX} {...parentForm.register('state')} />
                        </FormRow>
                        <Banner tone="info" title={t('registerFamily.accountNote.title')}>{t('registerFamily.accountNote.body')}</Banner>
                    </>
                )}

                {step === 2 && (
                    <>
                        {error && (
                            <Banner tone="bad" title={t('registerFamily.error.title')} action={<Button variant="quiet" size="sm" onClick={() => { setExistingParent(null); setStep(1); }}>{t('registerFamily.review.edit')}</Button>}>
                                {error}
                            </Banner>
                        )}
                        {duplicate && (
                            <Banner tone="warn" title={t('peopleRules.duplicateTitle')}
                                action={<Button variant="quiet" size="sm" loading={busy} onClick={() => register(true)}>{t('peopleRules.registerAnyway')}</Button>}>
                                {duplicate}
                            </Banner>
                        )}
                        <Summary title={t('registerFamily.review.children', { count: children.length })}>
                            {children.map((c, i) => (
                                <li key={i} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                                        <span className="truncate type-small-semibold text-ink">{nameOf(c)}</span>
                                        <span className="type-caption text-muted">
                                            {c.kind === 'new'
                                                ? [
                                                    [className(c.class_id), c.section_name].filter(Boolean).join(' ') || t('registerFamily.review.noClass'),
                                                    t('registerFamily.review.born', { date: df.date(c.dob, 'medium') }),
                                                    t('peopleRules.review.admitted', { date: df.date(c.admission_date, 'medium') }),
                                                    c.blood_group ? t('peopleRules.review.blood', { group: c.blood_group }) : null,
                                                    c.relationship ? t(`registerFamily.relationship.${c.relationship}`) : null,
                                                ].filter(Boolean).join(', ')
                                                : [t('registerFamily.review.atSchool'), c.sub, c.relationship ? t(`registerFamily.relationship.${c.relationship}`) : null].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                    {c.kind === 'new' && <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => editChild(i)}>{t('registerFamily.review.edit')}</Button>}
                                    <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => removeChild(i)} aria-label={`${t('registerFamily.review.remove')} ${nameOf(c)}`} className="text-bad">
                                        <span className="max-sm:sr-only">{t('registerFamily.review.remove')}</span>
                                    </Button>
                                </li>
                            ))}
                        </Summary>
                        <Button variant="secondary" leftIcon={Plus} onClick={addChild} className="self-start max-sm:w-full">{t('registerFamily.review.addChild')}</Button>
                        <Summary title={existingParent ? t('peopleRules.review.onRegister') : t('registerFamily.review.parent')}
                            action={<Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => { setExistingParent(null); setStep(1); }}>{existingParent ? t('addChild.change') : t('registerFamily.review.edit')}</Button>}>
                            {existingParent ? (
                                <li className="flex items-center gap-3 py-1">
                                    <IconTile icon={Phone} tone="brand" size={34} />
                                    <div className="flex min-w-0 flex-col gap-px">
                                        <span className="truncate type-small-semibold text-ink">{fullName(existingParent)}</span>
                                        <span className="type-caption text-muted">{[parentContact(existingParent), t('peopleRules.review.noNewAccount')].filter(Boolean).join(' · ')}</span>
                                    </div>
                                </li>
                            ) : (
                            <li className="flex items-center gap-3 py-1">
                                <IconTile icon={Phone} tone="brand" size={34} />
                                <div className="flex min-w-0 flex-col gap-px">
                                    <span className="truncate type-small-semibold text-ink">{draftName}</span>
                                    <span className="type-caption text-muted">
                                        {[`+977-${mobileDigits(parent.phone)}`, parent.email, parent.occupation, parent.national_id,
                                            [parent.address_line, parent.city, parent.state].map((x) => x.trim()).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                            </li>
                            )}
                        </Summary>
                    </>
                )}
            </Dialog>
        </>
    );
}

/** Figma "Summary/…": a quiet box with a heading and an optional action. */
function Summary({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-1 rounded-row border border-line-subtle bg-surface-2 px-4 py-3">
            <div className="flex min-h-[34px] items-center justify-between gap-2">
                <h3 className="type-small-semibold text-ink">{title}</h3>
                {action}
            </div>
            <ul className="flex flex-col">{children}</ul>
        </section>
    );
}
