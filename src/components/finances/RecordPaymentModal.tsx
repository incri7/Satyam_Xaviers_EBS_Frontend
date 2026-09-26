import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Receipt, ShieldCheck } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SegmentedControl, SelectField, TextField } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { StudentPicker } from '../../features/people/StudentPicker';
import { errorText } from '../../features/people/format';
import { useFeeStructures, invalidateMoney } from '../../features/finance/queries';
import { METHODS, methodKey, todayISO } from '../../features/finance/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatRs } from '../../utils/money';
import type { PaymentMethod } from '../../types/finance';
import type { Student } from '../../types/people';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Figma H01 "Record payment": who paid, for which fee, how much, when and
 * how. Adapted: the API takes one fee per payment rather than a basket of
 * ticked dues, and the student's balance comes from the outstanding list.
 * The receipt number is issued by the server and the PDF goes to the parent.
 */
export function RecordPaymentModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [student, setStudent] = useState<Student | null>(null);
    const [feeId, setFeeId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [txn, setTxn] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fees = useFeeStructures(true);
    const balance = useQuery({
        queryKey: ['finances', 'outstanding', 'student', student?.id],
        queryFn: () => financesService.getOutstanding({ search: student!.admission_no || student!.first_name, limit: 20 }),
        enabled: isOpen && !!student,
        select: (r) => r.entries.find((e) => e.student_id === student!.id)?.balance ?? 0,
    });

    const close = () => {
        setStudent(null); setFeeId(''); setAmount(''); setDate(todayISO()); setMethod('cash'); setTxn('');
        setTried(false); setError(null);
        onClose();
    };

    const value = Number(amount);
    const amountOk = amount !== '' && Number.isFinite(value) && value > 0;
    const today = todayISO();

    const mutation = useMutation({
        mutationFn: () => {
            // The day chosen, at the current time when that day is today, so
            // receipts taken the same day stay in the order they were taken.
            const now = new Date();
            const time = date === today ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '12:00';
            return financesService.recordPayment({
                student_id: student!.id,
                fee_structure_id: feeId ? Number(feeId) : undefined,
                amount: value,
                method,
                paid_at: `${date}T${time}:00`,
                transaction_id: txn.trim() || undefined,
            });
        },
        onSuccess: () => {
            invalidateMoney(queryClient);
            close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!student || !amountOk || !date || date > today) return;
        mutation.mutate();
    };

    const pickFee = (id: string) => {
        setFeeId(id);
        const fee = fees.data?.find((f) => String(f.id) === id);
        if (fee && !amount) setAmount(String(Number(fee.amount)));
    };

    const busy = mutation.isPending;
    const methods = METHODS.map((m) => ({ value: m, label: t(methodKey(m)) }));

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={Receipt}
            iconTone="ok"
            title={t('financePage.record.title')}
            subtitle={t('financePage.record.sub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={Receipt} loading={busy} onClick={submit}>
                        {busy ? t('financePage.record.saving') : amountOk ? t('financePage.record.button', { amount: formatRs(value, df.lang) }) : t('financePage.record.buttonPlain')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.record.failed')}>{error}</Banner>}

            <StudentPicker label={t('financePage.record.student')} value={student} onChange={setStudent} enabled={isOpen}
                error={tried && !student ? t('classesPage.enrol.pickStudent') : undefined}
                trailing={student && balance.data !== undefined && (
                    <span className="flex shrink-0 flex-col items-end">
                        <span className="type-micro text-muted">{t('financePage.record.balance')}</span>
                        <span className={balance.data > 0 ? 'type-small-semibold tabular-nums text-bad' : 'type-small-semibold tabular-nums text-ok'}>{formatRs(balance.data, df.lang)}</span>
                    </span>
                )} />

            <SelectField label={t('financePage.record.for')} optional={t('peopleForms.optional')} value={feeId} placeholder={t('financePage.record.forNone')}
                hint={t('financePage.record.forHint')} onChange={(e) => pickFee(e.target.value)}
                options={(fees.data ?? []).map((f) => ({ value: f.id, label: `${f.name} · ${formatRs(f.amount, df.lang)}` }))} />

            <FormRow>
                <TextField label={t('financePage.record.amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    endAdornment={<span className="type-small text-muted">Rs</span>}
                    error={tried && !amountOk ? t('financePage.record.amountError') : undefined} />
                <TextField label={t('financePage.record.date')} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
                    hint={date ? df.date(date) : undefined}
                    error={tried && (!date || date > today) ? t('financePage.record.dateError') : undefined} />
            </FormRow>

            <div className="flex flex-col gap-2">
                <p className="type-small-semibold text-ink">{t('financePage.record.method')}</p>
                <div className="max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:[scrollbar-width:none]">
                    <SegmentedControl options={methods} value={method} onChange={setMethod} aria-label={t('financePage.record.method')} className="w-max sm:flex sm:w-full sm:[&>*]:flex-1" />
                </div>
            </div>
            {method !== 'cash' && (
                <TextField label={t(`financePage.record.txn.${method}`)} optional={t('peopleForms.optional')} value={txn} onChange={(e) => setTxn(e.target.value)} />
            )}

            <Banner tone="warn" icon={ShieldCheck} title={t('financePage.record.finalTitle')}>{t('financePage.record.finalBody')}</Banner>
            <p className="type-caption text-muted">{t('financePage.record.sms')}</p>
        </Dialog>
    );
}
