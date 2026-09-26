import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SegmentedControl, TextField, ToggleRow } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { errorText } from '../people/format';
import type { FeeFrequency, FeeStructure } from '../../types/finance';
import { FREQUENCIES } from './format';

/**
 * Change a fee's name, type, amount, frequency, or whether it is billed.
 * Payments already taken keep the amount they were taken at.
 * Mount with a `key` per fee so the form starts from that fee.
 */
export function EditFeeDialog({ fee, scope, onClose }: { fee: FeeStructure; scope: string; onClose: () => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState(fee.name);
    const [type, setType] = useState(fee.fee_type ?? '');
    const [active, setActive] = useState(fee.is_active);
    const [amount, setAmount] = useState(String(Number(fee.amount)));
    const [frequency, setFrequency] = useState<FeeFrequency>(fee.frequency);
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const value = Number(amount);
    const amountOk = amount !== '' && Number.isFinite(value) && value > 0;

    const mutation = useMutation({
        mutationFn: () => financesService.updateFeeStructure(fee.id, { name: name.trim(), fee_type: type.trim() || undefined, amount: value, frequency, is_active: active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!name.trim() || !amountOk) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!busy}
            size="sm"
            icon={Pencil}
            title={t('financePage.fees.editTitle')}
            subtitle={scope}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button loading={busy} onClick={submit}>{busy ? t('classesPage.editEnrol.saving') : t('classesPage.editEnrol.save')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.fees.saveFailed')}>{error}</Banner>}
            <TextField label={t('financePage.newFee.name')} value={name} onChange={(e) => setName(e.target.value)}
                error={tried && !name.trim() ? t('financePage.newFee.nameError') : undefined} />
            <FormRow>
                <TextField label={t('financePage.newFee.type')} optional={t('peopleForms.optional')} value={type} onChange={(e) => setType(e.target.value)} />
                <TextField label={t('financePage.record.amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    endAdornment={<span className="type-small text-muted">Rs</span>}
                    error={tried && !amountOk ? t('financePage.record.amountError') : undefined} />
            </FormRow>
            <div className="flex flex-col gap-2">
                <p className="type-small-semibold text-ink">{t('financePage.newFee.often')}</p>
                <SegmentedControl options={FREQUENCIES.map((f) => ({ value: f, label: t(`financePage.freq.${f}`) }))} value={frequency} onChange={setFrequency}
                    aria-label={t('financePage.newFee.often')} className="flex w-full [&>*]:flex-1" />
            </div>
            <ToggleRow title={t('financePage.fees.billed')} checked={active} onChange={setActive}>{t('financePage.fees.billedBody')}</ToggleRow>
            <p className="type-caption text-muted">{t('financePage.fees.editNote')}</p>
        </Dialog>
    );
}
