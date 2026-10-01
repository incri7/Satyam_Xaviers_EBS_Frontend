import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Droplet, GraduationCap,
    MapPin, Pencil, Phone, Plus, Receipt, RotateCw, Trash2, Umbrella, Wallet,
} from 'lucide-react';

import { Badge, Banner, Button, Card, CardHeader, Dialog, EmptyState, IconButton, SelectField, Skeleton, Tabs, type TabItem } from '../../design-system';
import { financesService } from '../../api/services/finances.service';
import { useConfirmDialog } from '../../components/common/useConfirmDialog';
import { useFeeStructures } from '../../features/finance/queries';
import { errorText } from '../../features/people/format';
import { useNotice } from '../../features/people/useNotice';
import { usePermissionsStore } from '../../store/usePermissionsStore';
import { AppPage } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { EditStudentModal } from '../../components/people/EditStudentModal';
import { profilesService, type ExamResult, type StudentProfile } from '../../api/services/profiles.service';
import { peopleService } from '../../api/services/people.service';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { GuardiansCard } from '../../features/people/GuardiansCard';
import { ProfileHeader, ProfileHeaderSkeleton } from '../../features/people/ProfileHeader';
import { StudentStatusBadge } from '../../features/people/shared';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { Student } from '../../types/people';

type Tab = 'overview' | 'attendance' | 'marks' | 'fees' | 'guardians';

const DAY_TONE: Record<string, string> = {
    P: 'bg-ok text-white', L: 'bg-warn text-white', HD: 'bg-info text-white', A: 'bg-bad text-white', H: 'bg-sunken text-muted',
};

/** Figma F06 Student profile, from GET /people/students/{id}/profile. */
const StudentDetailPage = () => {
    const { studentId } = useParams();
    const { t } = useTranslation();
    // ?tab=fees opens straight on a tab (the payment form links here).
    const [params] = useSearchParams();
    const [tab, setTab] = useState<Tab>(() => (['overview', 'attendance', 'marks', 'fees', 'guardians'].includes(params.get('tab') ?? '') ? params.get('tab') as Tab : 'overview'));
    const [editing, setEditing] = useState(false);
    const id = Number(studentId);

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['student-profile', id],
        queryFn: () => profilesService.getStudentProfile(id),
        enabled: Number.isFinite(id),
    });
    // The edit dialog needs the full register record, not the profile summary.
    const { data: record } = useQuery({
        queryKey: ['student', id],
        queryFn: () => peopleService.getStudent(id) as Promise<Student>,
        enabled: editing,
    });

    if (isPending) {
        return (
            <AppPage title={t('profilePage.crumbStudents')}>
                <ProfileHeaderSkeleton />
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
                    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-card" />)}
                </div>
            </AppPage>
        );
    }
    if (isError || !data) {
        return (
            <AppPage title={t('profilePage.crumbStudents')}>
                <Card>
                    <EmptyState icon={AlertCircle} tone="bad" title={t('profilePage.loadError')}
                        action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('profilePage.retry')}</Button>}>
                        {t('profile.notFound')}
                    </EmptyState>
                </Card>
            </AppPage>
        );
    }

    const { student, enrollment, guardians } = data;
    const primary = guardians.find((g) => g.is_primary_contact && g.phone) ?? guardians.find((g) => g.phone);
    const classLine = enrollment
        ? [enrollment.class_name, enrollment.section_name].filter(Boolean).join(' ')
        : t('profile.notEnrolled');

    const tabs: TabItem<Tab>[] = [
        { value: 'overview', label: t('profilePage.tabs.overview') },
        { value: 'attendance', label: t('profilePage.tabs.attendance') },
        { value: 'marks', label: t('profilePage.tabs.marks') },
        { value: 'fees', label: t('profilePage.tabs.fees') },
        { value: 'guardians', label: t('profilePage.tabs.guardians'), count: guardians.length },
    ];

    return (
        <AppPage title={student.name}>
            <ProfileHeader
                crumb={t('profilePage.crumbStudents')}
                crumbTo="/people"
                name={student.name}
                badge={<StudentStatusBadge status={student.status} />}
                line={[classLine, student.admission_no].filter(Boolean).join(', ')}
                meta={[
                    ...(student.dob ? [{ icon: CalendarDays, label: t('profile.dob'), value: <DateText v={student.dob} /> }] : []),
                    ...(student.blood_group ? [{ icon: Droplet, label: t('profile.bloodGroup'), value: student.blood_group }] : []),
                    ...(student.city ? [{ icon: MapPin, label: t('peopleForms.label.city'), value: student.city }] : []),
                ]}
                actions={
                    <>
                        {primary?.phone && (
                            <Button variant="quiet" leftIcon={Phone} onClick={() => { window.location.href = `tel:${primary.phone}`; }}>
                                {t('profilePage.callParent')}
                            </Button>
                        )}
                        <AccessControl id="students_update">
                            <Button variant="quiet" leftIcon={Pencil} onClick={() => setEditing(true)}>{t('profilePage.edit')}</Button>
                        </AccessControl>
                    </>
                }
            />

            <Figures data={data} />

            <Tabs variant="underline" items={tabs} value={tab} onChange={setTab} aria-label={student.name} />

            <div role="tabpanel" aria-label={t(`profilePage.tabs.${tab}`)} className="min-w-0">
                {tab === 'overview' && (
                    <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-4">
                        <div className="flex min-w-0 flex-col gap-3.5">
                            <Results data={data} />
                            <Fees data={data} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-3.5">
                            <GuardiansCard data={data} />
                            <Attendance data={data} />
                            <Assignments data={data} />
                            <Leave data={data} />
                        </div>
                    </div>
                )}
                {tab === 'attendance' && <Attendance data={data} />}
                {tab === 'marks' && <Results data={data} />}
                {tab === 'fees' && <Fees data={data} />}
                {tab === 'guardians' && <GuardiansCard data={data} />}
            </div>

            {editing && record && <EditStudentModal student={record} isOpen onClose={() => setEditing(false)} />}
        </AppPage>
    );
};

