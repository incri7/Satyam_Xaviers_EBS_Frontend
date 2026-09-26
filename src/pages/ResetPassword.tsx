import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Banner, Button, PasswordField } from '../design-system';
import { BackLink } from '../components/BackLink';
import { AuthLayout } from '../features/auth/AuthLayout';
import { PasswordSafetyNote } from '../features/auth/SignInPanel';
import { PasswordStrength } from '../features/auth/PasswordStrength';
import { PASSWORD_MAX, checkPassword } from '../features/auth/passwordRules';
import { getPasswordError } from '../features/auth/passwordError';
import { authService } from '../api/services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import { homeForRole } from '../utils/roleHome';

/**
 * - change: signed in, from My profile. Needs the current password.
 * - first:  signed in with the temporary password (must_change_password).
 * - token:  opened from the reset email (?token=…). Not signed in.
 */
type Mode = 'change' | 'first' | 'token';

interface PasswordValues {
    current: string;
    next: string;
    confirm: string;
}

/** Figma: A03 Set a new password. */
const ResetPasswordPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    if (!_hasHydrated) return null;
    if (!token && !isAuthenticated) return <Navigate to="/login" replace />;

    const mode: Mode = token ? 'token' : user?.must_change_password ? 'first' : 'change';

    return (
        <AuthLayout
            purpose={t('auth.setPassword.brandPurpose')}
            panelFooter={<PasswordSafetyNote />}
            compactBand
        >
            <SetPasswordForm key={mode} mode={mode} token={token} />
        </AuthLayout>
    );
};

