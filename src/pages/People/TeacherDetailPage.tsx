import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Mail, MapPin, Pencil, Phone, RotateCw, Umbrella, Users, Wallet,
} from 'lucide-react';

import { Badge, Button, Card, CardHeader, EmptyState, Meter, Skeleton, Tabs, type TabItem } from '../../design-system';
import { AppPage } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { EditTeacherModal } from '../../components/people/EditTeacherModal';
import { profilesService, type TeacherProfile } from '../../api/services/profiles.service';
import { peopleService } from '../../api/services/people.service';
import { KpiCard } from '../../features/dashboard/KpiCard';
import { ProfileHeader, ProfileHeaderSkeleton } from '../../features/people/ProfileHeader';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount, formatRs } from '../../utils/money';
import { cn } from '../../utils/cn';
import type { Teacher } from '../../types/people';

type Tab = 'overview' | 'timetable' | 'classes' | 'leave' | 'attendance';

/** Timetable rows use Python's weekday: Monday = 0. Nepali schools run Sunday to Friday. */
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SCHOOL_WEEK = [6, 0, 1, 2, 3, 4];

/** Figma F07 Teacher profile, from GET /people/teachers/{id}/profile. */
const TeacherDetailPage = () => {
    const { teacherId } = useParams();
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('overview');
    const [editing, setEditing] = useState(false);
    const id = Number(teacherId);

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['teacher-profile', id],
        queryFn: () => profilesService.getTeacherProfile(id),
        enabled: Number.isFinite(id),
    });
    const { data: record } = useQuery({
        queryKey: ['teacher', id],
        queryFn: () => peopleService.getTeacher(id) as Promise<Teacher>,
        enabled: editing,
    });

    if (isPending) {
        return (
            <AppPage title={t('profilePage.crumbTeachers')}>
                <ProfileHeaderSkeleton />
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
                    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-card" />)}
                </div>
            </AppPage>
        );
    }
    if (isError || !data) {
        return (
            <AppPage title={t('profilePage.crumbTeachers')}>
                <Card>
                    <EmptyState icon={AlertCircle} tone="bad" title={t('profilePage.loadError')}
                        action={<Button variant="quiet" size="sm" leftIcon={RotateCw} onClick={() => void refetch()}>{t('profilePage.retry')}</Button>}>
                        {t('profile.notFound')}
                    </EmptyState>
                </Card>
            </AppPage>
        );
    }

    const { teacher, employment, teaching } = data;
    const classTeacher = teaching.class_teacher_of.map((s) => `${s.class_name} ${s.section_name}`.trim()).join(', ');
    const line = [employment.designation || t('profile.noDesignation'), teacher.staff_code, classTeacher ? `${t('profile.classTeacherOf')} ${classTeacher}` : null]
        .filter(Boolean).join(', ');

    const tabs: TabItem<Tab>[] = [
        { value: 'overview', label: t('profilePage.tabs.overview') },
        { value: 'timetable', label: t('profilePage.tabs.timetable') },
        { value: 'classes', label: t('profilePage.tabs.classes'), count: teaching.class_count },
        { value: 'leave', label: t('profilePage.tabs.leave') },
        { value: 'attendance', label: t('profilePage.tabs.attendance') },
    ];

    return (
        <AppPage title={teacher.name}>
            <ProfileHeader
                crumb={t('profilePage.crumbTeachers')}
                crumbTo="/people"
                name={teacher.name}
                line={line}
                meta={[
                    ...(teacher.phone ? [{ icon: Phone, label: t('peopleForms.label.phone'), value: teacher.phone }] : []),
                    ...(teacher.email ? [{ icon: Mail, label: t('peopleForms.label.email'), value: teacher.email }] : []),
                    ...(teacher.city || teacher.address_line ? [{ icon: MapPin, label: t('peopleForms.label.address'), value: [teacher.address_line, teacher.city].filter(Boolean).join(', ') }] : []),
                ]}
                actions={
                    <>
                        {teacher.phone && (
                            <Button variant="quiet" leftIcon={Phone} onClick={() => { window.location.href = `tel:${teacher.phone}`; }}>{t('profilePage.call')}</Button>
                        )}
                        <AccessControl id="teachers_update">
                            <Button variant="quiet" leftIcon={Pencil} onClick={() => setEditing(true)}>{t('profilePage.edit')}</Button>
                        </AccessControl>
                    </>
                }
            />

            <Figures data={data} />

            <Tabs variant="underline" items={tabs} value={tab} onChange={setTab} aria-label={teacher.name} />

            <div role="tabpanel" aria-label={t(`profilePage.tabs.${tab}`)} className="min-w-0">
                {tab === 'overview' && (
                    <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-4">
                        <div className="flex min-w-0 flex-col gap-3.5">
                            <Timetable data={data} />
                            <Teaches data={data} />
                            <AssignmentsCard data={data} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-3.5">
                            <LeaveCard data={data} />
                            <AttendanceCard data={data} />
                            <Employment data={data} />
                        </div>
                    </div>
                )}
                {tab === 'timetable' && <Timetable data={data} />}
                {tab === 'classes' && <Teaches data={data} />}
                {tab === 'leave' && <LeaveCard data={data} />}
                {tab === 'attendance' && <AttendanceCard data={data} />}
            </div>

            {editing && record && <EditTeacherModal teacher={record} isOpen onClose={() => setEditing(false)} />}
        </AppPage>
    );
};

