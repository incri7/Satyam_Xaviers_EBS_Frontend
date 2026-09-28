import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Receipt, ShieldCheck } from 'lucide-react';

import { Banner, Button, Checkbox, Dialog, FormRow, SegmentedControl, Skeleton, TextField } from '../../design-system';
import { financesService, type StudentDueLine } from '../../api/services/finances.service';
import { StudentPicker } from '../../features/people/StudentPicker';
import { errorText } from '../../features/people/format';
import { invalidateMoney } from '../../features/finance/queries';
import { METHODS, methodKey, todayISO } from '../../features/finance/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { PaymentMethod } from '../../types/finance';
import type { Student } from '../../types/people';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const cleanAmount = (v: string) => v.replace(/[^\d.]/g, '');

/**
 * Figma H01 "Record payment": who paid, for which of their fees, how much,
 * when and how. Only the fees charged to that student are listed, each with
 * what is left to pay; tick several to put them on one receipt. The receipt
 * number is issued by the server and the PDF goes to the parent.
 */
export function RecordPaymentModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [student, setStudent] = useState<Student | null>(null);
    // Ticked fees and the amount against each.
    const [picked, setPicked] = useState<Record<number, string>>({});
    const [date, setDate] = useState(todayISO());
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [txn, setTxn] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dues = useQuery({
        queryKey: ['finances', 'student-dues', student?.id],
        queryFn: () => financesService.getStudentDues(student!.id),
        enabled: isOpen && !!student,
    });
    // Fees still owing first, then the paid-up ones.
    const lines = [...(dues.data?.lines ?? [])].sort((a, b) => Number(b.balance) - Number(a.balance));

    const close = () => {
        setStudent(null); setPicked({}); setDate(todayISO()); setMethod('cash'); setTxn('');
        setTried(false); setError(null);
        onClose();
    };
    const pickStudent = (s: Student | null) => { setStudent(s); setPicked({}); setError(null); };

    const toggle = (l: StudentDueLine) => setPicked((p) => {
        const next = { ...p };
        if (l.fee_structure_id in next) delete next[l.fee_structure_id];
        else next[l.fee_structure_id] = String(Number(l.balance) > 0 ? Number(l.balance) : Number(l.unit_amount));
        return next;
    });
    const chosen = Object.entries(picked).map(([id, v]) => ({ fee_structure_id: Number(id), amount: Number(v) }));
    const badLine = chosen.some((c) => !Number.isFinite(c.amount) || c.amount <= 0);
    const total = chosen.reduce((s, c) => s + (Number.isFinite(c.amount) ? c.amount : 0), 0);
    const today = todayISO();

    const mutation = useMutation({
        mutationFn: () => {
            // The day chosen, at the current time when that day is today, so
            // receipts taken the same day stay in the order they were taken.
            const now = new Date();
            const time = date === today ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '12:00';
            return financesService.recordPayment({
                student_id: student!.id,
                lines: chosen,
                amount: Math.round(total * 100) / 100,
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
        if (!student || chosen.length === 0 || badLine || !date || date > today) return;
        mutation.mutate();
    };

    const busy = mutation.isPending;
    const methods = METHODS.map((m) => ({ value: m, label: t(methodKey(m)) }));
    const often = (l: StudentDueLine) => {
        const kind = t(`childPage.often.${l.frequency}`, { defaultValue: l.frequency });
        return l.periods > 1 ? t('childPage.periodsOf', { kind, n: formatCount(l.periods, df.lang), amount: formatRs(l.unit_amount, df.lang) }) : kind;
    };

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
                        {busy ? t('financePage.record.saving') : total > 0 ? t('financePage.record.button', { amount: formatRs(total, df.lang) }) : t('financePage.record.buttonPlain')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.record.failed')}>{error}</Banner>}

            <StudentPicker label={t('financePage.record.student')} value={student} onChange={pickStudent} enabled={isOpen}
                error={tried && !student ? t('classesPage.enrol.pickStudent') : undefined}
                trailing={student && dues.data && (
                    <span className="flex shrink-0 flex-col items-end">
                        <span className="type-micro text-muted">{t('financePage.record.balance')}</span>
                        <span className={Number(dues.data.balance) > 0 ? 'type-small-semibold tabular-nums text-bad' : 'type-small-semibold tabular-nums text-ok'}>{formatRs(dues.data.balance, df.lang)}</span>
                    </span>
                )} />

            {student && (
                <fieldset className="flex flex-col gap-2">
                    <legend className="pb-2 type-small-semibold text-ink">{t('financePage.record.for')}</legend>
                    {dues.isPending ? (
                        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
                    ) : dues.isError ? (
                        <Banner tone="bad" title={t('financePage.record.duesError')}>{errorText(dues.error, t('peoplePage.error.body'))}</Banner>
                    ) : lines.length === 0 ? (
                        <Banner tone="warn" title={t('financePage.record.noFeesTitle', { name: student.first_name })}
                            action={<Button variant="quiet" size="sm" onClick={() => { close(); navigate(`/people/students/${student.id}?tab=fees`); }}>{t('financePage.record.openFees')}</Button>}>
                            {t('financePage.record.noFeesBody')}
                        </Banner>
                    ) : (
                        <ul className="flex flex-col divide-y divide-line-subtle rounded-row border border-line">
                            {lines.map((l) => {
                                const on = l.fee_structure_id in picked;
                                const left = Number(l.balance);
                                const value = picked[l.fee_structure_id] ?? '';
                                const over = on && Number(value) > left;
                                return (
                                    <li key={l.fee_structure_id} className={cn('flex flex-col gap-2 px-3 py-2.5', on && 'bg-primary-soft/50')}>
                                        <div className="flex items-center gap-3">
                                            <Checkbox checked={on} onChange={() => toggle(l)} className="min-w-0 flex-1" label={
                                                <span className="flex min-w-0 flex-col">
                                                    <span className="type-body-semibold text-ink">{l.name}</span>
                                                    <span className="type-caption text-muted">
                                                        {often(l)}{Number(l.scholarship) > 0 && `, ${t('childPage.scholarshipOff', { amount: formatRs(l.scholarship, df.lang) })}`}
                                                    </span>
                                                </span>
                                            } />
                                            <span className={cn('shrink-0 text-right type-small-semibold tabular-nums', left > 0 ? 'text-ink' : 'text-ok')}>
                                                {left > 0 ? t('financePage.record.left', { amount: formatRs(left, df.lang) }) : t('financePage.record.paidUp')}
                                            </span>
                                        </div>
                                        {on && (
                                            <TextField label={t('financePage.record.amountFor', { name: l.name })} inputMode="decimal" value={value}
                                                onChange={(e) => setPicked((p) => ({ ...p, [l.fee_structure_id]: cleanAmount(e.target.value) }))}
                                                endAdornment={<span className="type-small text-muted">Rs</span>}
                                                error={tried && !(Number(value) > 0) ? t('financePage.record.amountError') : undefined}
                                                hint={over ? t('financePage.record.ahead', { amount: formatRs(Number(value) - left, df.lang) }) : undefined} />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {tried && lines.length > 0 && chosen.length === 0 && <p role="alert" className="type-small text-bad">{t('financePage.record.pickFee')}</p>}
                    {chosen.length > 0 && (
                        <p className="flex items-baseline justify-between gap-3 px-1 pt-1">
                            <span className="type-small text-ink-2">{t('financePage.record.total', { count: chosen.length, n: formatCount(chosen.length, df.lang) })}</span>
                            <span className="type-title tabular-nums text-ink">{formatRs(total, df.lang)}</span>
                        </p>
                    )}
                </fieldset>
            )}

            <FormRow>
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