function SetPasswordForm({ mode, token }: { mode: Mode; token: string | null }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const patchUser = useAuthStore((s) => s.patchUser);

    const [outcome, setOutcome] = useState<'form' | 'done' | 'link'>('form');
    const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);

    const {
        register,
        handleSubmit,
        control,
        getValues,
        trigger,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<PasswordValues>({ defaultValues: { current: '', next: '', confirm: '' } });

    const next = useWatch({ control, name: 'next' });
    const confirm = useWatch({ control, name: 'confirm' });
    // A reset link does not say whose account it is, so the name rule is
    // left to the server there (it still checks the email).
    const identity = mode === 'token' ? null : { email: user?.email, firstName: user?.firstName, lastName: user?.lastName };
    const check = checkPassword(next, identity);
    const matches = confirm.length > 0 && confirm === next && !errors.confirm;

    const onSubmit = async (values: PasswordValues) => {
        setBanner(null);
        try {
            if (mode === 'token' && token) {
                await authService.confirmPasswordReset({ token, new_password: values.next });
            } else {
                await authService.changePassword({
                    current_password: mode === 'change' ? values.current : null,
                    new_password: values.next,
                });
            }
        } catch (err) {
            const e = getPasswordError(err, t);
            if (e.kind === 'field') {
                setError(e.field, { type: 'server', message: e.message }, { shouldFocus: true });
            } else if (e.kind === 'link') {
                setOutcome('link');
            } else {
                setBanner({ title: e.title, body: e.body });
            }
            return;
        }

        if (mode === 'first') {
            patchUser({ must_change_password: false });
            navigate(homeForRole(user?.role), { replace: true });
            return;
        }
        setOutcome('done');
    };

    const copy = {
        change: { title: t('auth.setPassword.change.title'), subtitle: t('auth.setPassword.change.subtitle'), submit: t('auth.setPassword.change.submit') },
        first: { title: t('auth.setPassword.first.title'), subtitle: null, submit: t('auth.setPassword.first.submit') },
        token: { title: t('auth.setPassword.token.title'), subtitle: t('auth.setPassword.token.subtitle'), submit: t('auth.setPassword.token.submit') },
    }[mode];

    const backLink =
        mode === 'change' ? <BackLink to="/profile">{t('auth.setPassword.back.profile')}</BackLink>
        : mode === 'token' ? <BackLink to="/login">{t('auth.setPassword.back.signIn')}</BackLink>
        : null;

    const heading = (
        <div className="flex flex-col gap-1.5">
            <h1 className="type-h2 text-ink lg:type-h1">
                {outcome === 'done'
                    ? mode === 'token' ? t('auth.setPassword.done.resetTitle') : t('auth.setPassword.done.changedTitle')
                    : copy.title}
            </h1>
            {copy.subtitle && outcome === 'form' && <p className="type-body text-muted">{copy.subtitle}</p>}
        </div>
    );

    if (outcome === 'done') {
        return (
            <div className="flex flex-col gap-4 lg:gap-[18px]">
                {heading}
                <Banner tone="ok" title={mode === 'token' ? t('auth.setPassword.done.resetTitle') : t('auth.setPassword.done.changedTitle')}>
                    {mode === 'token' ? t('auth.setPassword.done.resetBody') : t('auth.setPassword.done.changedBody')}
                </Banner>
                {mode === 'token' ? (
                    <Button size="lg" fullWidth onClick={() => navigate('/login', { replace: true })}>
                        {t('auth.setPassword.done.signIn')}
                    </Button>
                ) : (
                    <Button size="lg" fullWidth onClick={() => navigate('/profile', { replace: true })}>
                        {t('auth.setPassword.back.profile')}
                    </Button>
                )}
            </div>
        );
    }

    if (outcome === 'link') {
        return (
            <div className="flex flex-col gap-4 lg:gap-[18px]">
                {backLink}
                {heading}
                <Banner tone="bad" title={t('auth.setPassword.errors.linkTitle')}>
                    {t('auth.setPassword.errors.linkBody')}
                </Banner>
                <Button size="lg" fullWidth onClick={() => navigate('/forgot-password')}>
                    {t('auth.setPassword.errors.linkAction')}
                </Button>
            </div>
        );
    }

    const fieldCopy = {
        showLabel: t('auth.showPassword'),
        hideLabel: t('auth.hidePassword'),
        capsLockMessage: t('auth.capsLockOn'),
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 lg:gap-[18px]">
            {backLink}
            {heading}

            {mode === 'first' && (
                <Banner tone="info" title={t('auth.setPassword.first.bannerTitle')}>
                    {t('auth.setPassword.first.bannerBody')}
                </Banner>
            )}

            {banner && (
                <Banner tone="bad" title={banner.title}>
                    {banner.body}
                </Banner>
            )}

            {/* Lets password managers file the new password under the right account. */}
            {user?.email && mode !== 'token' && (
                <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
            )}

            {mode === 'change' && (
                <PasswordField
                    {...fieldCopy}
                    label={t('auth.setPassword.current')}
                    autoComplete="current-password"
                    placeholder={t('auth.setPassword.currentPlaceholder')}
                    disabled={isSubmitting}
                    error={errors.current?.message}
                    {...register('current', { required: t('auth.setPassword.validation.currentRequired') })}
                />
            )}

            <div className="flex flex-col gap-2.5">
                <PasswordField
                    {...fieldCopy}
                    label={t('auth.setPassword.new')}
                    autoComplete="new-password"
                    maxLength={PASSWORD_MAX}
                    placeholder={t('auth.setPassword.newPlaceholder')}
                    disabled={isSubmitting}
                    error={errors.next?.message}
                    {...register('next', {
                        validate: (value) => checkPassword(value, identity).valid || t('auth.setPassword.validation.newInvalid'),
                        // A mismatch already on screen must follow edits here too.
                        onChange: () => { if (errors.confirm) void trigger('confirm'); },
                    })}
                />
                <PasswordStrength check={check} />
            </div>

            <PasswordField
                {...fieldCopy}
                label={t('auth.setPassword.confirm')}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder={t('auth.setPassword.confirmPlaceholder')}
                disabled={isSubmitting}
                error={errors.confirm?.message}
                success={matches ? t('auth.setPassword.match') : undefined}
                {...register('confirm', {
                    required: t('auth.setPassword.validation.confirmRequired'),
                    validate: (value) => value === getValues('next') || t('auth.setPassword.mismatch'),
                    // Judge the match when they leave the box, not on every key.
                    onBlur: (e) => { if (e.target.value) void trigger('confirm'); },
                })}
            />

            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                {isSubmitting ? t('auth.setPassword.saving') : copy.submit}
            </Button>
        </form>
    );
}

export default ResetPasswordPage;
