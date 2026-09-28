import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { Plus, Trash2, Wand2 } from 'lucide-react';

import { Banner, Button, Card, CardHeader, Checkbox, FormRow, IconButton, Skeleton, TextField } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { schoolService, type GradeBandIn, type SchoolProfile } from '../../api/services/school.service';
import { errorText } from '../../features/people/format';

type ProfileKey = Exclude<keyof SchoolProfile, 'id'>;
const FIELDS: { key: ProfileKey; wide?: boolean; type?: string }[] = [
    { key: 'name', wide: true }, { key: 'name_nepali', wide: true }, { key: 'motto', wide: true },
    { key: 'phone', type: 'tel' }, { key: 'email', type: 'email' },
    { key: 'address_line' }, { key: 'city' }, { key: 'district' }, { key: 'province' },
    { key: 'website' }, { key: 'principal_name' },
    { key: 'pan_no' }, { key: 'registration_no' }, { key: 'estd_year' },
];

/** The NEB letter grading most Nepali schools use; a starting point to edit. */
const NEB: GradeBandIn[] = [
    { grade: 'A+', min_percent: 90, max_percent: 100, grade_point: 4.0, description: 'Outstanding', is_pass: true, sort_order: 1 },
    { grade: 'A', min_percent: 80, max_percent: 90, grade_point: 3.6, description: 'Excellent', is_pass: true, sort_order: 2 },
    { grade: 'B+', min_percent: 70, max_percent: 80, grade_point: 3.2, description: 'Very good', is_pass: true, sort_order: 3 },
    { grade: 'B', min_percent: 60, max_percent: 70, grade_point: 2.8, description: 'Good', is_pass: true, sort_order: 4 },
    { grade: 'C+', min_percent: 50, max_percent: 60, grade_point: 2.4, description: 'Satisfactory', is_pass: true, sort_order: 5 },
    { grade: 'C', min_percent: 40, max_percent: 50, grade_point: 2.0, description: 'Acceptable', is_pass: true, sort_order: 6 },
    { grade: 'D', min_percent: 35, max_percent: 40, grade_point: 1.6, description: 'Basic', is_pass: true, sort_order: 7 },
    { grade: 'NG', min_percent: 0, max_percent: 35, grade_point: 0, description: 'Not graded', is_pass: false, sort_order: 8 },
];

/**
 * School details: the letterhead receipts and report cards are printed under,
 * the phone families call from the app, and the grading scale every mark is
 * graded on. Admin and principal. No Figma frame: design-system cards.
 */
export default function SchoolSettingsPage() {
    const { t } = useTranslation();
    return (
        <AppPage title={t('schoolSettings.title')}>
            <p className="type-small text-muted">{t('schoolSettings.intro')}</p>
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <ProfileCard />
                <GradingCard />
            </div>
        </AppPage>
    );
}

