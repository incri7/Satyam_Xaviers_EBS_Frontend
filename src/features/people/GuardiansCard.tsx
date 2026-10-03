import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link2, Mail, Pencil, Phone, Star, Unlink, UserPlus, Users } from 'lucide-react';

import { ActionMenu, Badge, Banner, Button, Card, CardHeader, Checkbox, Dialog, EmptyState, SegmentedControl } from '../../design-system';
import { RELATIONSHIPS, peopleService, type GuardianRelationship } from '../../api/services/people.service';
import { RelationshipSelect } from './RelationshipSelect';
import { TickList } from './TickList';
import { StaffPicker } from './StaffPicker';
import { ticked, useSiblings } from './familyQueries';
import type { Guardian, StudentProfile } from '../../api/services/profiles.service';
import type { Parent } from '../../types/people';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { RegistrationModal } from '../../components/registration/RegistrationModal';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { errorText } from './format';
import { ParentPicker } from './ParentPicker';
import { useNotice } from './useNotice';


/**
 * A student's guardians on their profile: who they are, who is the main
 * contact (the absence SMS goes to them), and, for the office, linking a
 * guardian already on the register, registering a new one for this child,
 * changing the relationship or main contact, and unlinking.
 */
export function GuardiansCard({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const editable = can('students', 'update');
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [adding, setAdding] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [relating, setRelating] = useState<Guardian | null>(null);
    const student = data.student;
    const guardians = data.guardians;
    const siblings = useSiblings(student.id, { currentOnly: false });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['student-profile', student.id] });
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['parents'] });
    };
    const failed = (err: unknown) => notify({ tone: 'bad', title: t('guardians.failed'), body: errorText(err, t('peoplePage.error.body')) });

    const makeMain = useMutation({
        mutationFn: (g: Guardian) => peopleService.updateGuardian(student.id, g.parent_id, { is_primary_contact: true }),
        onSuccess: (_, g) => { refresh(); notify({ tone: 'ok', title: t('guardians.mainDone', { name: g.name }) }); },
        onError: failed,
    });
    const unlink = useMutation({
        mutationFn: (g: Guardian) => peopleService.removeGuardian(student.id, g.parent_id),
        onSuccess: (_, g) => { refresh(); notify({ tone: 'ok', title: t('guardians.unlinkDone', { name: g.name, child: student.first_name }) }); },
        onError: failed,
    });

    const askUnlink = (g: Guardian) => confirm({
        title: t('guardians.unlinkTitle', { name: g.name }),
        body: guardians.length === 1
            ? t('guardians.unlinkLastBody', { name: g.name, child: student.first_name })
            : g.is_primary_contact
                ? t('guardians.unlinkMainBody', { name: g.name, child: student.first_name })
                : t('guardians.unlinkBody', { name: g.name, child: student.first_name }),
        confirmLabel: t('guardians.unlink'),
        onConfirm: () => unlink.mutate(g),
    });

    const addButton = editable && (
        <Button variant="quiet" size="sm" leftIcon={UserPlus} onClick={() => setAdding(true)}>{t('guardians.add')}</Button>
    );

    return (
        <Card>
            {confirmUI}
            {noticeUI}
            <CardHeader title={t('profile.guardians')} action={guardians.length > 0 ? addButton : undefined} />
            {guardians.length === 0 ? (
                <EmptyState icon={Users} title={t('profile.noGuardians')} action={addButton}>{t('guardians.noneBody')}</EmptyState>
            ) : (
                <ul className="flex flex-col gap-2">
                    {guardians.map((g) => (
                        <li key={g.parent_id} className="flex flex-col gap-2 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-3">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="shrink-0 text-muted" aria-hidden />
                                <span className="min-w-0 flex-1 truncate type-body-semibold text-ink">{g.name}</span>
                                {g.is_primary_contact && <Badge tone="brand">{t('profile.primary')}</Badge>}
                                {!g.has_login && <Badge tone="neutral">{t('guardians.noLogin')}</Badge>}
                                {editable && (
                                    <ActionMenu label={t('guardians.actionsFor', { name: g.name })} items={[
                                        { label: t('guardians.makeMain'), icon: Star, onSelect: () => makeMain.mutate(g), hidden: g.is_primary_contact },
                                        { label: t('guardians.changeRelationship'), icon: Pencil, onSelect: () => setRelating(g) },
                                        { label: t('guardians.unlink'), icon: Unlink, tone: 'bad', onSelect: () => askUnlink(g) },
                                    ]} />
                                )}
                            </div>
                            <p className="type-caption text-muted">
                                {[g.relationship ? t(`registerFamily.relationship.${g.relationship}`, { defaultValue: g.relationship }) : null, g.occupation].filter(Boolean).join(', ')}
                            </p>
                            {g.is_primary_contact && !g.has_login && (
                                <p className="type-caption text-warn">{t('guardians.mainNoLogin')}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {g.phone && (
                                    <a href={`tel:${g.phone}`} className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-surface px-3 type-label-s text-ink ring-1 ring-inset ring-line outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">
                                        <Phone size={14} aria-hidden /> {g.phone}
                                    </a>
                                )}
                                {g.email && (
                                    <a href={`mailto:${g.email}`} className="inline-flex h-[34px] min-w-0 items-center gap-1.5 rounded-full bg-surface px-3 type-label-s text-ink ring-1 ring-inset ring-line outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-focus/60">
                                        <Mail size={14} aria-hidden /> <span className="truncate">{g.email}</span>
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {siblings.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 border-t border-line-subtle pt-3">
                    <p className="type-small-semibold text-ink">{t('family.siblingsTitle')}</p>
                    <ul className="flex flex-col gap-1">
                        {siblings.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center gap-x-2 type-small">
                                <Link to={`/people/students/${s.id}`} className="rounded-sm font-medium text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60">{s.name}</Link>
                                <span className="text-muted">{[s.admission_no, s.status !== 'active' ? t(`peoplePage.status.${s.status}`, { defaultValue: s.status }) : null].filter(Boolean).join(', ')}</span>
                                {s.missing_guardian_ids.length > 0 && s.status === 'active' && (
                                    <span className="type-caption text-warn">
                                        {t('family.missingGuardians', { names: s.missing_guardian_ids.map((id) => guardians.find((g) => g.parent_id === id)?.name).filter(Boolean).join(', ') })}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {adding && (
                <AddGuardianDialog
                    data={data}
                    onClose={() => setAdding(false)}
                    onRegisterNew={() => { setAdding(false); setRegistering(true); }}
                    onAdded={(name) => { refresh(); notify({ tone: 'ok', title: t('guardians.linkDone', { name, child: student.first_name }) }); }}
                />
            )}
            {relating && <RelationshipDialog studentId={student.id} guardian={relating} onClose={() => setRelating(null)} onSaved={refresh} />}
            {registering && (
                <RegistrationModal
                    isOpen
                    onClose={() => { setRegistering(false); refresh(); }}
                    withStudent={{ id: student.id, name: student.name, sub: [data.enrollment?.class_name, data.enrollment?.section_name].filter(Boolean).join(' ') || undefined }}
                />
            )}
        </Card>
    );
}

function AddGuardianDialog({ data, onClose, onRegisterNew, onAdded }: {
    data: StudentProfile;
    onClose: () => void;
    onRegisterNew: () => void;
    onAdded: (name: string) => void;
}) {
    const { t } = useTranslation();
    // On the register, a member of staff (whose own child this is), or new.
    const [mode, setMode] = useState<'register' | 'staff' | 'new'>('register');
    const [staffError, setStaffError] = useState<string | null>(null);
    const asGuardian = useMutation({
        mutationFn: (userId: number) => peopleService.guardianForStaff(userId),
        onSuccess: (p) => { setParent(p); setMode('register'); },
        onError: (err) => setStaffError(errorText(err, t('peoplePage.error.body'))),
    });
    const [parent, setParent] = useState<Parent | null>(null);
    // Chosen every time: a default records the wrong relationship unnoticed.
    const [relationship, setRelationship] = useState<GuardianRelationship | ''>('');
    const [relError, setRelError] = useState(false);
    const [main, setMain] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const student = data.student;
    const currentMain = data.guardians.find((g) => g.is_primary_contact);
    const siblings = useSiblings(student.id);
    const [skipped, setSkipped] = useState<number[]>([]);
    const parentName = parent ? `${parent.first_name} ${parent.last_name ?? ''}`.trim() : '';

    const link = useMutation({
        mutationFn: () => peopleService.addGuardian(student.id, {
            parent_id: parent!.id,
            relationship_type: relationship || undefined,
            // Unticked: the server decides (main if nobody reachable is).
            is_primary_contact: main ? true : undefined,
            // The brothers and sisters, unless unticked (a half-brother).
            also_student_ids: ticked(siblings.map((s) => s.id), skipped),
        }),
        onSuccess: () => { onAdded(`${parent!.first_name} ${parent!.last_name ?? ''}`.trim()); onClose(); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!link.isPending}
            icon={Link2}
            title={t('guardians.addTitle', { child: student.first_name })}
            subtitle={t('guardians.addSubtitle')}
            closeLabel={t('common.close')}
            onSubmit={(e) => {
                e.preventDefault();
                if (mode !== 'register' || !parent) return;
                if (!relationship) { setRelError(true); return; }
                setError(null);
                link.mutate();
            }}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={link.isPending} className="sm:mr-auto">{t('addChild.action.cancel')}</Button>
                    {mode === 'register' ? (
                        <Button type="submit" leftIcon={Link2} loading={link.isPending} disabled={!parent}>{t('guardians.link')}</Button>
                    ) : (
                        <Button leftIcon={UserPlus} onClick={onRegisterNew}>{t('guardians.registerNew')}</Button>
                    )}
                </>
            }
        >
            <SegmentedControl<'register' | 'staff' | 'new'>
                aria-label={t('guardians.addTitle', { child: student.first_name })}
                value={mode}
                onChange={setMode}
                className="w-full [&>*]:flex-1"
                options={[{ value: 'register', label: t('guardians.mode.register') }, { value: 'staff', label: t('family.staff.mode') }, { value: 'new', label: t('guardians.mode.new') }]}
            />
            {mode === 'staff' ? (
                <>
                    {staffError && <Banner tone="bad" title={t('guardians.failed')}>{staffError}</Banner>}
                    <p className="type-small text-muted">{t('family.staff.explain', { child: student.first_name })}</p>
                    <StaffPicker label={t('family.staff.who')} busy={asGuardian.isPending} onPick={(u) => { setStaffError(null); asGuardian.mutate(u.id); }} />
                </>
            ) : mode === 'new' ? (
                <p className="type-body text-muted">{t('guardians.newBody', { child: student.first_name })}</p>
            ) : (
                <>
                    {error && <Banner tone="bad" title={t('guardians.failed')}>{error}</Banner>}
                    <ParentPicker label={t('guardians.who')} value={parent} onChange={setParent} exclude={data.guardians.map((g) => g.parent_id)} />
                    <RelationshipSelect label={t('peopleRules.relationshipFrom', { parent: parent ? `${parent.first_name} ${parent.last_name ?? ''}`.trim() : t('guardians.who') })}
                        value={relationship} onChange={(r) => { setRelationship(r); setRelError(false); }}
                        error={relError && !relationship ? t('peopleRules.relationshipRequired') : undefined} />
                    {parent && (
                        <TickList title={t('family.alsoSiblings', { parent: parentName })}
                            items={siblings.map((s) => ({ id: s.id, label: s.name, sub: s.admission_no }))}
                            skipped={skipped} onToggle={(id) => setSkipped((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))} />
                    )}
                    <div className="flex flex-col gap-1">
                        <Checkbox label={t('guardians.makeMainToo')} checked={main} onChange={(e) => setMain(e.target.checked)} />
                        <p className="type-caption text-muted">
                            {currentMain ? t('guardians.mainNow', { name: currentMain.name }) : t('guardians.mainNobody')}
                        </p>
                    </div>
                </>
            )}
        </Dialog>
    );
}

function RelationshipDialog({ studentId, guardian, onClose, onSaved }: {
    studentId: number;
    guardian: Guardian;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const [value, setValue] = useState<GuardianRelationship | ''>(
        RELATIONSHIPS.includes(guardian.relationship as GuardianRelationship) ? guardian.relationship as GuardianRelationship : '',
    );
    const [error, setError] = useState<string | null>(null);
    const save = useMutation({
        mutationFn: () => peopleService.updateGuardian(studentId, guardian.parent_id, { relationship_type: value || null }),
        onSuccess: () => { onSaved(); onClose(); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    return (
        <Dialog
            open
            size="sm"
            onClose={onClose}
            dismissible={!save.isPending}
            icon={Pencil}
            title={t('guardians.relationshipTitle', { name: guardian.name })}
            closeLabel={t('common.close')}
            onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={save.isPending} className="sm:mr-auto">{t('addChild.action.cancel')}</Button>
                    <Button type="submit" loading={save.isPending}>{t('guardians.save')}</Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('guardians.failed')}>{error}</Banner>}
            <RelationshipSelect label={t('guardians.relationshipTitle', { name: guardian.name })} value={value} onChange={setValue} />
        </Dialog>
    );
}
