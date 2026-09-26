import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';

import { Banner, Button, Dialog, TextField } from '../../design-system';
import { accountService } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import { errorText } from '../people/format';

/**
 * Set the name the app shows for you, in place of your email: in the top
 * bar, the welcome, notices you post and the finance activity log.
 */
export function ChangeNameDialog({ current, onClose, onDone }: {
    current?: string | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const patchUser = useAuthStore((s) => s.patchUser);
    const [name, setName] = useState(current ?? '');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clean = name.trim().replace(/\s+/g, ' ');
    const invalid = clean.replace(/[\s.'-]/g, '').length < 2 ? t('profilePageMe.nameEdit.needName')
        : /[\d<>@#$%^&*()_+=[\]{};:"\\|,/?!~`]/.test(clean) ? t('profilePageMe.nameEdit.invalid') : null;

    const mutation = useMutation({
        mutationFn: () => accountService.changeName(clean),
        onSuccess: (user) => {
            patchUser({ full_name: user.full_name, display_name: user.display_name });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            onDone();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setTried(true);
        setError(null);
        if (invalid) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="sm" icon={UserRound} iconTone="brand"
            title={t('profilePageMe.nameEdit.title')} subtitle={t('profilePageMe.nameEdit.sub')}
            closeLabel={t('common.close')} onSubmit={submit}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                    <Button type="submit" loading={busy}>{t('profilePageMe.nameEdit.save')}</Button>
                </>
            }>
            {error && <Banner tone="bad" title={t('profilePageMe.nameEdit.failed')}>{error}</Banner>}
            <TextField label={t('profilePageMe.fullName')} autoComplete="name" leftIcon={UserRound} maxLength={150}
                value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
                hint={t('profilePageMe.nameEdit.hint')} error={tried && invalid ? invalid : undefined} />
        </Dialog>
    );
}
