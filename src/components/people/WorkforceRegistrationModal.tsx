import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Copy, KeyRound, Mail, Phone, ShieldAlert, UserPlus } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, FormSection, SelectField, TextField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { StaffUnifiedCreate, TeacherUnifiedCreate, UserRegistrationCreate } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { errorText } from '../../features/people/format';
import { bloodGroupOptions, genderOptions, withoutBlanks } from '../../features/people/options';

interface WorkforceRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRole?: string;
    onSuccess?: () => void;
}

const ROLES = ['admin', 'principal', 'accountant', 'coordinator', 'teacher', 'staff'];
// Elevated roles: only an administrator may create them.
const ELEVATED = new Set(['admin', 'principal']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountForm {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    // Teacher or staff record
    staff_code: string;
    designation: string;
    join_date: string;
    dob: string;
    gender: string;
    blood_group: string;
    qualification: string;
    experience_years: string;
    address_line: string;
    city: string;
    state: string;
}

const blank = (role: string): AccountForm => ({
    first_name: '', last_name: '', email: '', phone: '', password: '', role,
    staff_code: '', designation: '', join_date: '', dob: '', gender: '', blood_group: '',
    qualification: '', experience_years: '', address_line: '', city: '', state: '',
});

/**
 * Create a sign-in account (POST /people/register/user). Teachers and staff
 * get their staff record in the same request. The temporary password is
 * shown once at the end, because the admin has to pass it on.
 */
export function WorkforceRegistrationModal({ isOpen, onClose, initialRole, onSuccess }: WorkforceRegistrationModalProps) {
    // Opened from Teachers the role is fixed in the title; from User accounts it is a choice.
    const startRole = initialRole ?? 'teacher';
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const currentRole = useAuthStore((s) => s.user?.role);
    const roles = currentRole === 'admin' ? ROLES : ROLES.filter((r) => !ELEVATED.has(r));
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const form = useForm<AccountForm>({ defaultValues: blank(startRole) });
    const { errors } = form.formState;
    const role = useWatch({ control: form.control, name: 'role' });
    const dobValue = useWatch({ control: form.control, name: 'dob' });
    const joinedValue = useWatch({ control: form.control, name: 'join_date' });
    const hasRecord = role === 'teacher' || role === 'staff';

    // The same instance opens from different tabs: start each time on that tab's role.
    const { reset } = form;
    useEffect(() => {
        if (isOpen) reset(blank(startRole));
    }, [isOpen, startRole, reset]);

    const close = () => {
        form.reset(blank(startRole));
        setError(null);
        setCreated(null);
        setCopied(false);
        onClose();
    };

    const mutation = useMutation({
        mutationFn: (v: AccountForm) => {
            const payload: UserRegistrationCreate = {
                first_name: v.first_name.trim(),
                last_name: v.last_name.trim(),
                email: v.email.trim(),
                phone: v.phone.trim(),
                role: v.role,
                ...(v.password.trim() ? { password: v.password.trim() } : {}),
            };
            const record = withoutBlanks({
                first_name: v.first_name.trim(),
                last_name: v.last_name.trim(),
                staff_code: v.staff_code,
                designation: v.designation,
                join_date: v.join_date,
                dob: v.dob,
                gender: v.gender,
                blood_group: v.blood_group,
                address_line: v.address_line,
                city: v.city,
                state: v.state,
            });
            if (v.role === 'teacher') {
                payload.teacher_in = {
                    ...record,
                    ...withoutBlanks({ qualification: v.qualification }),
                    ...(v.experience_years !== '' ? { experience_years: Number(v.experience_years) } : {}),
                } as TeacherUnifiedCreate;
            }
            if (v.role === 'staff') payload.staff_in = record as StaffUnifiedCreate;
            return peopleService.registerUser(payload);
        },
        onSuccess: (resp, v) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['people-count'] });
            if (v.role === 'teacher') queryClient.invalidateQueries({ queryKey: ['teachers'] });
            if (v.role === 'staff') queryClient.invalidateQueries({ queryKey: ['staff'] });
            const temp = (resp as { temporary_password?: string } | undefined)?.temporary_password;
            setCreated({ email: v.email.trim(), password: temp || v.password.trim() });
            onSuccess?.();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const copy = async () => {
        if (!created) return;
        try {
            await navigator.clipboard.writeText(`${t('addAccount.done.email')}: ${created.email}\n${t('addAccount.done.password')}: ${created.password}`);
            setCopied(true);
        } catch {
            /* the details stay on screen to copy by hand */
        }
    };

    const busy = mutation.isPending;
    const opt = t('peopleForms.optional');
    const bs = (v?: string) => (v ? df.date(v, 'medium') : undefined);

    // Deliberately no auto-close: the admin must read and pass on the password.
    if (created) {
        return (
            <Dialog
                open={isOpen}
                onClose={close}
                size="sm"
                icon={CheckCircle2}
                iconTone="ok"
                title={t('addAccount.done.title')}
                subtitle={t('addAccount.done.body')}
                closeLabel={t('common.close')}
                footer={
                    <>
                        <Button variant="quiet" leftIcon={copied ? Check : Copy} onClick={copy}>
                            {copied ? t('addAccount.action.copied') : t('addAccount.action.copy')}
                        </Button>
                        <Button onClick={close}>{t('addAccount.action.done')}</Button>
                    </>
                }
            >
                <dl className="flex flex-col gap-3 rounded-row border border-line-subtle bg-surface-2 px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                        <dt className="type-caption text-muted">{t('addAccount.done.email')}</dt>
                        <dd className="break-all type-body-semibold text-ink">{created.email}</dd>
                    </div>
                    {created.password && (
                        <div className="flex flex-col gap-0.5">
                            <dt className="type-caption text-muted">{t('addAccount.done.password')}</dt>
                            <dd className="font-mono text-lg font-bold tracking-wide text-primary-text">{created.password}</dd>
                        </div>
                    )}
                </dl>
                {created.password && <Banner tone="warn" icon={ShieldAlert} title={t('addAccount.done.once')} />}
            </Dialog>
        );
    }

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={UserPlus}
            title={initialRole === 'teacher' ? t('addAccount.title.teacher') : t('addAccount.title.other')}
            subtitle={t('addAccount.subtitle')}
            closeLabel={t('common.close')}
            onSubmit={form.handleSubmit((v) => { setError(null); mutation.mutate(v); })}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('addAccount.action.cancel')}</Button>
                    <Button type="submit" leftIcon={UserPlus} loading={busy}>{busy ? t('addAccount.action.creating') : t('addAccount.action.create')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('addAccount.error.title')}>{error}</Banner>}

            <FormSection title={t('addAccount.section.account')}>
                <FormRow>
                    <TextField label={t('peopleForms.label.firstName')} autoComplete="off" error={errors.first_name?.message}
                        {...form.register('first_name', { required: t('peopleForms.error.firstName') })} />
                    <TextField label={t('peopleForms.label.lastName')} autoComplete="off" error={errors.last_name?.message}
                        {...form.register('last_name', { required: t('peopleForms.error.lastName') })} />
                </FormRow>
                <FormRow>
                    <TextField type="email" inputMode="email" autoCapitalize="none" autoComplete="off" leftIcon={Mail} label={t('peopleForms.label.email')} error={errors.email?.message}
                        {...form.register('email', { required: t('addAccount.error.email'), pattern: { value: EMAIL, message: t('addAccount.error.emailInvalid') } })} />
                    <TextField type="tel" inputMode="tel" leftIcon={Phone} label={t('peopleForms.label.phone')} placeholder="98XXXXXXXX" error={errors.phone?.message}
                        {...form.register('phone', { required: t('addAccount.error.phone') })} />
                </FormRow>
                <FormRow>
                    <SelectField label={t('addAccount.field.role')} options={roles.map((r) => ({ value: r, label: t(`shell.roles.${r}`) }))}
                        hint={currentRole !== 'admin' ? t('addAccount.roleNote') : undefined} {...form.register('role')} />
                    <TextField leftIcon={KeyRound} autoComplete="new-password" label={t('addAccount.field.password')} optional={opt} {...form.register('password')} />
                </FormRow>
                <p className="-mt-1 type-caption text-muted">{t('addAccount.field.passwordHint')}</p>
            </FormSection>

            {hasRecord && (
                <FormSection title={t(`addAccount.section.profile.${role}`)}>
                    <FormRow>
                        <TextField label={t('peopleForms.label.designation')} error={errors.designation?.message}
                            {...form.register('designation', { validate: (v) => !hasRecord || v.trim() !== '' || t('addAccount.error.designation') })} />
                        <TextField label={t('peopleForms.label.staffCode')} optional={opt} {...form.register('staff_code')} />
                    </FormRow>
                    <FormRow>
                        <TextField type="date" label={t('peopleForms.label.joinDate')} optional={opt} hint={bs(joinedValue)} {...form.register('join_date')} />
                        <TextField type="date" label={t('peopleForms.label.dob')} optional={opt} hint={bs(dobValue)} {...form.register('dob')} />
                    </FormRow>
                    <FormRow>
                        <SelectField label={t('peopleForms.label.gender')} optional={opt} placeholder={t('peopleForms.choose')} options={genderOptions(t)} {...form.register('gender')} />
                        <SelectField label={t('peopleForms.label.bloodGroup')} optional={opt} placeholder={t('peopleForms.choose')} options={bloodGroupOptions()} {...form.register('blood_group')} />
                    </FormRow>
                    {role === 'teacher' && (
                        <FormRow>
                            <TextField label={t('peopleForms.label.qualification')} optional={opt} {...form.register('qualification')} />
                            <TextField type="number" inputMode="numeric" min={0} label={t('peopleForms.label.experience')} optional={opt} {...form.register('experience_years')} />
                        </FormRow>
                    )}
                    <TextField label={t('peopleForms.label.address')} optional={opt} {...form.register('address_line')} />
                    <FormRow>
                        <TextField label={t('peopleForms.label.city')} optional={opt} {...form.register('city')} />
                        <TextField label={t('peopleForms.label.state')} optional={opt} {...form.register('state')} />
                    </FormRow>
                </FormSection>
            )}
        </Dialog>
    );
}
