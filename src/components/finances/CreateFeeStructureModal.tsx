import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Landmark } from 'lucide-react';

import { Banner, Button, Checkbox, Dialog, FormRow, SegmentedControl, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { financesService } from '../../api/services/finances.service';
import { errorText } from '../../features/people/format';
import { useFeeStructures } from '../../features/finance/queries';
import { FREQUENCIES } from '../../features/finance/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { FeeFrequency } from '../../types/finance';

import { BsDateField } from '../common/BsDateField';
interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Start with this class ticked, e.g. from a class's "Add fee". */
    classId?: number;
}

/**
 * Figma H02 "New fee structure". The API holds one class per fee, so
 * ticking several classes creates the same fee once for each of them;
 * "All classes" creates a single fee with no class. If some classes fail,
 * the ones that worked are kept and the rest stay ticked to try again.
 * Mount with a `key` so a preset class starts ticked.
 */
export function CreateFeeStructureModal({ isOpen, onClose, classId }: Props) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [amount, setAmount] = useState('');
    const [allClasses, setAllClasses] = useState(false);
    const [picked, setPicked] = useState<number[]>(classId ? [classId] : []);
    const [frequency, setFrequency] = useState<FeeFrequency>('monthly');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    // Charge the new fee to the students already in those classes. On for
    // recurring fees; a one-time fee (admission) is usually for new students only.
    const [chargeNow, setChargeNow] = useState(true);
    const [tried, setTried] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: isOpen, staleTime: 5 * 60 * 1000 });
    const existing = useFeeStructures(false);
    const types = [...new Set((existing.data ?? []).map((f) => f.fee_type).filter(Boolean) as string[])].sort();
    const classList = classes.data?.classes ?? [];

    const close = () => {
        setName(''); setType(''); setAmount(''); setAllClasses(false); setPicked(classId ? [classId] : []);
        setFrequency('monthly'); setFrom(''); setTo(''); setTried(false); setError(null); setChargeNow(true);
        onClose();
    };

    const value = Number(amount);
    const amountOk = amount !== '' && Number.isFinite(value) && value > 0;
    const scopeOk = allClasses || picked.length > 0;
    const datesOk = !from || !to || from <= to;

    const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const submit = async () => {
        setTried(true);
        setError(null);
        if (!name.trim() || !amountOk || !scopeOk || !datesOk) return;
        setBusy(true);
        const base = { name: name.trim(), fee_type: type.trim() || undefined, amount: value, frequency, is_active: true, valid_from: from || undefined, valid_to: to || undefined };
        const targets: (number | undefined)[] = allClasses ? [undefined] : picked;
        const failed: number[] = [];
        let firstError: unknown = null;
        for (const id of targets) {
            try {
                const fee = await financesService.createFeeStructure({ ...base, class_id: id });
                if (id !== undefined && chargeNow && frequency !== 'one_time') await financesService.chargeFeeToClass(fee.id, { class_id: id });
            } catch (err) {
                if (id !== undefined) failed.push(id);
                firstError ??= err;
            }
        }
        setBusy(false);
        queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
        queryClient.invalidateQueries({ queryKey: ['fee-reach'] });
        queryClient.invalidateQueries({ queryKey: ['finances'] });
        if (!firstError) return close();
        if (!allClasses) setPicked(failed);
        const names = failed.map((id) => classList.find((c) => c.id === id)?.name).filter(Boolean).join(', ');
        setError(`${names ? t('financePage.newFee.partial', { names }) + ' ' : ''}${errorText(firstError, t('peoplePage.error.body'))}`);
    };

    const summary = amountOk && scopeOk
        ? t(`financePage.newFee.summary.${frequency}`, {
            amount: formatRs(value, lang),
            scope: allClasses ? t('financePage.fees.allClassesShort') : t('financePage.newFee.classCount', { count: picked.length, n: formatCount(picked.length, lang) }),
        })
        : null;

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={Landmark}
            title={t('financePage.newFee.title')}
            subtitle={t('financePage.newFee.sub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={Landmark} loading={busy} onClick={() => void submit()}>
                        {busy ? t('financePage.newFee.creating') : !allClasses && picked.length > 1 ? t('financePage.newFee.createMany', { n: formatCount(picked.length, lang) }) : t('financePage.newFee.create')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('financePage.newFee.failed')}>{error}</Banner>}
            <TextField label={t('financePage.newFee.name')} placeholder={t('financePage.newFee.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)}
                error={tried && !name.trim() ? t('financePage.newFee.nameError') : undefined} />
            <FormRow>
                <TextField label={t('financePage.newFee.type')} optional={t('peopleForms.optional')} list="fee-types" placeholder={t('financePage.newFee.typePlaceholder')} value={type} onChange={(e) => setType(e.target.value)} />
                <TextField label={t('financePage.record.amount')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    endAdornment={<span className="type-small text-muted">Rs</span>}
                    error={tried && !amountOk ? t('financePage.record.amountError') : undefined} />
            </FormRow>
            <datalist id="fee-types">{types.map((x) => <option key={x} value={x} />)}</datalist>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 type-small-semibold text-ink">{t('financePage.newFee.classes')}</legend>
                <div className="flex flex-wrap gap-2">
                    <Chip on={allClasses} onClick={() => setAllClasses((v) => !v)}>{t('financePage.fees.allClassesShort')}</Chip>
                    {classList.map((c) => (
                        <Chip key={c.id} on={!allClasses && picked.includes(c.id)} disabled={allClasses} onClick={() => toggle(c.id)}>{c.name}</Chip>
                    ))}
                </div>
                <p className={cn('type-caption', tried && !scopeOk ? 'text-bad' : 'text-muted')}>
                    {tried && !scopeOk ? t('financePage.newFee.classesError') : t('financePage.newFee.classesHint')}
                </p>
            </fieldset>

            <div className="flex flex-col gap-2">
                <p className="type-small-semibold text-ink">{t('financePage.newFee.often')}</p>
                <SegmentedControl options={FREQUENCIES.map((f) => ({ value: f, label: t(`financePage.freq.${f}`) }))} value={frequency} onChange={setFrequency}
                    aria-label={t('financePage.newFee.often')} className="flex w-full [&>*]:flex-1" />
            </div>

            <FormRow>
                <BsDateField label={t('financePage.newFee.from')} optional={t('peopleForms.optional')} value={from} onChange={(v) => setFrom(v)} />
                <BsDateField label={t('financePage.newFee.to')} optional={t('peopleForms.optional')} value={to} min={from || undefined} onChange={(v) => setTo(v)}
                    error={tried && !datesOk ? t('financePage.newFee.datesError') : undefined} />
            </FormRow>

            {!allClasses && (
                <Checkbox checked={chargeNow && frequency !== 'one_time'} disabled={frequency === 'one_time'} onChange={(e) => setChargeNow(e.target.checked)}
                    label={<span className="flex flex-col">
                        <span className="type-small-semibold text-ink">{t('financePage.newFee.chargeNow')}</span>
                        <span className="type-caption text-muted">{frequency === 'one_time' ? t('financePage.newFee.chargeNowOneTime') : t('financePage.newFee.chargeNowHint')}</span>
                    </span>} />
            )}

            {summary && <Banner tone="info" title={summary}>{t('financePage.newFee.summaryBody')}</Banner>}
        </Dialog>
    );
}

function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: string }) {
    return (
        <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick}
            className={cn(
                'h-9 rounded-full border px-3.5 type-small-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60 disabled:opacity-45',
                on ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
            )}>
            {children}
        </button>
    );
}
