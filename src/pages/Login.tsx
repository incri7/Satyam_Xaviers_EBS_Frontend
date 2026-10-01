import { useState, type BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, Mail } from 'lucide-react';

import { Banner, Button, Checkbox, IconTile, PasswordField, TextField } from '../design-system';
import { AuthLayout } from '../features/auth/AuthLayout';
import { AccountSafetyCard, AudienceChip } from '../features/auth/SignInPanel';
import { getSignInError, type SignInError } from '../features/auth/signInError';
import { getRememberMe, setRememberMe } from '../store/authStorage';
import { useAuth } from '../hooks/useAuth';
import { requestFCMToken, deviceService } from '../api/services/device.service';
import { homeForRole } from '../utils/roleHome';

interface SignInValues {
    email: string;
    password: string;
    remember: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Figma: A01 Sign in. */
const LoginPage = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    // Back to where sign-in was asked for (a family link); a path in this app only.
    const next = params.get('next');
    const back = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
    const [serverError, setServerError] = useState<SignInError | null>(null);

    const {
        register,
        handleSubmit,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ defaultValues: { email: '', password: '', remember: getRememberMe() } });

    const shake = (form: HTMLFormElement | null) => {
        if (!form || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        form.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
            { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
    };

    const onSubmit = async (values: SignInValues, event?: BaseSyntheticEvent) => {
        setServerError(null);
        // Decides where the session is stored (see store/authStorage), so it
        // must be set before login() writes the tokens.
        setRememberMe(values.remember);
        try {
            const response = await login({ email: values.email.trim(), password: values.password });

            // Push notifications are a bonus; never block sign-in on them.
            requestFCMToken().then((token) => {
                if (token) deviceService.registerToken(token).catch(() => {});
            });

            navigate(response.user.must_change_password === true ? '/reset-password' : back ?? homeForRole(response.user.role));
        } catch (err) {
            const e = getSignInError(err, t);
            setServerError(e);
            shake(event?.target instanceof HTMLFormElement ? event.target : null);
            if (e.field === 'password') setFocus('password');
        }
    };

    // Once the person starts correcting their input, the old failure is stale.
    const clearServerError = () => { if (serverError) setServerError(null); };

    const passwordError = errors.password?.message ?? (serverError?.field === 'password' ? t('auth.errors.passwordHint') : undefined);

    return (
        <AuthLayout panelFooter={<AccountSafetyCard />} chip={<AudienceChip />}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 lg:gap-[18px]">
                <div className="flex flex-col gap-1.5">
                    <h1 className="type-h2 text-ink lg:type-h1">{t('auth.title')}</h1>
                    <p className="type-body text-muted">{t('auth.subtitle')}</p>
                </div>

                {serverError && (
                    <Banner tone="bad" title={serverError.title}>
                        {serverError.body}
                    </Banner>
                )}

                <TextField
                    label={t('auth.email')}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    leftIcon={Mail}
                    placeholder={t('auth.emailPlaceholder')}
                    disabled={isSubmitting}
                    error={errors.email?.message}
                    {...register('email', {
                        required: t('auth.validation.emailRequired'),
                        pattern: { value: EMAIL_PATTERN, message: t('auth.validation.emailInvalid') },
                        onChange: clearServerError,
                    })}
                />

                <PasswordField
                    label={t('auth.password')}
                    autoComplete="current-password"
                    placeholder={t('auth.passwordPlaceholder')}
                    disabled={isSubmitting}
                    error={passwordError}
                    showLabel={t('auth.showPassword')}
                    hideLabel={t('auth.hidePassword')}
                    capsLockMessage={t('auth.capsLockOn')}
                    labelAction={
                        <Link
                            to="/forgot-password"
                            className="rounded-sm type-small-semibold text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60"
                        >
                            {t('auth.forgotPassword')}
                        </Link>
                    }
                    {...register('password', { required: t('auth.validation.passwordRequired'), onChange: clearServerError })}
                />

                <Checkbox label={t('auth.keepSignedIn')} disabled={isSubmitting} {...register('remember')} />

                <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                    {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
                </Button>

                <hr className="border-line-subtle" />

                <div className="flex items-start gap-3 rounded-row bg-sunken px-3.5 py-3">
                    <IconTile icon={Info} tone="brand" size={32} />
                    <div className="min-w-0">
                        <p className="type-small-semibold text-ink">{t('auth.firstTime.title')}</p>
                        <p className="type-small text-muted">{t('auth.firstTime.body')}</p>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
