import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';

import { Banner, Button, Dialog, PasswordField, TextField } from '../../design-system';
import { accountService } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import { errorText } from '../people/format';

/**
 * Change the number the school's SMS go to. The password is asked for
 * because absence alerts and fee reminders go to this number.
 */
export function ChangePhoneDialog({ current, onClose, onDone }: {
    current?: string | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const patchUser = useAuthStore((s) => s.patchUser);
    const [phone, setPhone] = useState(current ?? '');
    const [password, setPassword] = useState('');
    const [tried, setTried] = useState(false);
    const [server, setServer] = useState<{ field: 'phone' | 'password' | 'form'; message: string } | null>(null);

    const clean = phone.replace(/\s+/g, '');
    const phoneError = !/^[\d+-]{10,15}$/.test(clean) || (!/[+-]/.test(clean) && clean.length !== 10)
        ? t('profilePageMe.phoneEdit.invalid') : null;

    const mutation = useMutation({
        mutationFn: () => accountService.changePhone({ phone: clean, current_password: password }),
        onSuccess: (user) => {
            patchUser({ phone: user.phone });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            onDone();
        },
        onError: (err) => {
            const status = isAxiosError(err) ? err.response?.status : undefined;
            if (status === 400) setServer({ field: 'password', message: t('profilePageMe.phoneEdit.wrongPassword') });
            else if (status === 409) setServer({ field: 'phone', message: t('profilePageMe.phoneEdit.taken') });
            else if (status === 422) setServer({ field: 'phone', message: errorText(err, t('profilePageMe.phoneEdit.invalid')) });
            else setServer({ field: 'form', message: errorText(err, t('peoplePage.error.body')) });
        },
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setTried(true);
        setServer(null);
        if (phoneError || !password) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="sm" icon={Phone} iconTone="brand"
            title={t('profilePageMe.phoneEdit.title')} subtitle={t('profilePageMe.phoneEdit.sub')}
            closeLabel={t('common.close')} onSubmit={submit}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                    <Button type="submit" loading={busy}>{t('profilePageMe.phoneEdit.save')}</Button>
                </>
            }>
            {server?.field === 'form' && <Banner tone="bad" title={t('profilePageMe.phoneEdit.failed')}>{server.message}</Banner>}
            <TextField type="tel" inputMode="tel" autoComplete="tel" leftIcon={Phone} label={t('profilePageMe.phoneEdit.number')}
                value={phone} onChange={(e) => { setPhone(e.target.value); setServer(null); }}
                hint={t('profilePageMe.phoneEdit.hint')}
                error={server?.field === 'phone' ? server.message : tried && phoneError ? phoneError : undefined} />
            <PasswordField label={t('profilePageMe.phoneEdit.password')} autoComplete="current-password"
                value={password} onChange={(e) => { setPassword(e.target.value); setServer(null); }}
                showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} capsLockMessage={t('auth.capsLockOn')}
                error={server?.field === 'password' ? server.message : tried && !password ? t('profilePageMe.phoneEdit.needPassword') : undefined} />
        </Dialog>
    );
}
