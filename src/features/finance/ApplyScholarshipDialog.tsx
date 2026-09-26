import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';

import { Badge, Banner, Button, Dialog, FormRow, SegmentedControl, SelectField, TextAreaField, TextField } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { StudentPicker } from '../people/StudentPicker';
import { errorText } from '../people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { Student } from '../../types/people';
import { SCHOLARSHIP_TYPES, TIMES_A_YEAR, encodeReason, type ScholarshipType } from './format';
import { useFeeStructures } from './queries';

/**
 * Figma H04 "Apply scholarship": a discount on one fee for one student,
 * as a percentage or a fixed amount, with dates and a reason. The type
 * (merit, need, …) is kept at the start of the reason; see encodeReason.
 * Mount with a `key` so a preset student starts picked.
 */
export function ApplyScholarshipDialog({ student: preset, onClose, onDone }: {
    student: Student | null;
    onClose: () => void;
    onDone: (student: Student) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const [student, setStudent] = useState<Student | null>(preset);
    const [type, setType] = useState<ScholarshipType>('merit');
    const [feeId, setFeeId] = useState('');
    const [percent, setPercent] = useState(true);
    const [value, setValue] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [reason, setReason] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fees = useFeeStructures(true);
    const existing = useQuery({
        queryKey: ['discounts', student?.id],
        queryFn: () => financesService.getStudentDiscounts(student!.id),
        enabled: !!student,
    });
    const fee = fees.data?.find((f) => String(f.id) === feeId);
    const n = Number(value);
    const valueOk = value !== '' && Number.isFinite(n) && n > 0 && (!percent || n <= 100) && (percent || !fee || n <= Number(fee.amount));
    const datesOk = !from || !to || from <= to;

    const now = fee ? Number(fee.amount) : 0;
    const off = !fee || !valueOk ? 0 : percent ? (now * n) / 100 : n;
    const after = Math.max(0, now - off);
    const per = fee ? t(`financePage.scholarships.per.${fee.frequency}`) : '';

    const mutation = useMutation({
        mutationFn: () => financesService.createDiscount({
            student_id: student!.id,
            fee_structure_id: Number(feeId),
            is_percent: percent,
            value: n,
            reason: encodeReason(type, reason),
            valid_from: from || undefined,
            valid_to: to || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discounts'] });
            queryClient.invalidateQueries({ queryKey: ['finances', 'outstanding'] });
            onDone(student!);
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!student || !feeId || !valueOk || !datesOk || !reason.trim()) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;
    const activeCount = (existing.data ?? []).length;

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!busy}
            icon={Award}
            iconTone="info"
            title={t('financePage.scholarships.applyTitle')}
            subtitle={t('financePage.scholarships.applySub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={Award} loading={busy} onClick={submit}>{busy ? t('financePage.scholarships.applying') : t('financePage.scholarships.apply')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.scholarships.failed')}>{error}</Banner>}

            <StudentPicker label={t('financePage.record.student')} value={student} onChange={setStudent}
                error={tried && !student ? t('classesPage.enrol.pickStudent') : undefined}
                trailing={student && activeCount > 0 && <Badge tone="info">{t('financePage.scholarships.existing', { count: activeCount, n: formatCount(activeCount, lang) })}</Badge>} />

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 type-small-semibold text-ink">{t('financePage.scholarships.type')}</legend>
                <div className="flex flex-wrap gap-2">
                    {SCHOLARSHIP_TYPES.map((x) => (
                        <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)}
                            className={cn(
                                'h-9 rounded-full border px-3.5 type-small-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                type === x ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                            )}>
                            {t(`financePage.scholarships.types.${x}`)}
                        </button>
                    ))}
                </div>
            </fieldset>

            <SelectField label={t('financePage.scholarships.fee')} value={feeId} placeholder={t('peopleForms.choose')} onChange={(e) => setFeeId(e.target.value)}
                error={tried && !feeId ? t('financePage.scholarships.feeError') : undefined}
                options={(fees.data ?? []).map((f) => ({ value: f.id, label: `${f.name} · ${formatRs(f.amount, lang)} ${t(`financePage.scholarships.per.${f.frequency}`)}` }))} />

            <FormRow>
                <div className="flex flex-col gap-2">
                    <p className="type-small-semibold text-ink">{t('financePage.scholarships.as')}</p>
                    <SegmentedControl options={[{ value: 'percent', label: t('financePage.scholarships.percent') }, { value: 'fixed', label: t('financePage.scholarships.fixed') }]}
                        value={percent ? 'percent' : 'fixed'} onChange={(v) => setPercent(v === 'percent')} aria-label={t('financePage.scholarships.as')} className="flex w-full [&>*]:flex-1" />
                </div>
                <TextField label={t('financePage.scholarships.value')} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
                    endAdornment={<span className="type-small text-muted">{percent ? '%' : 'Rs'}</span>}
                    error={tried && !valueOk ? (percent ? t('financePage.scholarships.percentError') : t('financePage.scholarships.fixedError')) : undefined} />
            </FormRow>

            {fee && valueOk && (
                <dl className="grid grid-cols-3 gap-2 rounded-row border border-line-subtle bg-surface-2 p-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <dt className="type-caption text-muted">{t('financePage.scholarships.now')}</dt>
                        <dd className="truncate type-small-semibold tabular-nums text-ink">{formatRs(now, lang)} <span className="type-caption text-muted">{per}</span></dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <dt className="type-caption text-muted">{t('financePage.scholarships.with')}</dt>
                        <dd className="truncate type-small-semibold tabular-nums text-ok">{formatRs(after, lang)} <span className="type-caption text-muted">{per}</span></dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <dt className="type-caption text-muted">{t('financePage.scholarships.saves')}</dt>
                        <dd className="truncate type-small-semibold tabular-nums text-ink">{formatRs(off * TIMES_A_YEAR[fee.frequency], lang)}</dd>
                    </div>
                </dl>
            )}

            <FormRow>
                <TextField label={t('financePage.scholarships.from')} optional={t('peopleForms.optional')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} hint={from ? df.date(from) : undefined} />
                <TextField label={t('financePage.scholarships.until')} optional={t('peopleForms.optional')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                    hint={to ? df.date(to) : t('financePage.scholarships.noEnd')} error={tried && !datesOk ? t('financePage.newFee.datesError') : undefined} />
            </FormRow>
            <TextAreaField label={t('financePage.scholarships.reason')} rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={t('financePage.scholarships.reasonHint')} error={tried && !reason.trim() ? t('financePage.scholarships.reasonError') : undefined} />
        </Dialog>
    );
}