function DateText({ v }: { v: string | null }) {
    const df = useDateFormat();
    return <>{v ? df.date(v, 'medium') : '—'}</>;
}

function Figures({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const { attendance, results, fees, assignments } = data;
    const latest = results.latest;
    return (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
            <KpiCard icon={CheckCircle2} tone="ok" status="ready" label={t('profile.attendance')}
                value={attendance.year_pct != null ? `${formatCount(attendance.year_pct, lang)}%` : '—'}
                sub={<span className="truncate">{t('profile.nAbsences', { count: attendance.absences })}</span>} />
            <KpiCard icon={GraduationCap} tone="brand" status="ready" label={t('profile.latestResult')}
                value={latest ? `${latest.percent.toFixed(1)}%` : '—'}
                sub={latest ? (
                    <>
                        <Badge tone={latest.result === 'FAIL' ? 'bad' : latest.result === 'PASS' ? 'ok' : 'neutral'}>{latest.grade || latest.result}</Badge>
                        <span className="truncate">{t('profile.gpaShort')} {latest.gpa.toFixed(2)}</span>
                    </>
                ) : <span className="truncate">{t('profile.noResults')}</span>} />
            <KpiCard icon={Wallet} tone={fees.balance > 0 ? 'bad' : 'ok'} status="ready" long label={t('profile.feeBalance')}
                value={formatRs(fees.balance, lang)}
                sub={<span className="truncate">{formatRs(fees.total_paid, lang)} {t('profile.paidOf')} {formatRs(fees.total_assigned, lang)}</span>} />
            <KpiCard icon={ClipboardList} tone="info" status="ready" label={t('profile.assignments')}
                value={formatCount(assignments.total, lang)}
                sub={<span className="truncate">{assignments.by_status.missing ? t('profile.nMissing', { count: assignments.by_status.missing }) : t('profile.noneMissing')}</span>} />
        </div>
    );
}

function Results({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState<number | null>(data.results.exams[0]?.exam_id ?? null);
    return (
        <Card>
            <CardHeader title={t('profile.results')} subtitle={data.results.exams_taken ? t('studentProfile.examsTaken', { count: data.results.exams_taken }) : undefined} />
            {data.results.exams.length === 0 ? (
                <p className="py-6 text-center type-small text-muted">{t('profile.noResults')}</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {data.results.exams.map((e) => (
                        <ExamRow key={e.exam_id} exam={e} open={open === e.exam_id} onToggle={() => setOpen(open === e.exam_id ? null : e.exam_id)} />
                    ))}
                </ul>
            )}
        </Card>
    );
}

function ExamRow({ exam, open, onToggle }: { exam: ExamResult; open: boolean; onToggle: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const tone = exam.result === 'PASS' ? 'ok' : exam.result === 'FAIL' ? 'bad' : 'neutral';
    return (
        <li className="overflow-hidden rounded-row border border-line-subtle">
            <button type="button" onClick={onToggle} aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate type-body-semibold text-ink">{exam.exam_name}</span>
                    <span className="truncate type-caption text-muted">{[exam.term, exam.sat_on ? df.date(exam.sat_on, 'medium') : null].filter(Boolean).join(', ')}</span>
                </div>
                <span className="type-body-semibold tabular-nums text-ink">{exam.percent.toFixed(1)}%</span>
                <span className="type-caption tabular-nums text-muted max-sm:hidden">{t('profile.gpaShort')} {exam.gpa.toFixed(2)}</span>
                <Badge tone={tone}>{exam.grade || exam.result}</Badge>
                <ChevronDown size={16} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {open && (
                <div className="overflow-x-auto border-t border-line-subtle">
                    <table className="w-full min-w-[420px] text-left">
                        <thead className="bg-surface-2">
                            <tr className="type-caption text-muted">
                                <th className="px-4 py-2">{t('profile.subject')}</th>
                                <th className="px-4 py-2 text-right">{t('profile.marks')}</th>
                                <th className="px-4 py-2 text-right">{t('profile.percent')}</th>
                                <th className="px-4 py-2 text-right">{t('profile.grade')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exam.subjects.map((s) => (
                                <tr key={s.subject_id + s.subject_name} className="border-t border-line-subtle type-small">
                                    <td className="px-4 py-2 font-medium text-ink">{s.subject_name}</td>
                                    <td className="px-4 py-2 text-right tabular-nums text-ink-2">{s.is_absent ? t('profile.absentShort') : `${s.obtained ?? '—'} / ${s.max_marks}`}</td>
                                    <td className="px-4 py-2 text-right tabular-nums text-ink-2">{s.percent != null ? `${s.percent.toFixed(1)}%` : '—'}</td>
                                    <td className={cn('px-4 py-2 text-right font-semibold', s.is_pass === false ? 'text-bad' : 'text-ink')}>{s.grade || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </li>
    );
}

function Fees({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const can = usePermissionsStore((s) => s.hasPermission);
    const [confirmUI, confirm] = useConfirmDialog();
    const [noticeUI, notify] = useNotice();
    const [adding, setAdding] = useState(false);
    const { fees } = data;
    const last = fees.payments.find((p) => p.amount > 0);
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['student-profile', data.student.id] });
        queryClient.invalidateQueries({ queryKey: ['finances'] });
        queryClient.invalidateQueries({ queryKey: ['fee-reach'] });
    };
    const remove = useMutation({
        mutationFn: (assignmentId: number) => financesService.removeStudentFee(assignmentId),
        onSuccess: refresh,
        onError: (err) => notify({ tone: 'bad', title: t('profilePage.feeRemoveFailed'), body: errorText(err, t('peoplePage.error.body')) }),
    });
    const askRemove = (l: StudentProfile['fees']['ledger'][number]) => confirm({
        title: t('profilePage.feeRemoveTitle', { name: l.name }),
        body: t('profilePage.feeRemoveBody', { student: data.student.first_name }),
        confirmLabel: t('profilePage.feeRemove'),
        onConfirm: () => remove.mutate(l.assignment_id!),
    });
    const often = (l: StudentProfile['fees']['ledger'][number]) => {
        const kind = t(`childPage.often.${l.frequency}`, { defaultValue: l.frequency });
        return l.periods > 1 ? t('childPage.periodsOf', { kind, n: formatCount(l.periods, df.lang), amount: formatRs(l.unit_amount, df.lang) }) : kind;
    };
    return (
        <Card className="gap-2.5">
            {confirmUI}
            {noticeUI}
            <CardHeader title={t('profile.feeLedger')} subtitle={last?.paid_at ? t('profilePage.lastPayment', { amount: formatRs(last.amount, df.lang), date: df.date(last.paid_at, 'medium') }) : undefined}
                action={can('finances', 'create') && <Button variant="quiet" size="sm" leftIcon={Plus} onClick={() => setAdding(true)}>{t('profilePage.feeAdd')}</Button>} />
            {fees.ledger.length === 0 ? (
                <EmptyState icon={Wallet} title={t('profilePage.noFees')}
                    action={can('finances', 'create') && <Button variant="quiet" size="sm" leftIcon={Plus} onClick={() => setAdding(true)}>{t('profilePage.feeAdd')}</Button>}>
                    {t('profilePage.noFeesBody')}
                </EmptyState>
            ) : (
                <div className="-mx-5 overflow-x-auto">
                    <table className="w-full min-w-[460px] text-left">
                        <thead className="border-y border-line-subtle bg-surface-2">
                            <tr className="type-caption text-muted">
                                <th className="px-5 py-2">{t('profile.feeHead')}</th>
                                <th className="px-3 py-2 text-right">{t('profile.assigned')}</th>
                                <th className="px-3 py-2 text-right">{t('profile.paid')}</th>
                                <th className="px-3 py-2 text-right">{t('profile.balance')}</th>
                                <th className="w-12 pr-3"><span className="sr-only">{t('classesPage.col.actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.ledger.map((l) => (
                                <tr key={l.fee_structure_id} className="border-b border-line-subtle type-small">
                                    <td className="px-5 py-3">
                                        <span className="block font-medium text-ink">{l.name}</span>
                                        <span className="block type-caption text-muted">{often(l)}{l.scholarship > 0 && `, ${t('childPage.scholarshipOff', { amount: formatRs(l.scholarship, df.lang) })}`}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums text-ink-2">{formatRs(l.assigned, df.lang)}</td>
                                    <td className="px-3 py-3 text-right tabular-nums text-ok">{formatRs(l.paid, df.lang)}</td>
                                    <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', l.balance > 0 ? 'text-bad' : 'text-muted')}>{formatRs(l.balance, df.lang)}</td>
                                    <td className="pr-3">
                                        {can('finances', 'delete') && l.assignment_id && (
                                            <IconButton icon={Trash2} size={32} variant="ghost" label={t('profilePage.feeRemoveLabel', { name: l.name })} onClick={() => askRemove(l)} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                            <tr className="type-small-semibold">
                                <td className="px-5 py-2.5 text-ink">{t('profilePage.total')}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{formatRs(fees.total_assigned, df.lang)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-ok">{formatRs(fees.total_paid, df.lang)}</td>
                                <td className={cn('px-3 py-2.5 text-right tabular-nums', fees.balance > 0 ? 'text-bad' : 'text-muted')}>{formatRs(fees.balance, df.lang)}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
            {adding && <AddFeeDialog data={data} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); refresh(); }} />}
            {fees.payments.length > 0 && (
                <div className="flex flex-col">
                    <p className="mt-2 mb-1 type-caption-semibold text-muted">{t('profile.payments')}</p>
                    <ul>
                        {fees.payments.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                                <Receipt size={16} className="shrink-0 text-muted" aria-hidden />
                                <div className="flex min-w-0 flex-1 flex-col gap-px">
                                    <span className="truncate type-small-medium text-ink">{p.fee_head || t('profile.unallocated')}</span>
                                    <span className="truncate font-mono text-[11px] text-muted">{[p.receipt_no, p.paid_at ? df.date(p.paid_at, 'medium') : null].filter(Boolean).join(', ')}</span>
                                </div>
                                <span className={cn('shrink-0 type-small-semibold tabular-nums', p.amount < 0 ? 'text-bad' : 'text-ok')}>{formatRs(p.amount, df.lang)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

/** Charge one more fee to this student: their class's fees and the school-wide ones. */
function AddFeeDialog({ data, onClose, onAdded }: { data: StudentProfile; onClose: () => void; onAdded: () => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const fees = useFeeStructures(true);
    const [feeId, setFeeId] = useState('');
    const have = new Set(data.fees.ledger.map((l) => l.fee_structure_id));
    const classId = data.enrollment?.class_id;
    const options = (fees.data ?? [])
        .filter((f) => f.is_active && !have.has(f.id) && (f.class_id == null || f.class_id === classId))
        .sort((a, b) => Number(a.class_id == null) - Number(b.class_id == null) || a.name.localeCompare(b.name));
    const add = useMutation({
        mutationFn: () => financesService.assignFeeToStudent({ student_id: data.student.id, fee_structure_id: Number(feeId) }),
        onSuccess: onAdded,
    });
    return (
        <Dialog open onClose={onClose} dismissible={!add.isPending} icon={Wallet}
            title={t('profilePage.feeAddTitle', { name: data.student.first_name })}
            subtitle={data.enrollment?.class_name ? t('profilePage.feeAddSub', { name: data.enrollment.class_name }) : undefined}
            closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={add.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button leftIcon={Plus} loading={add.isPending} disabled={!feeId} onClick={() => add.mutate()}>{t('profilePage.feeAdd')}</Button>
            </>}>
            {add.isError && <Banner tone="bad" title={t('profilePage.feeAddFailed')}>{errorText(add.error, t('peoplePage.error.body'))}</Banner>}
            {fees.isPending ? <Skeleton className="h-12" /> : options.length === 0 ? (
                <p className="type-small text-muted">{t('profilePage.feeNoneLeft')}</p>
            ) : (
                <SelectField label={t('profilePage.feeWhich')} value={feeId} placeholder={t('profilePage.feePick')} onChange={(e) => setFeeId(e.target.value)}
                    options={options.map((f) => ({
                        value: String(f.id),
                        label: `${f.name} · ${formatRs(f.amount, lang)} · ${t(`financePage.freq.${f.frequency}`)}${f.class_id == null ? ` · ${t('financePage.fees.allClassesShort')}` : ''}`,
                    }))} />
            )}
            <p className="type-caption text-muted">{t('profilePage.feeAddNote')}</p>
        </Dialog>
    );
}

function Attendance({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { attendance } = data;
    const pct = (v: number | null) => (v != null ? `${formatCount(v, df.lang)}%` : '—');
    return (
        <Card>
            <CardHeader title={t('profile.attendance')} subtitle={t('profile.nAbsences', { count: attendance.absences })} />
            <div className="grid grid-cols-2 gap-3">
                {[[t('profile.thisYear'), attendance.year_pct], [t('profile.last30'), attendance.last_30_pct]].map(([label, v]) => (
                    <div key={String(label)} className="rounded-row bg-surface-2 px-3.5 py-3">
                        <p className="type-caption text-muted">{label}</p>
                        <p className="type-figure-m text-ink">{pct(v as number | null)}</p>
                    </div>
                ))}
            </div>
            {attendance.recent.length > 0 && (
                <>
                    <p className="type-caption-semibold text-muted">{t('profile.recentDays')}</p>
                    <ul className="flex flex-wrap gap-[5px]">
                        {attendance.recent.map((r) => (
                            <li key={r.date} title={`${df.date(r.date, 'medium')}: ${t(`profilePage.status.${r.status}`, { defaultValue: r.status })}`}
                                className={cn('grid size-7 place-items-center rounded-[8px] type-micro-bold', DAY_TONE[r.status] ?? 'bg-sunken text-muted')}>
                                {r.status}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {(['P', 'A', 'L', 'HD'] as const).map((s) => (
                            <span key={s} className="inline-flex items-center gap-1.5 type-caption text-ink-2">
                                <span aria-hidden className={cn('size-2 rounded-[3px]', DAY_TONE[s].split(' ')[0])} />
                                {t(`profilePage.status.${s}`)}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
}

function Assignments({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { assignments } = data;
    if (assignments.total === 0) return null;
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('profile.assignments')} subtitle={assignments.by_status.missing ? t('profile.nMissing', { count: assignments.by_status.missing }) : t('profile.noneMissing')} />
            <ul>
                {assignments.recent.slice(0, 5).map((a) => (
                    <li key={a.assignment_id} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                        <div className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate type-small-medium text-ink">{a.title}</span>
                            <span className="truncate type-caption text-muted">{[a.subject_name, a.due_date ? df.date(a.due_date, 'medium') : null].filter(Boolean).join(', ')}</span>
                        </div>
                        <Badge tone={a.status === 'graded' ? 'ok' : a.status === 'missing' ? 'bad' : a.status === 'submitted' ? 'brand' : 'neutral'}>{a.grade || a.status}</Badge>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function Leave({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { leave } = data;
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('profile.leave')} />
            {leave.requests.length === 0 ? (
                <p className="py-2 type-small text-muted">{t('profile.noLeaveRequests')}</p>
            ) : (
                <ul>
                    {leave.requests.slice(0, 5).map((l) => (
                        <li key={l.id} className="flex items-center gap-3 border-b border-line-subtle py-2 last:border-0">
                            <Umbrella size={16} className="shrink-0 text-muted" aria-hidden />
                            <div className="flex min-w-0 flex-1 flex-col gap-px">
                                <span className="truncate type-small-medium capitalize text-ink">{l.leave_type}</span>
                                <span className="truncate type-caption text-muted">{df.date(l.start_date, 'medium')}, {t('profilePage.days', { count: l.days, n: formatCount(l.days, df.lang) })}</span>
                            </div>
                            <Badge tone={l.status === 'approved' ? 'ok' : l.status === 'rejected' ? 'bad' : 'warn'} dot>
                                {t(`profilePage.${l.status}`, { defaultValue: l.status })}
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export default StudentDetailPage;
