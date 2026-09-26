import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Droplet, GraduationCap,
    MapPin, Mail, Pencil, Phone, Receipt, RotateCw, Umbrella, Users, Wallet,
} from 'lucide-react';

import { Badge, Button, Card, CardHeader, EmptyState, Skeleton, Tabs, type TabItem } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { EditStudentModal } from '../../components/people/EditStudentModal';
import { profilesService, type ExamResult, type StudentProfile } from '../../api/services/profiles.service';
import { peopleService } from '../../api/services/people.service';
import { KpiCard } from '../../features/dashboard/KpiCard';
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
    const [tab, setTab] = useState<Tab>('overview');
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
                            <Guardians data={data} />
                            <Attendance data={data} />
                            <Assignments data={data} />
                            <Leave data={data} />
                        </div>
                    </div>
                )}
                {tab === 'attendance' && <Attendance data={data} />}
                {tab === 'marks' && <Results data={data} />}
                {tab === 'fees' && <Fees data={data} />}
                {tab === 'guardians' && <Guardians data={data} />}
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
    const { fees } = data;
    const last = fees.payments.find((p) => p.amount > 0);
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('profile.feeLedger')} subtitle={last?.paid_at ? t('profilePage.lastPayment', { amount: formatRs(last.amount, df.lang), date: df.date(last.paid_at, 'medium') }) : undefined} />
            <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[460px] text-left">
                    <thead className="border-y border-line-subtle bg-surface-2">
                        <tr className="type-caption text-muted">
                            <th className="px-5 py-2">{t('profile.feeHead')}</th>
                            <th className="px-3 py-2 text-right">{t('profile.assigned')}</th>
                            <th className="px-3 py-2 text-right">{t('profile.paid')}</th>
                            <th className="px-5 py-2 text-right">{t('profile.balance')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fees.ledger.map((l) => (
                            <tr key={l.fee_structure_id} className="border-b border-line-subtle type-small">
                                <td className="px-5 py-3"><span className="font-medium text-ink">{l.name}</span> <span className="text-muted">{l.frequency}</span></td>
                                <td className="px-3 py-3 text-right tabular-nums text-ink-2">{formatRs(l.assigned, df.lang)}</td>
                                <td className="px-3 py-3 text-right tabular-nums text-ok">{formatRs(l.paid, df.lang)}</td>
                                <td className={cn('px-5 py-3 text-right font-semibold tabular-nums', l.balance > 0 ? 'text-bad' : 'text-muted')}>{formatRs(l.balance, df.lang)}</td>
                            </tr>
                        ))}
                        <tr className="type-small-semibold">
                            <td className="px-5 py-2.5 text-ink">{t('profilePage.total')}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-ink">{formatRs(fees.total_assigned, df.lang)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-ok">{formatRs(fees.total_paid, df.lang)}</td>
                            <td className={cn('px-5 py-2.5 text-right tabular-nums', fees.balance > 0 ? 'text-bad' : 'text-muted')}>{formatRs(fees.balance, df.lang)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
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

function Guardians({ data }: { data: StudentProfile }) {
    const { t } = useTranslation();
    return (
        <Card>
            <CardHeader title={t('profile.guardians')} />
            {data.guardians.length === 0 ? (
                <p className="py-4 text-center type-small text-muted">{t('profile.noGuardians')}</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {data.guardians.map((g) => (
                        <li key={g.parent_id} className="flex flex-col gap-2 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-3">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="shrink-0 text-muted" aria-hidden />
                                <span className="min-w-0 flex-1 truncate type-body-semibold text-ink">{g.name}</span>
                                {g.is_primary_contact && <Badge tone="brand">{t('profile.primary')}</Badge>}
                            </div>
                            <p className="type-caption text-muted">
                                {[g.relationship ? t(`registerFamily.relationship.${g.relationship}`, { defaultValue: g.relationship }) : null, g.occupation].filter(Boolean).join(', ')}
                            </p>
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
        </Card>
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