function Figures({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const { employment, teaching, attendance, assignments } = data;
    return (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
            <KpiCard icon={CalendarClock} tone="brand" status="ready" label={t('profile.teachingLoad')}
                value={formatCount(teaching.weekly_periods, lang)}
                sub={<span className="truncate">{t('profile.periodsPerWeek')}</span>} />
            <KpiCard icon={CheckCircle2} tone="ok" status="ready" label={t('profile.attendance')}
                value={attendance.tracked && attendance.attendance_pct != null ? `${formatCount(attendance.attendance_pct, lang)}%` : '—'}
                sub={<span className="truncate">{attendance.tracked ? t('profile.lastNDays', { count: attendance.window_days }) : t('profile.noLogin')}</span>} />
            <KpiCard icon={ClipboardList} tone={assignments.awaiting_grading > 0 ? 'warn' : 'ok'} status="ready" label={t('profile.awaitingGrading')}
                value={formatCount(assignments.awaiting_grading, lang)}
                sub={<span className="truncate">{t('profile.ofNAssignments', { count: assignments.total })}</span>} />
            <KpiCard icon={Wallet} tone="info" status="ready" long label={t('profile.monthlySalary')}
                value={employment.monthly_salary != null ? formatRs(employment.monthly_salary, lang) : t('profile.notOnPayroll')}
                sub={employment.annual_salary != null ? <span className="truncate">{formatRs(employment.annual_salary, lang)} {t('profile.perYear')}</span> : undefined} />
        </div>
    );
}

function Timetable({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const { timetable } = data;
    const maxPeriod = timetable.reduce((m, s) => Math.max(m, s.period), 0);
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);
    const days = SCHOOL_WEEK.filter((d) => d !== 5 || timetable.some((s) => s.day_of_week === 5));
    const slot = (day: number, period: number) => timetable.find((s) => s.day_of_week === day && s.period === period);

    return (
        <Card>
            <CardHeader title={t('profile.weeklyTimetable')} subtitle={t('profile.periodsPerWeek') + ': ' + data.teaching.weekly_periods} />
            {timetable.length === 0 ? (
                <p className="py-6 text-center type-small text-muted">{t('profile.noTimetable')}</p>
            ) : (
                <div className="-mx-1 overflow-x-auto px-1">
                    <table className="w-full min-w-[560px] border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="w-12" />
                                {periods.map((p) => <th key={p} scope="col" className="type-caption font-medium text-muted">{p}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d}>
                                    <th scope="row" className="pr-1 text-left type-caption-semibold text-muted">{t(`profile.day.${DAY_KEYS[d]}`)}</th>
                                    {periods.map((p) => {
                                        const s = slot(d, p);
                                        return (
                                            <td key={p} title={s ? `${s.start_time ?? ''}–${s.end_time ?? ''}` : undefined}
                                                className={cn('h-11 rounded-[10px] px-1.5 text-center align-middle', s ? 'bg-primary-soft' : 'bg-surface-2')}>
                                                {s ? (
                                                    <span className="flex flex-col leading-tight">
                                                        <span className="truncate type-micro-bold text-primary-text">{s.subject_name}</span>
                                                        <span className="truncate type-micro text-ink-2">{[s.class_name, s.section_name].filter(Boolean).join(' ')}</span>
                                                    </span>
                                                ) : <span className="sr-only">{t('profile.free')}</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

function Teaches({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const { teaching } = data;
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('profile.teaches')} />
            {teaching.classes.length === 0 ? (
                <p className="py-4 text-center type-small text-muted">{t('profile.noTeachingLoad')}</p>
            ) : (
                <ul>
                    {teaching.classes.map((c) => (
                        <li key={c.class_id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line-subtle py-3 last:border-0">
                            <span className="w-28 shrink-0 type-body-semibold text-ink">{c.class_name}</span>
                            <span className="flex flex-wrap gap-1.5">
                                {c.subjects.map((s) => (
                                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 type-caption-semibold text-primary-text">
                                        <BookOpen size={13} aria-hidden /> {s.name}
                                    </span>
                                ))}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {teaching.class_teacher_of.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-line-subtle pt-3">
                    <p className="type-caption-semibold text-muted">{t('profile.classTeacherOf')}</p>
                    <div className="flex flex-wrap gap-2">
                        {teaching.class_teacher_of.map((s) => (
                            <Badge key={s.section_id} tone="brand"><Users size={12} aria-hidden /> {s.class_name} {s.section_name}, {s.student_count}</Badge>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

function AssignmentsCard({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { assignments, examining } = data;
    const stats: [string, number, string?][] = [
        [t('profile.total'), assignments.total],
        [t('profile.overdue'), assignments.overdue, assignments.overdue ? 'text-bad' : undefined],
        [t('profile.awaitingGrading'), assignments.awaiting_grading, assignments.awaiting_grading ? 'text-warn' : undefined],
        [t('profile.marksEntered'), examining.marks_entered],
    ];
    return (
        <Card className="gap-2.5">
            <CardHeader title={t('profile.assignmentsSet')} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map(([label, n, tone]) => (
                    <div key={label} className="rounded-row bg-surface-2 px-3 py-2.5">
                        <p className="truncate type-caption text-muted">{label}</p>
                        <p className={cn('type-figure-m', tone ?? 'text-ink')}>{formatCount(n, df.lang)}</p>
                    </div>
                ))}
            </div>
            {assignments.recent.length > 0 && (
                <ul>
                    {assignments.recent.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-0">
                            <div className="flex min-w-0 flex-1 flex-col gap-px">
                                <span className="truncate type-small-medium text-ink">{a.title}</span>
                                <span className="truncate type-caption text-muted">{[a.class_name, a.subject_name].filter(Boolean).join(', ')}</span>
                            </div>
                            <span className="shrink-0 type-caption text-muted">{df.date(a.due_date, 'medium')}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function LeaveCard({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { leave } = data;
    return (
        <Card>
            <CardHeader title={t('profile.leave')} subtitle={leave.pending_count ? `${leave.pending_count} ${t('profilePage.pending').toLowerCase()}` : undefined} />
            {leave.balances ? (
                <ul className="flex flex-col gap-3">
                    {(['casual', 'sick', 'earned', 'unpaid'] as const).map((k) => {
                        const b = leave.balances![k];
                        if (!b.total && !b.used) return null;
                        const share = b.total ? b.used / b.total : 0;
                        return (
                            <li key={k} className="flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between gap-2 type-small">
                                    <span className="text-ink-2">{t(`profile.leaveType.${k}`)}</span>
                                    <span className="font-semibold tabular-nums text-ink">{formatCount(b.used, df.lang)} / {formatCount(b.total, df.lang)}</span>
                                </div>
                                <Meter value={share} tone={share >= 1 ? 'bad' : share > 0.75 ? 'warn' : 'ok'} label={t(`profile.leaveType.${k}`)} />
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="type-small text-muted">{t('profile.noLeaveBalance')}</p>
            )}
            {leave.requests.length > 0 && (
                <ul className="border-t border-line-subtle pt-1">
                    {leave.requests.slice(0, 5).map((l) => (
                        <li key={l.id} className="flex items-center gap-3 border-b border-line-subtle py-2 last:border-0">
                            <Umbrella size={16} className="shrink-0 text-muted" aria-hidden />
                            <div className="flex min-w-0 flex-1 flex-col gap-px">
                                <span className="truncate type-small-medium capitalize text-ink">{l.leave_type}</span>
                                <span className="truncate type-caption text-muted">{df.date(l.start_date, 'medium')}, {t('profilePage.days', { count: l.days, n: formatCount(l.days, df.lang) })}</span>
                            </div>
                            <Badge tone={l.status === 'approved' ? 'ok' : l.status === 'rejected' ? 'bad' : 'warn'} dot>{t(`profilePage.${l.status}`, { defaultValue: l.status })}</Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function AttendanceCard({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const { attendance } = data;
    return (
        <Card>
            <CardHeader title={t('profile.ownAttendance')} subtitle={attendance.tracked ? t('profile.holidaysExcluded') : undefined} />
            {!attendance.tracked ? (
                <p className="type-small text-muted">{t('profile.noLoginExplain')}</p>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {([
                        [t('profile.present'), attendance.present ?? 0, 'text-ok'],
                        [t('profile.absent'), attendance.absent ?? 0, attendance.absent ? 'text-bad' : 'text-ink'],
                        [t('profile.late'), attendance.late_days ?? 0, attendance.late_days ? 'text-warn' : 'text-ink'],
                    ] as const).map(([label, n, tone]) => (
                        <div key={label} className="rounded-row bg-surface-2 px-3 py-2.5">
                            <p className="truncate type-caption text-muted">{label}</p>
                            <p className={cn('type-figure-m', tone)}>{formatCount(n, lang)}</p>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function Employment({ data }: { data: TeacherProfile }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const { employment } = data;
    const years = (n: number | null) => (n != null ? t('profile.nYears', { count: n }) : '—');
    const fields: [string, string][] = [
        [t('profile.joined'), employment.join_date ? df.date(employment.join_date, 'medium') : '—'],
        [t('profile.tenure'), years(employment.tenure_years)],
        [t('profile.qualification'), employment.qualification || '—'],
        [t('profile.experience'), years(employment.experience_years)],
        [t('profile.salaryBasis'), employment.salary_basis || '—'],
    ];
    return (
        <Card className="gap-2">
            <CardHeader title={t('profile.employment')} />
            <dl className="flex flex-col">
                {fields.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line-subtle py-2 last:border-0 type-small">
                        <dt className="shrink-0 text-muted">{label}</dt>
                        <dd className="text-right font-medium text-ink">{value}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

export default TeacherDetailPage;
