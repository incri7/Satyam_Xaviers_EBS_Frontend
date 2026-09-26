import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Bell, Briefcase, History, KeyRound, LogOut, MessageSquare, Pencil, RotateCw, ShieldCheck, UserRound } from 'lucide-react';

import { Avatar, Badge, Banner, Button, Card, CardHeader, EmptyState, Skeleton, ToggleRow } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { peopleService } from '../../api/services/people.service';
import { authService, type NotificationPreferences } from '../../api/services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { homeForRole } from '../../utils/roleHome';
import { errorText } from '../../features/people/format';
import { SignedInDevices } from '../../features/account/SignedInDevices';
import { ChangePhoneDialog } from '../../features/account/ChangePhoneDialog';
import { ChangeNameDialog } from '../../features/account/ChangeNameDialog';
import { useDisplayName } from '../../features/shell/identity';
import { useHasActivity } from '../../features/shell/navigation';

type PrefKey = keyof NotificationPreferences;
/** Only the notifications a role can actually receive. */
const PREFS_FOR: Record<string, PrefKey[]> = {
    parent: ['sms_absence', 'push_absence', 'push_fee_reminder', 'push_notices'],
    student: ['push_notices'],
};
const STAFF_PREFS: PrefKey[] = ['push_leave_decision', 'push_notices'];

interface MeRecord {
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    phone?: string | null;
    email?: string | null;
    staff_code?: string | null;
    designation?: string | null;
    qualification?: string | null;
    experience_years?: number | null;
    join_date?: string | null;
    created_at?: string;
    user?: { email?: string; phone?: string; created_at?: string; last_login?: string | null } | null;
    last_login?: string | null;
}

/**
 * Figma A05 My profile: who you are to the school, your security, and your
 * language and notification choices. Details are kept by the office, except
 * the phone number, which each person keeps up to date themselves because
 * the school's SMS go to it. The switches save straight away.
 */
const ProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const isParent = user?.role === 'parent';
    const role = user?.role ?? '';
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneSaved, setPhoneSaved] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);
    const displayName = useDisplayName();
    const hasActivity = useHasActivity();

    const me = useQuery({ queryKey: ['me'], queryFn: peopleService.getMe, retry: 1 });
    const prefs = useQuery({ queryKey: ['notification-preferences'], queryFn: authService.getNotificationPreferences });
    const setPref = useMutation({
        mutationFn: (patch: Partial<NotificationPreferences>) => authService.updateNotificationPreferences(patch),
        onMutate: async (patch) => {
            // Switches move at once; a failed save puts them back.
            const prev = queryClient.getQueryData<NotificationPreferences>(['notification-preferences']);
            if (prev) queryClient.setQueryData(['notification-preferences'], { ...prev, ...patch });
            return { prev };
        },
        onError: (_e, _p, ctx) => ctx?.prev && queryClient.setQueryData(['notification-preferences'], ctx.prev),
        onSuccess: (data) => queryClient.setQueryData(['notification-preferences'], data),
    });

    const record = (me.data ?? {}) as MeRecord;
    const first = record.first_name ?? user?.firstName ?? '';
    const last = record.last_name ?? user?.lastName ?? '';
    // The name the person chose wins; else their record's; the email last.
    const ownName = user?.full_name || [first, record.middle_name, last].filter(Boolean).join(' ');
    const name = ownName || displayName;
    const email = record.email ?? record.user?.email ?? user?.email;
    const phone = record.phone ?? record.user?.phone ?? user?.phone;
    const since = record.user?.created_at ?? record.created_at ?? user?.created_at;
    const lastLogin = record.last_login ?? record.user?.last_login;
    const roleName = t(`accessPage.role.${role}`, { defaultValue: role });
    const prefKeys = PREFS_FOR[role] ?? STAFF_PREFS;
    const professional = [
        ['staffCode', record.staff_code],
        ['designation', record.designation],
        ['qualification', record.qualification],
        ['experience', record.experience_years != null ? t('profilePageMe.years', { count: record.experience_years }) : null],
        ['joined', record.join_date ? df.date(record.join_date) : null],
    ].filter(([, v]) => v) as [string, string][];

    const field = (label: string, value?: string | null) => (
        <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="type-caption text-muted">{label}</dt>
            <dd className="truncate type-body-medium text-ink">{value || <span className="text-muted">{t('profilePageMe.notGiven')}</span>}</dd>
        </div>
    );

    return (
        <AppPage title={t('profilePageMe.title')} noSidebarOffset={isParent}>
            {isParent && <Button variant="quiet" leftIcon={ArrowLeft} className="w-fit" onClick={() => navigate(homeForRole('parent'))}>{t('noticesPage.back')}</Button>}

            <Card className="gap-4 sm:flex-row sm:items-center">
                <Avatar name={name || '?'} size={72} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {me.isPending ? <Skeleton className="h-7 w-56" /> : <h2 className="truncate type-h2 text-ink">{name}</h2>}
                    <p className="flex flex-wrap items-center gap-2 type-small text-ink-2">
                        <Badge tone="brand">{roleName}</Badge>
                        {record.designation && <span>{record.designation}</span>}
                        {since && <span className="text-muted">{t('profilePageMe.since', { year: df.year(since) })}</span>}
                    </p>
                </div>
            </Card>

            {me.isError && (
                <Card>
                    <EmptyState icon={AlertCircle} tone="bad" title={t('profilePageMe.errorTitle')}
                        action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void me.refetch()}>{t('classesPage.action.retry')}</Button>}>
                        {t('profilePageMe.errorBody')}
                    </EmptyState>
                </Card>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                    <Card className="gap-4">
                        <CardHeader title={t('profilePageMe.personal')} subtitle={t('profilePageMe.officeKeeps')} />
                        {nameSaved && <Banner tone="ok" title={t('profilePageMe.nameEdit.saved')}>{t('profilePageMe.nameEdit.savedBody')}</Banner>}
                        {phoneSaved && <Banner tone="ok" title={t('profilePageMe.phoneEdit.saved')}>{t('profilePageMe.phoneEdit.savedBody')}</Banner>}
                        {me.isPending ? <Skeleton className="h-24" /> : (
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <div className="flex min-w-0 items-end gap-2">
                                    <div className="min-w-0 flex-1">{field(t('profilePageMe.fullName'), ownName)}</div>
                                    <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => { setNameSaved(false); setEditingName(true); }}>
                                        {t('profilePageMe.phoneEdit.change')}
                                    </Button>
                                </div>
                                {field(t('profilePageMe.email'), email)}
                                <div className="flex min-w-0 items-end gap-2">
                                    <div className="min-w-0 flex-1">{field(t('profilePageMe.phone'), phone)}</div>
                                    <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => { setPhoneSaved(false); setEditingPhone(true); }}>
                                        {t('profilePageMe.phoneEdit.change')}
                                    </Button>
                                </div>
                                {field(t('profilePageMe.role'), roleName)}
                            </dl>
                        )}
                    </Card>
                    {professional.length > 0 && (
                        <Card className="gap-4">
                            <CardHeader title={t('profilePageMe.professional')} subtitle={t('profilePageMe.officeKeepsShort')} action={<Briefcase size={18} className="text-muted" aria-hidden />} />
                            <dl className="grid gap-4 sm:grid-cols-2">{professional.map(([k, v]) => <React.Fragment key={k}>{field(t(`profilePageMe.${k}`), v)}</React.Fragment>)}</dl>
                        </Card>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <Card className="gap-4">
                        <CardHeader title={t('profilePageMe.security')} />
                        <div className="flex items-start gap-3 rounded-row bg-ok-soft/60 px-3.5 py-3">
                            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                            <div className="flex flex-col">
                                <p className="type-small-semibold text-ink">{t('profilePageMe.active')}</p>
                                <p className="type-caption text-ink-2">{lastLogin ? t('profilePageMe.lastLogin', { when: df.dateTime(lastLogin) }) : t('profilePageMe.signedInHere')}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button leftIcon={KeyRound} onClick={() => navigate('/reset-password')}>{t('profilePageMe.changePassword')}</Button>
                            <Button variant="quiet" leftIcon={LogOut} onClick={() => logout()}>{t('shell.account.signOut')}</Button>
                            {hasActivity && <Button variant="quiet" leftIcon={History} onClick={() => navigate('/activity')}>{t('audit.yourActivity')}</Button>}
                        </div>
                    </Card>

                    <SignedInDevices />

                    <Card className="gap-4">
                        <CardHeader title={t('profilePageMe.prefs')} subtitle={t('profilePageMe.prefsSub')} />
                        <div className="flex items-center gap-3 rounded-row border border-line-subtle px-3.5 py-3">
                            <UserRound size={18} className="shrink-0 text-muted" aria-hidden />
                            <div className="flex min-w-0 flex-1 flex-col">
                                <p className="type-small-semibold text-ink">{t('profilePageMe.language')}</p>
                                <p className="type-caption text-muted">{t('profilePageMe.languageSub')}</p>
                            </div>
                            <LanguageSwitch />
                        </div>
                        {prefs.isError ? (
                            <Banner tone="bad" title={t('profilePageMe.prefsError')}>{errorText(prefs.error, t('peoplePage.error.body'))}</Banner>
                        ) : prefKeys.map((k) => (
                            <ToggleRow key={k} icon={k.startsWith('sms') ? MessageSquare : Bell} title={t(`profilePageMe.pref.${k}.title`)}
                                checked={prefs.data?.[k] ?? true} disabled={!prefs.data || setPref.isPending}
                                onChange={(v) => setPref.mutate({ [k]: v })}>
                                {t(`profilePageMe.pref.${k}.body`)}
                            </ToggleRow>
                        ))}
                        {setPref.isError && <Banner tone="bad" title={t('profilePageMe.prefFailed')} />}
                    </Card>
                </div>
            </div>
            {editingName && (
                <ChangeNameDialog current={ownName} onClose={() => setEditingName(false)}
                    onDone={() => { setEditingName(false); setNameSaved(true); }} />
            )}
            {editingPhone && (
                <ChangePhoneDialog current={phone} onClose={() => setEditingPhone(false)}
                    onDone={() => { setEditingPhone(false); setPhoneSaved(true); }} />
            )}
        </AppPage>
    );
};

export default ProfilePage;
