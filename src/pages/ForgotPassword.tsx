import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MailCheck, ShieldAlert } from 'lucide-react';

import { Banner, Button, TextField } from '../design-system';
import { BackLink } from '../components/BackLink';
import { AuthLayout } from '../features/auth/AuthLayout';
import { authService } from '../api/services/auth.service';
import { errorText } from '../features/people/format';

interface Values {
    email: string;
}

/**
 * Figma A02 Forgot password. The server answers the same way whether or not
 * an account uses the email, so the page cannot and does not say which: a
 * reset form that confirms addresses is a list of accounts for anyone to probe.
 */
const ForgotPasswordPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: { email: '' } });

    const onSubmit = async ({ email }: Values) => {
        setFailure(null);
        try {
            await authService.requestPasswordReset(email.trim());
            setSentTo(email.trim());
        } catch (err) {
            setFailure(errorText(err, t('forgotPage.failedBody')));
        }
    };

    return (
        <AuthLayout purpose={t('forgotPage.purpose')} compactBand
            panelFooter={
                <aside className="flex items-center gap-3.5 rounded-[18px] bg-white/10 px-[18px] py-4 ring-1 ring-inset ring-white/18">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/14" aria-hidden><ShieldAlert size={20} className="text-white" /></span>
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className="type-body-semibold text-white">{t('forgotPage.note.title')}</p>
                        <p className="type-small text-white/78">{t('forgotPage.note.body')}</p>
                    </div>
                </aside>
            }>
            <div className="flex flex-col gap-6">
                <BackLink to="/login">{t('auth.setPassword.back.signIn')}</BackLink>
                {sentTo ? (
                    <div className="flex flex-col gap-5">
                        <span className="grid size-14 place-items-center rounded-[18px] bg-ok-soft text-ok" aria-hidden><MailCheck size={28} /></span>
                        <div className="flex flex-col gap-2">
                            <h1 className="type-h2 text-ink">{t('forgotPage.sentTitle')}</h1>
                            <p className="type-body text-ink-2">{t('forgotPage.sentBody', { email: sentTo })}</p>
                        </div>
                        <ul className="flex list-disc flex-col gap-1 pl-5 type-small text-ink-2">
                            <li>{t('forgotPage.tips.spam')}</li>
                            <li>{t('forgotPage.tips.expiry')}</li>
                            <li>{t('forgotPage.tips.once')}</li>
                        </ul>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => navigate('/login')}>{t('auth.setPassword.back.signIn')}</Button>
                            <Button variant="quiet" onClick={() => setSentTo(null)}>{t('forgotPage.again')}</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <h1 className="type-h2 text-ink">{t('forgotPage.title')}</h1>
                            <p className="type-body text-ink-2">{t('forgotPage.subtitle')}</p>
                        </div>
                        {failure && <Banner tone="bad" title={t('forgotPage.failed')}>{failure}</Banner>}
                        <TextField label={t('auth.email')} type="email" autoComplete="email" inputMode="email" leftIcon={Mail} autoFocus
                            placeholder={t('auth.emailPlaceholder')} error={errors.email?.message}
                            {...register('email', {
                                required: t('forgotPage.emailRequired'),
                                // A mobile number cannot get a link while the school has no
                                // SMS: the office sets a temporary password instead.
                                validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
                                    || (/^[\d\s+()-]{10,}$/.test(v.trim()) ? t('forgotPage.mobileOnly') : t('forgotPage.emailInvalid')),
                            })} />
                        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>{isSubmitting ? t('forgotPage.sending') : t('forgotPage.send')}</Button>
                        <div className="rounded-row border border-line-subtle bg-surface-2 px-4 py-3">
                            <p className="type-small-semibold text-ink">{t('forgotPage.noEmail.title')}</p>
                            <p className="type-small text-ink-2">{t('forgotPage.noEmail.body')}</p>
                        </div>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
