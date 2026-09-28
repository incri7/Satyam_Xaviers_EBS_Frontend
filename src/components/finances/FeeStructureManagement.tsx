import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Ban, ChevronRight, Landmark, Pencil, Plus, RotateCw, UserPlus } from 'lucide-react';

import { ActionMenu, Badge, Banner, Button, Card, CardHeader, Dialog, EmptyState, FilterChips, SelectField, Skeleton } from '../../design-system';
import { useConfirmDialog } from '../common/useConfirmDialog';
import { academicsService } from '../../api/services/academics.service';
import { financesService } from '../../api/services/finances.service';
import { useFeeStructures } from '../../features/finance/queries';
import { FREQUENCIES, summariseFees } from '../../features/finance/format';
import { EditFeeDialog } from '../../features/finance/EditFeeDialog';
import { useNotice } from '../../features/people/useNotice';
import { errorText } from '../../features/people/format';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { FeeStructure } from '../../types/finance';

/**
 * Figma E03 Fee structures: pick a class, see what it pays and how often.
 * The class's own fees make up its totals; fees set for all classes (bus
 * routes, the diary) are listed under them but left out of the totals,
 * because not every family pays them.
 */
export function FeeStructureManagement({ onAdd }: { onAdd: (classId?: number) => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const fees = useFeeStructures(false);
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });
    const [picked, setPicked] = useState<number | null>(null);

    const all = useMemo(() => fees.data ?? [], [fees.data]);
    const byClass = useMemo(() => {
        const map = new Map<number, FeeStructure[]>();
        for (const f of all) if (f.class_id != null) map.set(f.class_id, [...(map.get(f.class_id) ?? []), f]);
        return map;
    }, [all]);
    const schoolWide = all.filter((f) => f.class_id == null);
    const classList = classes.data?.classes ?? [];
    // Open on the first class that has fees; an empty Nursery is a poor first view.
    const current = classList.find((c) => c.id === picked) ?? classList.find((c) => byClass.has(c.id)) ?? classList[0];

    const isPending = fees.isPending || classes.isPending;
    const isError = fees.isError || classes.isError;
    const retry = () => { void fees.refetch(); void classes.refetch(); };

    if (isPending) {
        return (
            <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Skeleton className="h-[320px] rounded-card max-lg:hidden" />
                <div className="flex flex-col gap-3.5"><Skeleton className="h-[120px] rounded-card" /><Skeleton className="h-[300px] rounded-card" /></div>
            </div>
        );
    }
    if (isError) {
        return (
            <Card>
                <EmptyState icon={AlertCircle} tone="bad" title={t('peoplePage.error.title')}
                    action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={retry}>{t('classesPage.action.retry')}</Button>}>
                    {t('peoplePage.error.body')}
                </EmptyState>
            </Card>
        );
    }
    if (classList.length === 0) {
        return (
            <Card>
                <EmptyState icon={Landmark} title={t('financePage.fees.noClasses')}>{t('financePage.fees.noClassesBody')}</EmptyState>
            </Card>
        );
    }

    const monthly = (id: number) => summariseFees(byClass.get(id) ?? []).monthly;

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            <p className="type-small text-muted">
                {t('financePage.fees.intro', { items: formatCount(all.filter((f) => f.is_active).length, lang), classes: formatCount(classList.length, lang) })}
            </p>

            <div className="lg:hidden">
                <FilterChips aria-label={t('financePage.fees.pickClass')} value={String(current.id)} onChange={(v) => setPicked(Number(v))}
                    items={classList.map((c) => ({ value: String(c.id), label: c.name }))} />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
                <nav aria-label={t('financePage.fees.pickClass')} className="overflow-hidden rounded-card border border-line bg-surface shadow-e1 max-lg:hidden">
                    <ul className="flex flex-col py-1.5">
                        {classList.map((c) => {
                            const on = c.id === current.id;
                            const count = (byClass.get(c.id) ?? []).filter((f) => f.is_active).length;
                            return (
                                <li key={c.id}>
                                    <button type="button" aria-current={on ? 'true' : undefined} onClick={() => setPicked(c.id)}
                                        className={cn(
                                            'flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors focus-visible:bg-surface-2',
                                            on ? 'bg-primary-soft' : 'hover:bg-surface-2',
                                        )}>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className={cn('truncate type-small-semibold', on ? 'text-primary-text' : 'text-ink')}>{c.name}</span>
                                            <span className="type-caption text-muted">{t('financePage.fees.items', { count, n: formatCount(count, lang) })}</span>
                                        </span>
                                        <span className="shrink-0 type-caption-semibold tabular-nums text-ink-2">{monthly(c.id) > 0 ? t('financePage.fees.perMonth', { amount: formatRs(monthly(c.id), lang) }) : '—'}</span>
                                        <ChevronRight size={16} className={on ? 'text-primary-text' : 'text-muted'} aria-hidden />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <ClassFees key={current.id} classId={current.id} className={current.name} fees={byClass.get(current.id) ?? []} schoolWide={schoolWide} onAdd={onAdd} />
            </div>
        </div>
    );
}

function ClassFees({ classId, className, fees, schoolWide, onAdd }: {
    classId: number;
    className: string;
    fees: FeeStructure[];
    schoolWide: FeeStructure[];
    onAdd: (classId?: number) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { lang } = df;
    const titleId = useId();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [editing, setEditing] = useState<FeeStructure | null>(null);
    const [charging, setCharging] = useState<FeeStructure | null>(null);
    const s = summariseFees(fees);
    // How many of the class's students each fee reaches.
    const reach = useQuery({
        queryKey: ['fee-reach', classId],
        queryFn: () => financesService.getFeeReach(classId),
        staleTime: 60 * 1000,
    });
    const reachOf = (id: number) => reach.data?.find((r) => r.fee_structure_id === id);

    const deactivate = useMutation({
        mutationFn: financesService.deactivateFeeStructure,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-structures'] }),
        onError: (err) => notify({ tone: 'bad', title: t('financePage.fees.saveFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const askDeactivate = (f: FeeStructure) =>
        confirm({
            title: t('financePage.fees.stopTitle', { name: f.name }),
            body: t('financePage.fees.stopBody'),
            confirmLabel: t('financePage.fees.stop'),
            onConfirm: () => deactivate.mutate(f.id),
        });

    const ordered = (list: FeeStructure[]) =>
        [...list].sort((a, b) => Number(b.is_active) - Number(a.is_active) || FREQUENCIES.indexOf(a.frequency) - FREQUENCIES.indexOf(b.frequency) || a.name.localeCompare(b.name));

    const row = (f: FeeStructure, scope: string) => (
        <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn('flex flex-wrap items-center gap-2 type-small-semibold', f.is_active ? 'text-ink' : 'text-muted')}>
                    {f.name}
                    {!f.is_active && <Badge tone="neutral">{t('financePage.fees.inactive')}</Badge>}
                </span>
                <span className="truncate type-caption text-muted">
                    {[t(`financePage.freq.${f.frequency}`), scope, f.fee_type, f.valid_from ? t('financePage.fees.from', { date: df.date(f.valid_from) }) : null].filter(Boolean).join(', ')}
                </span>
                {f.is_active && reachOf(f.id) && reachOf(f.id)!.enrolled > 0 && (() => {
                    const r = reachOf(f.id)!;
                    const short = f.class_id != null && r.charged < r.enrolled;
                    return (
                        <span className={cn('type-caption', short ? 'text-warn' : 'text-muted')}>
                            {t('financePage.fees.reach', { a: formatCount(r.charged, lang), b: formatCount(r.enrolled, lang), name: className })}
                            {short && ` ${t('financePage.fees.reachShort', { count: r.enrolled - r.charged, n: formatCount(r.enrolled - r.charged, lang) })}`}
                        </span>
                    );
                })()}
            </span>
            <span className={cn('shrink-0 type-body-semibold tabular-nums', f.is_active ? 'text-ink' : 'text-muted line-through')}>{formatRs(f.amount, lang)}</span>
            <ActionMenu label={t('financePage.payments.more')} items={[
                { label: t('financePage.fees.chargeTo', { name: className }), icon: UserPlus, onSelect: () => setCharging(f), hidden: !f.is_active || !can('finances', 'create') },
                { label: t('financePage.fees.edit'), icon: Pencil, onSelect: () => setEditing(f), hidden: !can('finances', 'update') },
                { label: t('financePage.fees.stop'), icon: Ban, tone: 'bad', onSelect: () => askDeactivate(f), hidden: !f.is_active || !can('finances', 'delete') },
            ]} />
        </li>
    );

    const tiles = [
        { label: t('financePage.freq.monthly'), value: s.monthly },
        { label: t('financePage.freq.quarterly'), value: s.perTerm },
        { label: t('financePage.freq.yearly'), value: s.yearly },
    ];

    return (
        <div className="flex min-w-0 flex-col gap-3.5">
            {confirmUI}
            {noticeUI}
            <Card aria-labelledby={titleId} className="gap-4">
                <CardHeader titleId={titleId} title={className}
                    subtitle={t('financePage.fees.activeItems', { count: s.activeCount, n: formatCount(s.activeCount, lang) })}
                    action={can('finances', 'create') && <Button variant="quiet" size="sm" leftIcon={Plus} onClick={() => onAdd(classId)}>{t('financePage.fees.addTo', { name: className })}</Button>} />
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {tiles.map((tile) => (
                        <div key={tile.label} className="flex flex-col gap-0.5 rounded-row bg-surface-2 px-3.5 py-3">
                            <dt className="type-caption text-muted">{tile.label}</dt>
                            <dd className="type-body-semibold tabular-nums text-ink">{tile.value > 0 ? formatRs(tile.value, lang) : '—'}</dd>
                        </div>
                    ))}
                    <div className="flex flex-col gap-0.5 rounded-row bg-primary-soft px-3.5 py-3">
                        <dt className="type-caption text-primary-text">{t('financePage.fees.newTotal')}</dt>
                        <dd className="type-body-semibold tabular-nums text-primary-text">{s.newStudent > 0 ? formatRs(s.newStudent, lang) : '—'}</dd>
                        <dd className="type-micro text-primary-text/80">{t('financePage.fees.newTotalSub')}</dd>
                    </div>
                </dl>
            </Card>

            <Card className="gap-3">
                <CardHeader title={t('financePage.fees.forClass', { name: className })} />
                {fees.length === 0 ? (
                    <EmptyState icon={Landmark} title={t('financePage.fees.noneForClass', { name: className })}
                        action={can('finances', 'create') && <Button variant="quiet" size="sm" leftIcon={Plus} onClick={() => onAdd(classId)}>{t('financePage.fees.addTo', { name: className })}</Button>}>
                        {t('financePage.fees.noneForClassBody')}
                    </EmptyState>
                ) : (
                    <ul className="flex flex-col divide-y divide-line-subtle">{ordered(fees).map((f) => row(f, className))}</ul>
                )}
            </Card>

            {schoolWide.length > 0 && (
                <Card className="gap-3">
                    <CardHeader title={t('financePage.fees.allClasses')} subtitle={t('financePage.fees.allClassesSub')} />
                    <ul className="flex flex-col divide-y divide-line-subtle">{ordered(schoolWide).map((f) => row(f, t('financePage.fees.allClassesShort')))}</ul>
                </Card>
            )}

            {charging && <ChargeDialog fee={charging} classId={classId} className={className} reach={reachOf(charging.id)}
                onDone={(res) => { setCharging(null); notify({ tone: 'ok', title: t('financePage.fees.charged', { count: res.added, n: formatCount(res.added, lang), name: charging.name }) }); }}
                onClose={() => setCharging(null)} />}
            {editing && <EditFeeDialog key={editing.id} fee={editing} scope={editing.class_id == null ? t('financePage.fees.allClassesShort') : className} onClose={() => setEditing(null)} />}
        </div>
    );
}

/** Charge one fee to a whole class, or to one of its sections. */
function ChargeDialog({ fee, classId, className, reach, onDone, onClose }: {
    fee: FeeStructure;
    classId: number;
    className: string;
    reach?: { charged: number; enrolled: number };
    onDone: (res: { added: number; already: number; enrolled: number }) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const [sectionId, setSectionId] = useState('');
    const sections = useQuery({ queryKey: ['sections', classId], queryFn: () => academicsService.getSections({ class_id: classId, limit: 100 }) });
    const charge = useMutation({
        mutationFn: () => financesService.chargeFeeToClass(fee.id, { class_id: classId, section_id: sectionId ? Number(sectionId) : undefined }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['fee-reach'] });
            queryClient.invalidateQueries({ queryKey: ['finances'] });
            onDone(res);
        },
    });
    const missing = reach ? reach.enrolled - reach.charged : undefined;
    const list = sections.data?.sections ?? [];
    return (
        <Dialog open onClose={onClose} dismissible={!charge.isPending} icon={UserPlus}
            title={t('financePage.fees.chargeTitle', { name: fee.name })}
            subtitle={t('financePage.fees.chargeSub', { amount: formatRs(fee.amount, lang), often: t(`financePage.freq.${fee.frequency}`) })}
            closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={charge.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button leftIcon={UserPlus} loading={charge.isPending} onClick={() => charge.mutate()}>{t('financePage.fees.chargeButton')}</Button>
            </>}>
            {charge.isError && <Banner tone="bad" title={t('financePage.fees.chargeFailed')}>{errorText(charge.error, t('peoplePage.error.body'))}</Banner>}
            <SelectField label={t('financePage.fees.chargeWho')} value={sectionId} onChange={(e) => setSectionId(e.target.value)}
                options={[{ value: '', label: t('financePage.fees.wholeClass', { name: className }) },
                    ...list.map((s) => ({ value: String(s.id), label: t('financePage.fees.sectionOnly', { name: `${className} ${s.name}` }) }))]} />
            {!sectionId && missing !== undefined && (
                <p className="type-small text-ink-2">
                    {missing > 0 ? t('financePage.fees.willCharge', { count: missing, n: formatCount(missing, lang), already: formatCount(reach!.charged, lang) })
                        : t('financePage.fees.allCharged', { n: formatCount(reach!.enrolled, lang) })}
                </p>
            )}
            <p className="type-caption text-muted">{t('financePage.fees.chargeNote')}</p>
        </Dialog>
    );
}
