import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Combine } from 'lucide-react';

import { Badge, Banner, Button, Dialog } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent } from '../../types/people';
import { errorText, fullName, parentContact } from './format';
import { ParentPicker } from './ParentPicker';

/**
 * The same guardian entered twice (once by the office, once from a family
 * link): fold one record into the other. The kept record gets the other's
 * children, any details it lacks, and its login. Two records that can both
 * sign in are not merged: which login is really theirs is the office's call.
 */
export function MergeParentsDialog({ from, onClose, onMerged }: {
    from: Parent;
    onClose: () => void;
    onMerged: (name: string) => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [other, setOther] = useState<Parent | null>(null);
    // Which of the two stays: the row the office started from, unless swapped.
    const [keepFrom, setKeepFrom] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const keep = keepFrom ? from : other;
    const drop = keepFrom ? other : from;
    const hasLogin = (p: Parent | null) => !!(p?.user_id || p?.user);
    const bothLogins = hasLogin(from) && hasLogin(other);

    const merge = useMutation({
        mutationFn: () => peopleService.mergeParents(keep!.id, drop!.id),
        onSuccess: () => {
            ['parents', 'students', 'student-profile', 'users'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            onMerged(fullName(keep!));
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const card = (p: Parent, role: 'keep' | 'drop') => (
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-3">
            <Badge tone={role === 'keep' ? 'ok' : 'neutral'}>{t(role === 'keep' ? 'family.merge.kept' : 'family.merge.removed')}</Badge>
            <span className="truncate type-body-semibold text-ink">{fullName(p)}</span>
            <span className="type-caption text-muted">{parentContact(p) ?? '—'}</span>
            <span className="type-caption text-muted">{hasLogin(p) ? t('peoplePage.value.registered') : t('peoplePage.value.notRegistered')}</span>
            <span className="type-caption text-ink-2">
                {(p.children ?? []).length ? t('peopleRules.childrenOf', { names: (p.children ?? []).map((c) => c.name).join(', ') }) : t('peopleRules.noChildrenYet')}
            </span>
        </div>
    );

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!merge.isPending}
            icon={Combine}
            title={t('family.merge.title', { name: fullName(from) })}
            subtitle={t('family.merge.subtitle')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={merge.isPending} className="sm:mr-auto">{t('addChild.action.cancel')}</Button>
                    <Button leftIcon={Combine} loading={merge.isPending} disabled={!other || bothLogins} onClick={() => { setError(null); merge.mutate(); }}>
                        {t('family.merge.action')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('family.merge.failed')}>{error}</Banner>}
            <ParentPicker label={t('family.merge.which')} value={other} onChange={(p) => { setOther(p); setKeepFrom(true); }} exclude={[from.id]} />
            {other && keep && drop && (
                <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        {card(keep, 'keep')}
                        {card(drop, 'drop')}
                    </div>
                    <Button variant="quiet" size="sm" leftIcon={ArrowLeftRight} onClick={() => setKeepFrom((v) => !v)} className="self-start">
                        {t('family.merge.swap')}
                    </Button>
                    {bothLogins
                        ? <Banner tone="warn" title={t('family.merge.bothTitle')}>{t('family.merge.bothBody')}</Banner>
                        : <p className="type-small text-muted">{t('family.merge.explain', { kept: fullName(keep), removed: fullName(drop) })}</p>}
                </>
            )}
        </Dialog>
    );
}
