import { useState, type FormEvent, type ReactNode } from 'react';
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
import { academicsService } from '../../api/services/academics.service';
import type { Student, StudentCreate } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatISODate } from '../../utils/nepaliDate';
import { errorText, fullName, studentWithGuardians } from '../../features/people/format';
import { StudentPicker } from '../../features/people/StudentPicker';
import { bloodGroupOptions, genderOptions } from '../../features/people/options';

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
    relationship: Relationship;
}
type ChildEntry = ({ kind: 'new' } & ChildDraft) | ExistingChild;

const firstOf = (c: ChildEntry) => (c.kind === 'new' ? c.first_name : c.name.split(' ')[0]);

interface ChildDraft {
    first_name: string;
    middle_name: string;
    last_name: string;
    dob: string;
    gender: string;
    blood_group: string;
    class_id: string;
    admission_date: string;
    relationship: Relationship;
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

// The backend's rule for names (app/schemas: letters, spaces, ' . -; 2+).
const NAME = /^[A-Za-z\s'.-]{2,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyChild = (): ChildDraft => ({
    first_name: '', middle_name: '', last_name: '', dob: '', gender: '', blood_group: '', class_id: '',
    admission_date: formatISODate(new Date()), relationship: 'father',
});
const emptyParent: ParentDraft = { first_name: '', last_name: '', occupation: '', phone: '', email: '', national_id: '', address_line: '', city: '', state: '' };

/** 10 digits, or + and up to 15 (the rule the old form used). */
const validPhone = (v: string) => {
    const digits = v.replace(/[\s-]/g, '');
    return digits.startsWith('+') ? /^\+\d{7,15}$/.test(digits) : /^\d{10}$/.test(digits);
};

const fourYearsAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 4);
    return formatISODate(d);
};

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
    const startChildren = (): ChildEntry[] => (withStudent ? [{ kind: 'existing', id: withStudent.id, name: withStudent.name, sub: withStudent.sub, relationship: 'guardian' }] : []);
    const [step, setStep] = useState<0 | 1 | 2 | 'done'>(withStudent ? 1 : 0);
    const [children, setChildren] = useState<ChildEntry[]>(startChildren);
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [picked, setPicked] = useState<Student | null>(null);
    const [pickError, setPickError] = useState<string | undefined>();
    const [editing, setEditing] = useState<number | null>(null);
    const [parent, setParent] = useState<ParentDraft>(emptyParent);
    const [error, setError] = useState<string | null>(null);

    const childForm = useForm<ChildDraft>({ defaultValues: emptyChild() });
    const parentForm = useForm<ParentDraft>({ defaultValues: emptyParent });
    const dobValue = useWatch({ control: childForm.control, name: 'dob' });
    const admittedValue = useWatch({ control: childForm.control, name: 'admission_date' });
    const childFirstName = useWatch({ control: childForm.control, name: 'first_name' });

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        enabled: isOpen,
    });
    const classes = classesData?.classes ?? [];
    const className = (id: string) => classes.find((c) => String(c.id) === id)?.name;

    const reset = () => {
        setStep(withStudent ? 1 : 0);
        setChildren(startChildren());
        setMode('new');
        setPicked(null);
        setPickError(undefined);
        setEditing(null);
        setParent(emptyParent);
        setError(null);
        childForm.reset(emptyChild());
        parentForm.reset(emptyParent);
    };
    const close = () => { reset(); onClose(); };

    const mutation = useMutation({
        mutationFn: () => {
            const payload = {
                user_in: { email: parent.email.trim(), phone: parent.phone.replace(/[\s-]/g, '') },
                parent_in: {
                    first_name: parent.first_name.trim(),
                    last_name: parent.last_name.trim(),
                    occupation: parent.occupation || undefined,
                    national_id: parent.national_id || undefined,
                    address_line: parent.address_line || undefined,
                    city: parent.city || undefined,
                    state: parent.state || undefined,
                    // Kept on the parent record too, so a guardian is reachable
                    // even before they sign in.
                    phone: parent.phone.replace(/[\s-]/g, ''),
                    email: parent.email.trim(),
                },
                existing_students: children.flatMap((c) => (c.kind === 'existing' ? [{ student_id: c.id, relationship_type: c.relationship }] : [])),
                students_in: children.flatMap((c) => (c.kind === 'new' ? [c] : [])).map((c): StudentCreate => ({
                    first_name: c.first_name.trim(),
                    middle_name: c.middle_name || undefined,
                    last_name: c.last_name.trim(),
                    dob: c.dob,
                    gender: c.gender,
                    blood_group: c.blood_group || undefined,
                    admission_date: c.admission_date,
                    class_id: c.class_id ? Number(c.class_id) : undefined,
                    relationship_type: c.relationship,
                    is_primary_contact: true,
                    city: parent.city || undefined,
                    state: parent.state || undefined,
                })),
            };
            return peopleService.registerParentStudent(payload);
        },
        onSuccess: () => {
            ['students', 'parents', 'users'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            queryClient.invalidateQueries({ queryKey: ['people-count'] });
            setStep('done');
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    // ---- step actions -------------------------------------------------
    const saveNewChild = childForm.handleSubmit((draft) => {
        const entry: ChildEntry = { kind: 'new', ...draft };
        const next = editing === null ? [...children, entry] : children.map((c, i) => (i === editing ? entry : c));
        setChildren(next);
        setEditing(null);
        // A second child, or an edit, goes straight back to the review.
        setStep(parent.first_name ? 2 : 1);
    });
    const saveChild = (e: FormEvent<HTMLFormElement>) => {
        if (mode === 'new' || editing !== null) return void saveNewChild(e);
        e.preventDefault();
        if (!picked) { setPickError(t('registerFamily.error.pickStudent')); return; }
        setChildren([...children, { kind: 'existing', id: picked.id, name: fullName(picked), sub: studentWithGuardians(picked), relationship: 'guardian' }]);
        setPicked(null);
        setPickError(undefined);
        setStep(parent.first_name ? 2 : 1);
    };

    const saveParent = parentForm.handleSubmit((draft) => {
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

    const firstChildName = (children[0] && firstOf(children[0])) || childFirstName;
    const busy = mutation.isPending;
    const opt = t('peopleForms.optional');
    const ce = childForm.formState.errors;
    const pe = parentForm.formState.errors;

    // ---- done ---------------------------------------------------------
    if (step === 'done') {
        return (
            <Dialog
                open={isOpen}
                onClose={close}
                icon={CheckCircle2}
                iconTone="ok"
                title={t('registerFamily.done.title')}
                subtitle={t('registerFamily.done.body', { name: `${parent.first_name} ${parent.last_name}`.trim(), email: parent.email })}
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
                ? children.length > 1 ? t('registerFamily.subtitle.parentMany') : t('registerFamily.subtitle.parent', { name: firstChildName })
                : t('registerFamily.subtitle.review');

    const footer =
        step === 0 ? (
            <>
                {children.length > 0 && parent.first_name ? (
                    <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => { setEditing(null); setStep(2); }} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                ) : (
                    <Button variant="quiet" onClick={close} className="sm:mr-auto">{t('registerFamily.action.cancel')}</Button>
                )}
                <Button type="submit">{parent.first_name ? t('registerFamily.action.saveChild') : t('registerFamily.action.continueParent')}</Button>
            </>
        ) : step === 1 ? (
            <>
                {parent.first_name || !withStudent ? (
                    <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => setStep(parent.first_name ? 2 : 0)} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                ) : (
                    <Button variant="quiet" onClick={close} className="sm:mr-auto">{t('registerFamily.action.cancel')}</Button>
                )}
                <Button type="submit">{t('registerFamily.action.continueReview')}</Button>
            </>
        ) : (
            <>
                <Button variant="quiet" leftIcon={ArrowLeft} onClick={() => setStep(1)} disabled={busy} className="sm:mr-auto">{t('registerFamily.action.back')}</Button>
                <Button leftIcon={UserPlus} loading={busy} onClick={() => { setError(null); mutation.mutate(); }}>
                    {busy ? t('registerFamily.action.registering') : t('registerFamily.action.register')}
                </Button>
            </>
        );

    return (
        <Dialog
            open={isOpen}
            onClose={close}
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
            onSubmit={step === 0 ? saveChild : step === 1 ? saveParent : undefined}
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
                        <TextField label={t('peopleForms.label.firstName')} autoComplete="off" error={ce.first_name?.message}
                            {...childForm.register('first_name', { required: t('registerFamily.error.firstName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                        <TextField label={t('peopleForms.label.middleName')} optional={opt} autoComplete="off" {...childForm.register('middle_name')} />
                    </FormRow>
                    <FormRow>
                        <TextField label={t('peopleForms.label.lastName')} autoComplete="off" error={ce.last_name?.message}
                            {...childForm.register('last_name', { required: t('registerFamily.error.lastName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                        <TextField type="date" max={fourYearsAgo()} label={t('peopleForms.label.dob')} error={ce.dob?.message}
                            hint={dobValue ? df.date(dobValue, 'medium') : undefined}
                            {...childForm.register('dob', { required: t('registerFamily.error.dob'), validate: (v) => v <= fourYearsAgo() || t('registerFamily.error.tooYoung') })} />
                    </FormRow>
                    <FormRow>
                        <SelectField label={t('peopleForms.label.gender')} placeholder={t('peopleForms.choose')} options={genderOptions(t)} error={ce.gender?.message}
                            {...childForm.register('gender', { required: t('registerFamily.error.gender') })} />
                        <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...childForm.register('blood_group')} />
                    </FormRow>
                    <FormRow>
                        <SelectField label={t('registerFamily.field.class')} optional={opt} hint={t('registerFamily.hint.class')} placeholder={t('peopleForms.choose')}
                            options={classes.map((c) => ({ value: String(c.id), label: c.name }))} {...childForm.register('class_id')} />
                        <TextField type="date" label={t('peopleForms.label.admissionDate')} error={ce.admission_date?.message}
                            hint={admittedValue ? df.date(admittedValue, 'medium') : undefined}
                            {...childForm.register('admission_date', { required: t('registerFamily.error.admissionDate') })} />
                    </FormRow>
                </>
            )}

            {step === 1 && (
                <>
                    {children.map((c, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <p className="type-small-semibold text-ink">{t('registerFamily.field.relationshipTo', { name: firstOf(c) })}</p>
                            <SegmentedControl<Relationship>
                                aria-label={t('registerFamily.field.relationshipTo', { name: firstOf(c) })}
                                value={c.relationship}
                                onChange={(r) => setRelationship(i, r)}
                                className="w-full [&>*]:flex-1"
                                options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`registerFamily.relationship.${r}`) }))}
                            />
                        </div>
                    ))}
                    <FormRow>
                        <TextField label={t('peopleForms.label.firstName')} autoComplete="off" error={pe.first_name?.message}
                            {...parentForm.register('first_name', { required: t('registerFamily.error.firstName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                        <TextField label={t('peopleForms.label.lastName')} autoComplete="off" error={pe.last_name?.message}
                            {...parentForm.register('last_name', { required: t('registerFamily.error.lastName'), pattern: { value: NAME, message: t('registerFamily.error.name') } })} />
                    </FormRow>
                    <FormRow>
                        <TextField type="tel" inputMode="tel" leftIcon={Phone} label={t('registerFamily.field.mobile')} placeholder="98XXXXXXXX" hint={t('registerFamily.hint.mobile')} error={pe.phone?.message}
                            {...parentForm.register('phone', { required: t('registerFamily.error.mobile'), validate: (v) => validPhone(v) || t('registerFamily.error.mobile') })} />
                        <TextField type="email" inputMode="email" autoCapitalize="none" leftIcon={Mail} label={t('registerFamily.field.email')} hint={t('registerFamily.hint.email')} error={pe.email?.message}
                            {...parentForm.register('email', { required: t('registerFamily.error.email'), pattern: { value: EMAIL, message: t('registerFamily.error.emailInvalid') } })} />
                    </FormRow>
                    <FormRow>
                        <TextField label={t('peopleForms.label.occupation')} optional={opt} {...parentForm.register('occupation')} />
                        <TextField label={t('peopleForms.label.nationalId')} optional={opt} {...parentForm.register('national_id')} />
                    </FormRow>
                    <TextField label={t('peopleForms.label.address')} optional={opt} {...parentForm.register('address_line')} />
                    <FormRow>
                        <TextField label={t('peopleForms.label.city')} optional={opt} {...parentForm.register('city')} />
                        <TextField label={t('peopleForms.label.state')} optional={opt} {...parentForm.register('state')} />
                    </FormRow>
                    <Banner tone="info" title={t('registerFamily.accountNote.title')}>{t('registerFamily.accountNote.body')}</Banner>
                </>
            )}

            {step === 2 && (
                <>
                    {error && (
                        <Banner tone="bad" title={t('registerFamily.error.title')} action={<Button variant="quiet" size="sm" onClick={() => setStep(1)}>{t('registerFamily.review.edit')}</Button>}>
                            {error}
                        </Banner>
                    )}
                    <Summary title={t('registerFamily.review.children', { count: children.length })}>
                        {children.map((c, i) => (
                            <li key={i} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                                <div className="flex min-w-0 flex-1 flex-col gap-px">
                                    <span className="truncate type-small-semibold text-ink">{c.kind === 'new' ? [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ') : c.name}</span>
                                    <span className="truncate type-caption text-muted">
                                        {c.kind === 'new'
                                            ? [className(c.class_id) ?? t('registerFamily.review.noClass'), t('registerFamily.review.born', { date: df.date(c.dob, 'medium') }), t(`registerFamily.relationship.${c.relationship}`)].join(', ')
                                            : [t('registerFamily.review.atSchool'), c.sub, t(`registerFamily.relationship.${c.relationship}`)].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                                {c.kind === 'new' && <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => editChild(i)}>{t('registerFamily.review.edit')}</Button>}
                                <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => removeChild(i)} aria-label={`${t('registerFamily.review.remove')} ${firstOf(c)}`} className="text-bad">
                                    <span className="max-sm:sr-only">{t('registerFamily.review.remove')}</span>
                                </Button>
                            </li>
                        ))}
                    </Summary>
                    <Button variant="secondary" leftIcon={Plus} onClick={addChild} className="self-start max-sm:w-full">{t('registerFamily.review.addChild')}</Button>
                    <Summary title={t('registerFamily.review.parent')} action={<Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => setStep(1)}>{t('registerFamily.review.edit')}</Button>}>
                        <li className="flex items-center gap-3 py-1">
                            <IconTile icon={Phone} tone="brand" size={34} />
                            <div className="flex min-w-0 flex-col gap-px">
                                <span className="truncate type-small-semibold text-ink">{`${parent.first_name} ${parent.last_name}`.trim()}</span>
                                <span className="truncate type-caption text-muted">{[parent.phone, parent.email, parent.occupation].filter(Boolean).join(', ')}</span>
                            </div>
                        </li>
                    </Summary>
                </>
            )}
        </Dialog>
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
