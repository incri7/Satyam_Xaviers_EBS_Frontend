import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { profilesService } from '../../api/services/profiles.service';
import {
    ArrowLeft, Mail, Phone, MapPin, CalendarDays, GraduationCap,
    Wallet, ClipboardList, CheckCircle2, Clock, AlertCircle, Loader2, Users,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';

/** Timetable rows come back on Python's weekday convention: Monday = 0. */
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const Card: React.FC<{ title: string; icon?: React.ElementType; children: React.ReactNode; className?: string }> =
    ({ title, icon: Icon, children, className }) => (
        <section className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm', className)}>
            <header className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
                {Icon && <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />}
                <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
            </header>
            <div className="p-5">{children}</div>
        </section>
    );

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
    <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className={cn('text-lg font-black tracking-tight tabular-nums', tone || 'text-slate-900')}>{value}</p>
    </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
        <span className="text-xs font-bold text-slate-400 shrink-0">{label}</span>
        <span className="text-sm font-medium text-slate-800 text-right">{value ?? '—'}</span>
    </div>
);

const TeacherDetailPage: React.FC = () => {
    const { teacherId } = useParams();
    const { t } = useTranslation();
    const df = useDateFormat();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['teacher-profile', teacherId],
        queryFn: () => profilesService.getTeacherProfile(Number(teacherId)),
        enabled: !!teacherId,
    });

    const money = (n: number | null | undefined) =>
        n == null ? null : new Intl.NumberFormat('en-NP', {
            style: 'currency', currency: 'NPR', maximumFractionDigits: 0,
        }).format(n);

    const shell = (body: React.ReactNode) => (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Link
                        to="/people"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('profile.backToPeople')}
                    </Link>
                    {body}
                </div>
            </main>
        </div>
    );

    if (isLoading) {
        return shell(
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>,
        );
    }

    if (isError || !data) {
        return shell(
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">
                    {(error as any)?.response?.data?.detail || t('profile.notFound')}
                </p>
            </div>,
        );
    }

    const { teacher, employment, teaching, timetable, assignments, examining, attendance, leave } = data;

    const byDay = DAY_KEYS.map((key, idx) => ({
        key,
        slots: timetable
            .filter((s) => s.day_of_week === idx)
            .sort((a, b) => a.period - b.period),
    }));

    return shell(
        <div className="space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-xl font-black shrink-0">
                        {teacher.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{teacher.name}</h1>
                        <p className="text-slate-500 font-medium">
                            {employment.designation || t('profile.noDesignation')}
                            {teacher.staff_code ? ' · ' + teacher.staff_code : ''}
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm font-medium text-slate-500">
                            {teacher.email && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />{teacher.email}
                                </span>
                            )}
                            {teacher.phone && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" />{teacher.phone}
                                </span>
                            )}
                            {(teacher.city || teacher.address_line) && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {[teacher.address_line, teacher.city].filter(Boolean).join(', ')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.monthlySalary')}
                        value={money(employment.monthly_salary) ?? t('profile.notOnPayroll')}
                        tone={employment.monthly_salary == null ? 'text-slate-400 text-sm' : undefined}
                    />
                    {employment.annual_salary != null && (
                        <p className="text-xs font-bold text-slate-400 mt-1">
                            {money(employment.annual_salary)} {t('profile.perYear')}
                        </p>
                    )}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat label={t('profile.teachingLoad')} value={teaching.weekly_periods} />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {t('profile.periodsPerWeek')}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.attendance')}
                        value={attendance.tracked && attendance.attendance_pct != null
                            ? attendance.attendance_pct + '%'
                            : '—'}
                        tone={attendance.attendance_pct != null && attendance.attendance_pct < 90
                            ? 'text-amber-600' : undefined}
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {attendance.tracked
                            ? t('profile.lastNDays', { count: attendance.window_days })
                            : t('profile.noLogin')}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.awaitingGrading')}
                        value={assignments.awaiting_grading}
                        tone={assignments.awaiting_grading > 0 ? 'text-amber-600' : 'text-emerald-600'}
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {t('profile.ofNAssignments', { count: assignments.total })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* What they teach */}
                    <Card title={t('profile.teaches')} icon={GraduationCap}>
                        {teaching.classes.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noTeachingLoad')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {teaching.classes.map((c) => (
                                    <li key={c.class_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                                        <span className="text-sm font-black text-slate-900 w-24 shrink-0">
                                            {c.class_name}
                                        </span>
                                        <span className="flex flex-wrap gap-1.5">
                                            {c.subjects.map((s) => (
                                                <span
                                                    key={s.id}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                                                >
                                                    {s.name}
                                                </span>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {teaching.class_teacher_of.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-slate-100">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    {t('profile.classTeacherOf')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {teaching.class_teacher_of.map((s) => (
                                        <span
                                            key={s.section_id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 text-brand text-xs font-bold"
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            {s.class_name} {s.section_name} · {s.student_count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Timetable */}
                    <Card title={t('profile.weeklyTimetable')} icon={CalendarDays}>
                        {timetable.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noTimetable')}</p>
                        ) : (
                            <div className="space-y-3">
                                {byDay.map((d) => (
                                    <div key={d.key} className="flex items-start gap-3">
                                        <span className="w-10 shrink-0 text-xs font-black uppercase text-slate-400 pt-1.5">
                                            {t('profile.day.' + d.key)}
                                        </span>
                                        {d.slots.length === 0 ? (
                                            <span className="text-xs font-medium text-slate-300 pt-1.5">
                                                {t('profile.free')}
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {d.slots.map((s, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700"
                                                        title={(s.start_time || '') + ' – ' + (s.end_time || '')}
                                                    >
                                                        {s.subject_name} · {s.class_name}
                                                        {s.section_name ? ' ' + s.section_name : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Assignments */}
                    <Card title={t('profile.assignmentsSet')} icon={ClipboardList}>
                        <div className="flex flex-wrap gap-6 mb-4">
                            <Stat label={t('profile.total')} value={assignments.total} />
                            <Stat label={t('profile.overdue')} value={assignments.overdue}
                                  tone={assignments.overdue ? 'text-red-500' : undefined} />
                            <Stat label={t('profile.awaitingGrading')} value={assignments.awaiting_grading}
                                  tone={assignments.awaiting_grading ? 'text-amber-600' : undefined} />
                            <Stat label={t('profile.marksEntered')} value={examining.marks_entered} />
                        </div>
                        {assignments.recent.length > 0 && (
                            <ul className="divide-y divide-slate-50 -mx-1">
                                {assignments.recent.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between gap-3 py-2 px-1">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{a.title}</p>
                                            <p className="text-xs font-medium text-slate-400">
                                                {a.class_name} · {a.subject_name}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 shrink-0">
                                            {df.date(a.due_date)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="space-y-5">
                    {/* Employment */}
                    <Card title={t('profile.employment')} icon={Wallet}>
                        <Field label={t('profile.joined')}
                               value={employment.join_date ? df.date(employment.join_date) : undefined} />
                        <Field label={t('profile.tenure')}
                               value={employment.tenure_years != null
                                   ? t('profile.nYears', { count: employment.tenure_years }) : undefined} />
                        <Field label={t('profile.qualification')} value={employment.qualification} />
                        <Field label={t('profile.experience')}
                               value={employment.experience_years != null
                                   ? t('profile.nYears', { count: employment.experience_years }) : undefined} />
                        <Field label={t('profile.salaryBasis')} value={employment.salary_basis} />
                    </Card>

                    {/* Attendance */}
                    <Card title={t('profile.ownAttendance')} icon={CheckCircle2}>
                        {!attendance.tracked ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noLoginExplain')}</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <Stat label={t('profile.present')} value={attendance.present ?? 0} />
                                    <Stat label={t('profile.absent')} value={attendance.absent ?? 0}
                                          tone={attendance.absent ? 'text-red-500' : undefined} />
                                    <Stat label={t('profile.late')} value={attendance.late_days ?? 0}
                                          tone={attendance.late_days ? 'text-amber-600' : undefined} />
                                </div>
                                <p className="text-[11px] font-medium text-slate-400">
                                    {t('profile.holidaysExcluded')}
                                </p>
                            </>
                        )}
                    </Card>

                    {/* Leave */}
                    <Card title={t('profile.leave')} icon={Clock}>
                        {leave.balances ? (
                            <ul className="space-y-2 mb-4">
                                {(['casual', 'sick', 'earned', 'unpaid'] as const).map((k) => {
                                    const b = leave.balances![k];
                                    if (!b.total && !b.used) return null;
                                    const pct = b.total ? (b.used / b.total) * 100 : 0;
                                    return (
                                        <li key={k}>
                                            <div className="flex items-baseline justify-between gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-600">
                                                    {t('profile.leaveType.' + k)}
                                                </span>
                                                <span className="text-xs font-black text-slate-900 tabular-nums">
                                                    {b.used}/{b.total}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn('h-full rounded-full',
                                                        pct >= 100 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500')}
                                                    style={{ width: Math.min(100, pct) + '%' }}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-sm font-medium text-slate-400 mb-3">{t('profile.noLeaveBalance')}</p>
                        )}
                        {leave.requests.length === 0 ? (
                            <p className="text-xs font-medium text-slate-400">{t('profile.noLeaveRequests')}</p>
                        ) : (
                            <ul className="divide-y divide-slate-50 -mx-1">
                                {leave.requests.slice(0, 6).map((l) => (
                                    <li key={l.id} className="flex items-center justify-between gap-2 py-2 px-1">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 capitalize">{l.leave_type}</p>
                                            <p className="text-[11px] font-medium text-slate-400">
                                                {df.date(l.start_date)} · {t('profile.nDays', { count: l.days })}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            'text-[10px] font-black uppercase px-2 py-1 rounded-lg shrink-0',
                                            l.status === 'approved' ? 'bg-emerald-50 text-emerald-600'
                                                : l.status === 'rejected' ? 'bg-red-50 text-red-500'
                                                    : 'bg-amber-50 text-amber-600',
                                        )}>
                                            {l.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </div>,
    );
};

export default TeacherDetailPage;
