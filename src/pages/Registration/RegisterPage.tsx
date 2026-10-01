import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { ArrowRight, BellRing, Check, CheckCircle2, Link2, Loader2, Phone, Smartphone, XCircle } from 'lucide-react';

import { Avatar, Banner, Button, PasswordField, TextField } from '../../design-system';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { PasswordStrength } from '../../features/auth/PasswordStrength';
import { PASSWORD_MAX, checkPassword } from '../../features/auth/passwordRules';
import { registrationService, type TokenInfo } from '../../api/services/registration.service';
import { errorText } from '../../features/people/format';
import { useAuthStore } from '../../store/useAuthStore';

interface Values {
    first_name: string;
    last_name: string;
    phone: string;
    password: string;
    confirm: string;
}

/** A Nepali mobile: 10 digits starting 96, 97 or 98 (the server checks the same). */
const MOBILE = /^9[678]\d{8}$/;
const digitsOnly = (v: string) => v.replace(/[\s-]/g, '').replace(/^\+?977/, '');

/**
 * Figma A04 Parent registration, opened from the SMS link. Checks the link,
 * then a short form; on success the parent is signed in and sees a summary
 * with "Open the app". Mobile first: most parents arrive on a phone.
 */
export default function RegisterPage() {
    const { token } = useParams<{ token: string }>();
    const { t } = useTranslation();
    const info = useQuery({
        queryKey: ['register-token', token],
        queryFn: () => registrationService.getTokenInfo(token!),
        enabled: !!token,
        retry: false,
    });
    const [done, setDone] = useState<{ phone: string; name: string } | null>(null);
    const status = isAxiosError(info.error) ? info.error.response?.status : undefined;
    const deadLink = status === 404 || status === 410;
    const child = info.data?.student_name.split(' ')[0];
    // A parent already signed in (a brother or sister is at the school) adds
    // this child to their account; registering again would clash on the number.
    const signedInParent = useAuthStore((s) => s.isAuthenticated && s.user?.role === 'parent');

    return (
        <AuthLayout compactBand purpose={t('register.purpose')} panelFooter={<MorningProof child={child} />}>
            {info.isPending ? (
                <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
                    <Loader2 size={32} className="animate-spin text-primary-text" aria-hidden />
                    <h1 className="type-h3 text-ink">{t('register.checking')}</h1>
                    <p className="type-body text-muted">{t('register.checkingBody')}</p>
                </div>
            ) : info.isError ? (
                <LinkProblem dead={deadLink} onRetry={() => void info.refetch()} />
            ) : done ? (
                <Ready info={info.data} phone={done.phone} name={done.name} />
            ) : signedInParent ? (
                <ClaimChild token={token!} info={info.data} />
            ) : (
                <RegisterForm token={token!} info={info.data} onDone={setDone} />
            )}
        </AuthLayout>
    );
}

