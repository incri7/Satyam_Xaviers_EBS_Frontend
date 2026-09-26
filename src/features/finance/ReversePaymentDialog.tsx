import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';

import { Badge, Banner, Button, Dialog, TextAreaField } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { errorText } from '../people/format';
import { cn } from '../../utils/cn';
import { formatSignedRs, methodKey } from './format';
import { invalidateMoney } from './queries';

export interface ReversiblePayment {
    id: number;
    receipt: string;
    student: string;
    amount: number;
    method: string;
    date: string;
}

const REASONS = ['wrongStudent', 'wrongAmount', 'bounced', 'twice'] as const;

/**
 * Figma H13 "Reverse this payment?". Nothing is deleted: the server records
 * a new negative payment linked to the original, and both stay in the
 * ledger. A reason is required; it is stored with the reversal.
 * Mount with a `key` per payment so the form starts empty.
 */
export function ReversePaymentDialog({ payment, onClose, onDone }: {
    payment: ReversiblePayment;
    onClose: () => void;
    onDone: (receipt: string) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
    const [details, setDetails] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const text = [reason ? t(`financePage.reverse.reason.${reason}`, { lng: 'en' }) : '', details.trim()].filter(Boolean).join(': ');

    const mutation = useMutation({
        mutationFn: () => financesService.reversePayment(payment.id, text),
        onSuccess: () => {
            invalidateMoney(queryClient);
            onDone(payment.receipt);
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!text) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!busy}
            role="alertdialog"
            size="sm"
            icon={RotateCcw}
            iconTone="warn"
            title={t('financePage.reverse.title')}
            subtitle={t('financePage.reverse.sub', { receipt: payment.receipt, student: payment.student })}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('financePage.reverse.keep')}</Button>
                    <Button variant="danger" leftIcon={RotateCcw} loading={busy} onClick={submit}>
                        {busy ? t('financePage.reverse.reversing') : t('financePage.reverse.confirm')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.reverse.failed')}>{error}</Banner>}
            <p className="type-small text-ink-2">{t('financePage.reverse.body')}</p>

            <div className="flex flex-col overflow-hidden rounded-row border border-line-subtle">
                <div className="flex items-center gap-3 bg-surface px-3.5 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="flex flex-wrap items-center gap-2 type-small-semibold text-ink">{payment.receipt} <Badge tone="neutral">{t('financePage.reverse.stays')}</Badge></p>
                        <p className="truncate type-caption text-muted">{t(methodKey(payment.method))}, {df.date(payment.date)}</p>
                    </div>
                    <span className="shrink-0 type-body-semibold tabular-nums text-ink">{formatSignedRs(payment.amount, df.lang)}</span>
                </div>
                <div className="flex items-center gap-3 border-t border-line-subtle bg-warn-soft/60 px-3.5 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="flex flex-wrap items-center gap-2 type-small-semibold text-ink">{t('financePage.reverse.newEntry')} <Badge tone="warn">{t('financePage.payments.reversal')}</Badge></p>
                        <p className="truncate type-caption text-muted">{t('financePage.reverse.newSub', { receipt: payment.receipt })}</p>
                    </div>
                    <span className="shrink-0 type-body-semibold tabular-nums text-bad">{formatSignedRs(-payment.amount, df.lang)}</span>
                </div>
            </div>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 type-small-semibold text-ink">{t('financePage.reverse.reasonLabel')}</legend>
                <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                        <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(reason === r ? null : r)}
                            className={cn(
                                'h-9 rounded-full border px-3.5 type-small-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                reason === r ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                            )}>
                            {t(`financePage.reverse.reason.${r}`)}
                        </button>
                    ))}
                </div>
            </fieldset>
            <TextAreaField label={t('financePage.reverse.details')} rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder={t('financePage.reverse.detailsHint')} error={tried && !text ? t('financePage.reverse.needReason') : undefined} />
        </Dialog>
    );
}