function ProfileCard() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const q = useQuery({ queryKey: ['school', 'profile'], queryFn: schoolService.getProfile, retry: false });
    // A school with no profile yet answers 404: the form starts empty.
    const missing = q.isError && isAxiosError(q.error) && q.error.response?.status === 404;
    const [draft, setDraft] = useState<Partial<Record<ProfileKey, string>>>({});
    const value = (k: ProfileKey) => draft[k] ?? (q.data?.[k] as string | null | undefined) ?? '';
    const changed = Object.keys(draft).length > 0;
    const save = useMutation({
        mutationFn: () => schoolService.updateProfile(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, (v ?? '').trim() || null]))),
        onSuccess: () => {
            setDraft({});
            ['school', 'setup-check'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        },
    });
    const nameOk = !!value('name').trim();
    return (
        <Card className="gap-4">
            <CardHeader title={t('schoolSettings.profile')} subtitle={t('schoolSettings.profileSub')} />
            {q.isPending ? <Skeleton className="h-[360px]" /> : q.isError && !missing ? (
                <Banner tone="bad" title={t('schoolSettings.loadFailed')}>{errorText(q.error, t('peoplePage.error.body'))}</Banner>
            ) : (
                <>
                    {missing && <Banner tone="info" title={t('schoolSettings.newTitle')}>{t('schoolSettings.newBody')}</Banner>}
                    {save.isError && <Banner tone="bad" title={t('schoolSettings.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
                    {save.isSuccess && !changed && <Banner tone="ok" title={t('schoolSettings.saved')}>{t('schoolSettings.savedBody')}</Banner>}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {FIELDS.map((f) => (
                            <TextField key={f.key} label={t(`schoolSettings.field.${f.key}`)} type={f.type} value={value(f.key)} maxLength={255}
                                containerClassName={f.wide ? 'sm:col-span-2' : undefined}
                                hint={f.key === 'phone' ? t('schoolSettings.phoneHint') : undefined}
                                error={f.key === 'name' && changed && !nameOk ? t('schoolSettings.nameError') : undefined}
                                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button loading={save.isPending} disabled={!changed || !nameOk} onClick={() => save.mutate()}>{t('schoolSettings.save')}</Button>
                        {changed && <Button variant="ghost" onClick={() => setDraft({})}>{t('schoolSettings.undo')}</Button>}
                    </div>
                </>
            )}
        </Card>
    );
}

type Row = { grade: string; min: string; max: string; gp: string; pass: boolean; description: string };
const toRows = (bands: GradeBandIn[]): Row[] =>
    [...bands].sort((a, b) => Number(b.min_percent) - Number(a.min_percent))
        .map((b) => ({ grade: b.grade, min: String(Number(b.min_percent)), max: String(Number(b.max_percent)), gp: String(Number(b.grade_point)), pass: b.is_pass, description: b.description ?? '' }));

function GradingCard() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const q = useQuery({ queryKey: ['school', 'grade-bands'], queryFn: schoolService.getGradeBands });
    const [rows, setRows] = useState<Row[] | null>(null);
    const current = rows ?? toRows((q.data ?? []).map((b) => ({ ...b, min_percent: Number(b.min_percent), max_percent: Number(b.max_percent), grade_point: Number(b.grade_point) })));
    const set = (i: number, patch: Partial<Row>) => setRows(current.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const save = useMutation({
        mutationFn: () => schoolService.replaceGradeBands(current.map((r, i) => ({
            grade: r.grade.trim(), min_percent: Number(r.min), max_percent: Number(r.max), grade_point: Number(r.gp),
            description: r.description.trim() || null, is_pass: r.pass, sort_order: i + 1,
        }))),
        onSuccess: () => { setRows(null); qc.invalidateQueries({ queryKey: ['school', 'grade-bands'] }); qc.invalidateQueries({ queryKey: ['report-card'] }); },
    });
    const num = (v: string) => v.replace(/[^\d.]/g, '');
    return (
        <Card className="gap-3">
            <CardHeader title={t('schoolSettings.grading')} subtitle={t('schoolSettings.gradingSub')}
                action={<Button variant="quiet" size="sm" leftIcon={Wand2} onClick={() => setRows(toRows(NEB))}>{t('schoolSettings.useNeb')}</Button>} />
            {q.isPending ? <Skeleton className="h-[300px]" /> : (
                <>
                    {save.isError && <Banner tone="bad" title={t('schoolSettings.gradingFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
                    {current.length === 0 && <Banner tone="info" title={t('schoolSettings.noScale')}>{t('schoolSettings.noScaleBody')}</Banner>}
                    <ul className="flex flex-col gap-2">
                        {current.map((r, i) => (
                            <li key={i} className="flex flex-col gap-2 rounded-row border border-line-subtle p-2.5">
                                <FormRow>
                                    <TextField label={t('schoolSettings.band.grade')} value={r.grade} maxLength={5} onChange={(e) => set(i, { grade: e.target.value })} />
                                    <TextField label={t('schoolSettings.band.gp')} inputMode="decimal" value={r.gp} onChange={(e) => set(i, { gp: num(e.target.value) })} />
                                </FormRow>
                                <FormRow>
                                    <TextField label={t('schoolSettings.band.from')} inputMode="decimal" value={r.min} onChange={(e) => set(i, { min: num(e.target.value) })} />
                                    <TextField label={t('schoolSettings.band.to')} inputMode="decimal" value={r.max} onChange={(e) => set(i, { max: num(e.target.value) })} />
                                </FormRow>
                                <div className="flex items-end gap-2">
                                    <TextField label={t('schoolSettings.band.description')} optional={t('peopleForms.optional')} value={r.description}
                                        onChange={(e) => set(i, { description: e.target.value })} containerClassName="flex-1" />
                                    <Checkbox label={t('schoolSettings.band.pass')} checked={r.pass} onChange={() => set(i, { pass: !r.pass })} className="pb-3" />
                                    <IconButton icon={Trash2} size={36} variant="ghost" label={t('schoolSettings.band.remove', { grade: r.grade })} onClick={() => setRows(current.filter((_, j) => j !== i))} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setRows([...current, { grade: '', min: '', max: '', gp: '', pass: true, description: '' }])}>{t('schoolSettings.band.add')}</Button>
                        <span className="flex-1" />
                        {rows && <Button variant="ghost" onClick={() => setRows(null)}>{t('schoolSettings.undo')}</Button>}
                        <Button loading={save.isPending} disabled={!rows || current.length === 0} onClick={() => save.mutate()}>{t('schoolSettings.saveScale')}</Button>
                    </div>
                    <p className="type-caption text-muted">{t('schoolSettings.gradingNote')}</p>
                </>
            )}
        </Card>
    );
}