function RegisterForm({ token, info, onDone }: { token: string; info: TokenInfo; onDone: (v: { phone: string; name: string }) => void }) {
    const { t } = useTranslation();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [banner, setBanner] = useState<string | null>(null);
    const [taken, setTaken] = useState(false);
    const { register, handleSubmit, control, getValues, trigger, setError, formState: { errors, isSubmitting } } = useForm<Values>({
        defaultValues: { first_name: '', last_name: '', phone: '', password: '', confirm: '' },
    });
    const [first, last, password, confirm, phone] = useWatch({ control, name: ['first_name', 'last_name', 'password', 'confirm', 'phone'] });
    const check = checkPassword(password, { firstName: first, lastName: last });
    const matches = confirm.length > 0 && confirm === password && !errors.confirm;
    const phoneOk = MOBILE.test(digitsOnly(phone)) && !errors.phone;
    const childLine = [info.student_name, [info.class_name, info.section_name].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const fieldCopy = { showLabel: t('auth.showPassword'), hideLabel: t('auth.hidePassword'), capsLockMessage: t('auth.capsLockOn') };

    const onSubmit = async (v: Values) => {
        setBanner(null);
        const mobile = digitsOnly(v.phone);
        try {
            const res = await registrationService.completeRegistration(token, {
                phone: mobile, password: v.password,
                first_name: v.first_name.trim() || undefined, last_name: v.last_name.trim() || undefined,
            });
            const now = new Date().toISOString();
            setAuth(
                { id: res.user_id, email: '', phone: mobile, role: res.role, is_active: true, must_change_password: false, created_at: now, updated_at: now },
                res.access_token, res.refresh_token,
            );
            onDone({ phone: mobile, name: `${v.first_name} ${v.last_name}`.trim() });
        } catch (err) {
            const code = isAxiosError(err) ? err.response?.status : undefined;
            const detail = isAxiosError(err) ? JSON.stringify(err.response?.data ?? '') : '';
            if (code === 409 || (code === 400 && /phone/i.test(detail))) {
                setError('phone', { message: t('register.phoneTaken') }, { shouldFocus: true });
                setTaken(true);
            }
            else if (code === 422 && /phone/i.test(detail)) setError('phone', { message: t('register.phoneInvalid') }, { shouldFocus: true });
            else if (code === 422 && /password/i.test(detail)) setError('password', { message: t('auth.setPassword.validation.newInvalid') }, { shouldFocus: true });
            else if (code === 404 || code === 410) setBanner(t('register.linkUsedBody'));
            else setBanner(errorText(err, t('register.registerFailed')));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 lg:gap-[18px]">
            <div className="flex flex-col gap-1.5">
                <h1 className="type-h2 text-ink lg:type-h1">{t('register.title')}</h1>
                <p className="type-body text-muted">{t('register.subtitle')}</p>
            </div>

            <div className="flex items-center gap-3 rounded-row bg-primary-soft px-3.5 py-3 ring-1 ring-inset ring-primary-soft-line">
                <Avatar name={info.student_name} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-caption text-muted">{t('register.registeringAs')}</p>
                    <p className="type-body-semibold text-ink">{childLine}</p>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-ok" aria-hidden />
            </div>

            {banner && <Banner tone="bad" title={t('register.registerFailed')}>{banner}</Banner>}
            {taken && (
                <Banner tone="info" title={t('register.takenTitle')}
                    action={<Link to={`/login?next=${encodeURIComponent(`/register/${token}`)}`} className="rounded-sm type-small-semibold text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60">{t('register.signIn')}</Link>}>
                    {t('register.takenBody', { child: info.student_name.split(' ')[0] })}
                </Banner>
            )}

            <div className="grid grid-cols-2 gap-3">
                <TextField label={t('register.firstName')} placeholder={t('register.optional')} autoComplete="given-name" maxLength={100}
                    disabled={isSubmitting} {...register('first_name')} />
                <TextField label={t('register.lastName')} placeholder={t('register.optional')} autoComplete="family-name" maxLength={100}
                    disabled={isSubmitting} {...register('last_name')} />
            </div>

            <TextField label={t('register.phoneNumber')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98XXXXXXXX"
                leftIcon={Phone} hint={t('register.phoneHint')} disabled={isSubmitting}
                error={errors.phone?.message} success={phoneOk ? t('register.phoneLooksRight') : undefined}
                {...register('phone', {
                    required: t('register.phoneRequired'),
                    validate: (value) => MOBILE.test(digitsOnly(value)) || t('register.phoneInvalid'),
                })} />

            <div className="flex flex-col gap-2.5">
                <PasswordField {...fieldCopy} label={t('register.password')} autoComplete="new-password" maxLength={PASSWORD_MAX}
                    placeholder={t('register.minPassword')} disabled={isSubmitting} error={errors.password?.message}
                    {...register('password', {
                        validate: (value) => checkPassword(value, { firstName: getValues('first_name'), lastName: getValues('last_name') }).valid || t('auth.setPassword.validation.newInvalid'),
                        onChange: () => { if (errors.confirm) void trigger('confirm'); },
                    })} />
                <PasswordStrength check={check} />
            </div>

            <PasswordField {...fieldCopy} label={t('register.confirmPassword')} autoComplete="new-password" maxLength={PASSWORD_MAX}
                placeholder={t('register.repeatPassword')} disabled={isSubmitting} error={errors.confirm?.message}
                success={matches ? t('auth.setPassword.match') : undefined}
                {...register('confirm', {
                    required: t('auth.setPassword.validation.confirmRequired'),
                    validate: (value) => value === getValues('password') || t('auth.setPassword.mismatch'),
                    onBlur: (e) => { if (e.target.value) void trigger('confirm'); },
                })} />

            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                {isSubmitting ? t('register.creating') : t('register.createAccount')}
            </Button>
            <p className="text-center type-caption text-muted">{t('register.privacy', { name: info.student_name.split(' ')[0] })}</p>
        </form>
    );
}

function Ready({ info, phone, name }: { info: TokenInfo; phone: string; name: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const child = info.student_name.split(' ')[0];
    const facts: [string, string][] = [
        [t('register.fact.child'), [info.student_name, [info.class_name, info.section_name].filter(Boolean).join(' ')].filter(Boolean).join(', ')],
        [t('register.fact.phone'), phone],
        [t('register.fact.language'), t('register.fact.languageValue')],
    ];
    return (
        <div className="flex flex-col gap-4 lg:gap-[18px]">
            <span className="grid size-16 animate-pop place-items-center rounded-[20px] bg-ok-soft text-ok"><CheckCircle2 size={32} aria-hidden /></span>
            <div className="flex flex-col gap-1.5">
                <h1 className="type-h2 text-ink lg:type-h1">{t('register.readyTitle')}</h1>
                <p className="type-body text-muted">{name ? t('register.readyBodyNamed', { name, child }) : t('register.readyBody', { child })}</p>
            </div>
            <dl className="flex flex-col gap-2.5 rounded-row bg-sunken px-4 py-3.5">
                {facts.map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3">
                        <dt className="w-[116px] shrink-0 type-small text-muted">{k}</dt>
                        <dd className="min-w-0 flex-1 type-small-semibold text-ink">{v}</dd>
                    </div>
                ))}
            </dl>
            <Button size="lg" fullWidth rightIcon={ArrowRight} onClick={() => navigate('/home/parent', { replace: true })}>{t('register.openApp')}</Button>
            <p className="flex items-start gap-2.5 type-small text-muted"><Smartphone size={18} className="shrink-0" aria-hidden />{t('register.tip')}</p>
        </div>
    );
}

/** Signed in as a parent: one tap adds the child to the account. */
function ClaimChild({ token, info }: { token: string; info: TokenInfo }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const child = info.student_name.split(' ')[0];
    const childLine = [info.student_name, [info.class_name, info.section_name].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const claim = useMutation({
        mutationFn: () => registrationService.claimChild(token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent'] }),
    });

    if (claim.isSuccess) {
        return (
            <div className="flex flex-col gap-4 lg:gap-[18px]">
                <span className="grid size-16 animate-pop place-items-center rounded-[20px] bg-ok-soft text-ok"><CheckCircle2 size={32} aria-hidden /></span>
                <div className="flex flex-col gap-1.5">
                    <h1 className="type-h2 text-ink lg:type-h1">{claim.data.already_linked ? t('register.claim.alreadyTitle', { child }) : t('register.claim.doneTitle', { child })}</h1>
                    <p className="type-body text-muted">{t('register.claim.doneBody', { child })}</p>
                </div>
                <Button size="lg" fullWidth rightIcon={ArrowRight} onClick={() => navigate('/home/parent', { replace: true })}>{t('register.openApp')}</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 lg:gap-[18px]">
            <div className="flex flex-col gap-1.5">
                <h1 className="type-h2 text-ink lg:type-h1">{t('register.claim.title', { child })}</h1>
                <p className="type-body text-muted">{t('register.claim.body')}</p>
            </div>
            <div className="flex items-center gap-3 rounded-row bg-primary-soft px-3.5 py-3 ring-1 ring-inset ring-primary-soft-line">
                <Avatar name={info.student_name} size={40} />
                <p className="min-w-0 flex-1 type-body-semibold text-ink">{childLine}</p>
            </div>
            {claim.isError && <Banner tone="bad" title={t('register.claim.failed')}>{errorText(claim.error, t('register.registerFailed'))}</Banner>}
            <Button size="lg" fullWidth leftIcon={Link2} loading={claim.isPending} onClick={() => claim.mutate()}>{t('register.claim.action', { child })}</Button>
            <p className="text-center type-caption text-muted">{t('register.claim.notYou')}</p>
        </div>
    );
}

function LinkProblem({ dead, onRetry }: { dead: boolean; onRetry: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-4 lg:gap-[18px]">
            <span className="grid size-[60px] place-items-center rounded-[20px] bg-bad-soft text-bad"><XCircle size={30} aria-hidden /></span>
            <div className="flex flex-col gap-1.5">
                <h1 className="type-h2 text-ink lg:type-h1">{dead ? t('register.linkUsedTitle') : t('register.linkErrorTitle')}</h1>
                <p className="type-body text-muted">{dead ? t('register.linkUsedBody') : t('register.linkErrorBody')}</p>
            </div>
            {!dead && <Button size="lg" fullWidth variant="quiet" onClick={onRetry}>{t('classesPage.action.retry')}</Button>}
            <p className="text-center type-small text-muted">
                {t('register.alreadySetUp')}{' '}
                <Link to="/login" className="rounded-sm type-small-semibold text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60">{t('register.signIn')}</Link>
            </p>
        </div>
    );
}

/** Laptop brand panel: what the parent will see each morning. No real data. */
function MorningProof({ child }: { child?: string }) {
    const { t } = useTranslation();
    return (
        <section className="flex flex-col gap-3 rounded-[18px] bg-white/10 px-[18px] py-4 ring-1 ring-inset ring-white/18">
            <p className="type-micro-bold uppercase tracking-wide text-white/70">{t('register.proof.chip')}</p>
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#5FD3A2]/22"><Check size={20} className="text-[#9BE8C6]" aria-hidden /></span>
                <div className="flex min-w-0 flex-col">
                    <p className="type-h3 text-white">{t('register.proof.present')}</p>
                    <p className="type-small text-white/78">{t('register.proof.markedAt', { child: child ?? t('register.proof.yourChild') })}</p>
                </div>
            </div>
            <p className="flex items-start gap-2 type-small text-white/86"><BellRing size={14} className="mt-0.5 shrink-0" aria-hidden />{t('register.proof.note')}</p>
        </section>
    );
}
