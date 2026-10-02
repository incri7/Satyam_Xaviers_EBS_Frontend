import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Paperclip, Wallet, X } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, IconButton, SegmentedControl, SelectField, TextAreaField, TextField } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { errorText } from '../../features/people/format';
import { invalidateMoney } from '../../features/finance/queries';
import { EXPENSE_CATEGORIES, METHODS, methodKey, todayISO } from '../../features/finance/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatRs } from '../../utils/money';
import type { PaymentMethod } from '../../types/finance';

import { BsDateField } from '../common/BsDateField';
interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const OTHER = '__other__';
const MAX_BILL_MB = 10;

/**
 * Figma H03 "Record expense": who was paid, for what, how much, when, from
 * where, and the bill behind it. The bill is uploaded right after the
 * expense is saved; if only the upload fails, the expense stands and the
 * bill can be attached from the list.
 */
export function RecordExpenseModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const [vendor, setVendor] = useState('');
    const [category, setCategory] = useState('');
    const [otherCategory, setOtherCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [mode, setMode] = useState<PaymentMethod>('cash');
    const [invoice, setInvoice] = useState('');
    const [description, setDescription] = useState('');
    const [bill, setBill] = useState<File | null>(null);
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const close = () => {
        setVendor(''); setCategory(''); setOtherCategory(''); setAmount(''); setDate(todayISO()); setMode('cash');
        setInvoice(''); setDescription(''); setBill(null); setTried(false); setError(null); setWarning(null);
        onClose();
    };

    const value = Number(amount);
    const amountOk = amount !== '' && Number.isFinite(value) && value > 0;
    const finalCategory = (category === OTHER ? otherCategory : category).trim();
    const today = todayISO();

    const mutation = useMutation({
        mutationFn: async () => {
            const expense = await financesService.recordExpense({
                date,
                category: finalCategory,
                amount: value,
                vendor_name: vendor.trim() || undefined,
                invoice_no: invoice.trim() || undefined,
                payment_mode: mode,
                description: description.trim() || undefined,
            });
            if (!bill) return { billFailed: false };
            try {
                await financesService.uploadExpenseAttachment(expense.id, bill);
                return { billFailed: false };
            } catch {
                return { billFailed: true };
            }
        },
        onSuccess: ({ billFailed }) => {
            invalidateMoney(queryClient);
            if (billFailed) setWarning(t('financePage.expense.billFailed'));
            else close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!finalCategory || !amountOk || !date || date > today) return;
        mutation.mutate();
    };

    const pickBill = (file?: File) => {
        if (!file) return;
        if (file.size > MAX_BILL_MB * 1024 * 1024) {
            setError(t('financePage.expense.billTooBig', { mb: MAX_BILL_MB }));
            return;
        }
        setError(null);
        setBill(file);
    };

    const busy = mutation.isPending;
    const modes = METHODS.map((m) => ({ value: m, label: t(methodKey(m)) }));

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={Wallet}
            iconTone="warn"
            title={t('financePage.expense.title')}
            subtitle={t('financePage.expense.sub')}
            closeLabel={t('common.close')}
            footer={warning ? (
                <Button onClick={close}>{t('financePage.expense.done')}</Button>
            ) : (
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={Wallet} loading={busy} onClick={submit}>
                        {busy ? t('financePage.record.saving') : amountOk ? t('financePage.record.button', { amount: formatRs(value, df.lang) }) : t('financePage.record.buttonPlain')}
                    </Button>
                </>
            )}
        >
            {error && <Banner tone="bad" title={t('financePage.expense.failed')}>{error}</Banner>}
            {warning ? (
                <Banner tone="warn" title={t('financePage.expense.savedTitle')}>{warning}</Banner>
            ) : (
                <>
                    <FormRow>
                        <TextField label={t('financePage.expense.vendor')} optional={t('peopleForms.optional')} value={vendor} onChange={(e) => setVendor(e.target.value)} />
                        <SelectField label={t('financePage.expense.category')} value={category} placeholder={t('peopleForms.choose')} onChange={(e) => setCategory(e.target.value)}
                            error={tried && !finalCategory && category !== OTHER ? t('financePage.expense.categoryError') : undefined}
                            options={[...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`financePage.category.${c}`, { defaultValue: c }) })), { value: OTHER, label: t('financePage.expense.otherCategory') }]} />
                    </FormRow>
                    {category === OTHER && (
                        <TextField label={t('financePage.expense.newCategory')} value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)}
                            error={tried && !finalCategory ? t('financePage.expense.categoryError') : undefined} />
                    )}
                    <FormRow>
                        <TextField label={t('financePage.record.amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                            endAdornment={<span className="type-small text-muted">Rs</span>}
                            error={tried && !amountOk ? t('financePage.record.amountError') : undefined} />
                        <BsDateField label={t('financePage.expense.date')} value={date} max={today} onChange={(v) => setDate(v)}
                           
                            error={tried && (!date || date > today) ? t('financePage.record.dateError') : undefined} />
                    </FormRow>
                    <div className="flex flex-col gap-2">
                        <p className="type-small-semibold text-ink">{t('financePage.expense.paidFrom')}</p>
                        <div className="max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:[scrollbar-width:none]">
                            <SegmentedControl options={modes} value={mode} onChange={setMode} aria-label={t('financePage.expense.paidFrom')} className="w-max sm:flex sm:w-full sm:[&>*]:flex-1" />
                        </div>
                    </div>
                    <TextField label={t('financePage.expense.invoice')} optional={t('peopleForms.optional')} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
                    <TextAreaField label={t('financePage.expense.description')} optional={t('peopleForms.optional')} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

                    <div className="flex flex-col gap-2">
                        <p className="type-small-semibold text-ink">{t('financePage.expense.bill')} <span className="type-small text-muted">{t('peopleForms.optional')}</span></p>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                            onChange={(e) => { pickBill(e.target.files?.[0]); e.target.value = ''; }} />
                        {bill ? (
                            <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                                <Paperclip size={16} className="shrink-0 text-muted" aria-hidden />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate type-small-medium text-ink">{bill.name}</span>
                                    <span className="type-caption text-muted">{(bill.size / 1024 / 1024).toFixed(1)} MB</span>
                                </span>
                                <IconButton icon={X} label={t('financePage.expense.removeBill')} onClick={() => setBill(null)} />
                            </div>
                        ) : (
                            <Button variant="secondary" leftIcon={Paperclip} onClick={() => fileRef.current?.click()} className="w-fit">{t('financePage.expense.attach')}</Button>
                        )}
                    </div>
                </>
            )}
        </Dialog>
    );
}
