import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { profilesService, type ExamResult } from '../../api/services/profiles.service';
import {
    ArrowLeft, Phone, Mail, MapPin, Wallet, GraduationCap, CheckCircle2,
    ClipboardList, Clock, AlertCircle, Loader2, Users, Receipt,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';

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

const ATTENDANCE_TONE: Record<string, string> = {
    P: 'bg-emerald-500', L: 'bg-amber-400', HD: 'bg-sky-400', A: 'bg-red-500',
};

const StudentDetailPage: React.FC = () => {
    const { studentId } = useParams();
    const { t } = useTranslation();
    const df = useDateFormat();
    const [openExam, setOpenExam] = React.useState<number | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: () => profilesService.getStudentProfile(Number(studentId)),
        enabled: !!studentId,
    });

    const money = (n: number) =>
        new Intl.NumberFormat('en-NP', {
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

    const { student, enrollment, guardians, results, fees, attendance, assignments, leave } = data;

    const examRow = (e: ExamResult) => {
        const open = openExam === e.exam_id;
        return (
            <li key={e.exam_id} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                    onClick={() => setOpenExam(open ? null : e.exam_id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{e.exam_name}</p>
                        <p className="text-xs font-medium text-slate-400">
                            {e.term ? e.term + ' · ' : ''}{e.sat_on ? df.date(e.sat_on) : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black text-slate-900 tabular-nums">
                            {e.percent.toFixed(1)}%
                        </span>
                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                            {t('profile.gpaShort')} {e.gpa.toFixed(2)}
                        </span>
                        <span className={cn(
                            'text-[10px] font-black uppercase px-2 py-1 rounded-lg w-14 text-center',
                            e.result === 'PASS' ? 'bg-emerald-50 text-emerald-600'
                                : e.result === 'FAIL' ? 'bg-red-50 text-red-500'
                                    : 'bg-slate-100 text-slate-500',
                        )}>
                            {e.grade || e.result}
                        </span>
                    </div>
                </button>
                {open && (
                    <div className="border-t border-slate-100 overflow-x-auto">
                        <table className="w-full min-w-[420px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('profile.subject')}
                                    </th>
                                    <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('profile.marks')}
                                    </th>
                                    <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('profile.percent')}
                                    </th>
                                    <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('profile.grade')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {e.subjects.map((s) => (
                                    <tr key={s.subject_id + s.subject_name}>
                                        <td className="px-4 py-2 text-sm font-medium text-slate-700">
                                            {s.subject_name}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right tabular-nums text-slate-600">
                                            {s.is_absent ? t('profile.absentShort')
                                                : `${s.obtained ?? '—'} / ${s.max_marks}`}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right tabular-nums text-slate-600">
                                            {s.percent != null ? s.percent.toFixed(1) + '%' : '—'}
                                        </td>
                                        <td className={cn(
                                            'px-4 py-2 text-sm font-black text-right',
                                            s.is_pass === false ? 'text-red-500' : 'text-slate-800',
                                        )}>
                                            {s.grade || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </li>
        );
    };

    return shell(
        <div className="space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-xl font-black shrink-0">
                        {student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
                        <p className="text-slate-500 font-medium">
                            {enrollment
                                ? `${enrollment.class_name}${enrollment.section_name ? ' ' + enrollment.section_name : ''}`
                                : t('profile.notEnrolled')}
                            {student.admission_no ? ' · ' + student.admission_no : ''}
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm font-medium text-slate-500">
                            {student.dob && (
                                <span>{t('profile.dob')}: {df.date(student.dob)}</span>
                            )}
                            {student.blood_group && (
                                <span>{t('profile.bloodGroup')}: {student.blood_group}</span>
                            )}
                            {student.city && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />{student.city}
                                </span>
                            )}
                        </div>
                    </div>
                    {student.status && (
                        <span className={cn(
                            'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0',
                            student.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                        )}>
                            {student.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.feeBalance')}
                        value={money(fees.balance)}
                        tone={fees.balance > 0 ? 'text-red-500' : 'text-emerald-600'}
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {money(fees.total_paid)} {t('profile.paidOf')} {money(fees.total_assigned)}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.attendance')}
                        value={attendance.year_pct != null ? attendance.year_pct + '%' : '—'}
                        tone={attendance.year_pct != null && attendance.year_pct < 80 ? 'text-amber-600' : undefined}
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {t('profile.thisYear')} · {t('profile.nAbsences', { count: attendance.absences })}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat
                        label={t('profile.latestResult')}
                        value={results.latest ? results.latest.percent.toFixed(1) + '%' : '—'}
                        tone={results.latest?.result === 'FAIL' ? 'text-red-500' : undefined}
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {results.latest
                            ? `${t('profile.gpaShort')} ${results.latest.gpa.toFixed(2)} · ${results.latest.grade ?? ''}`
                            : t('profile.noResults')}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <Stat label={t('profile.assignments')} value={assignments.total} />
                    <p className="text-xs font-bold text-slate-400 mt-1">
                        {assignments.by_status.missing
                            ? t('profile.nMissing', { count: assignments.by_status.missing })
                            : t('profile.noneMissing')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* Results */}
                    <Card title={t('profile.results')} icon={GraduationCap}>
                        {results.exams.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noResults')}</p>
                        ) : (
                            <ul className="space-y-2">{results.exams.map(examRow)}</ul>
                        )}
                    </Card>

                    {/* Fee ledger */}
                    <Card title={t('profile.feeLedger')} icon={Wallet}>
                        <div className="overflow-x-auto -mx-5 -mb-5">
                            <table className="w-full min-w-[460px]">
                                <thead className="bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        <th className="px-5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('profile.feeHead')}
                                        </th>
                                        <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('profile.assigned')}
                                        </th>
                                        <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('profile.paid')}
                                        </th>
                                        <th className="px-5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('profile.balance')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {fees.ledger.map((l) => (
                                        <tr key={l.fee_structure_id}>
                                            <td className="px-5 py-2.5 text-sm font-medium text-slate-700">
                                                {l.name}
                                                <span className="text-[11px] text-slate-400 ml-1.5">{l.frequency}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-slate-500">
                                                {money(l.assigned)}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-emerald-600">
                                                {money(l.paid)}
                                            </td>
                                            <td className={cn(
                                                'px-5 py-2.5 text-sm font-black text-right tabular-nums',
                                                l.balance > 0 ? 'text-red-500' : 'text-slate-300',
                                            )}>
                                                {money(l.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Payments */}
                    <Card title={t('profile.payments')} icon={Receipt}>
                        {fees.payments.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noPayments')}</p>
                        ) : (
                            <ul className="divide-y divide-slate-50 -mx-1">
                                {fees.payments.map((p) => (
                                    <li key={p.id} className="flex items-center justify-between gap-3 py-2 px-1">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {p.fee_head || t('profile.unallocated')}
                                            </p>
                                            <p className="text-[11px] font-mono text-slate-400">
                                                {p.receipt_no} · {p.paid_at ? df.date(p.paid_at) : ''}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            'text-sm font-black tabular-nums shrink-0',
                                            p.amount < 0 ? 'text-red-500' : 'text-emerald-600',
                                        )}>
                                            {money(p.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="space-y-5">
                    {/* Guardians */}
                    <Card title={t('profile.guardians')} icon={Users}>
                        {guardians.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noGuardians')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {guardians.map((g) => (
                                    <li key={g.parent_id}>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-800">{g.name}</p>
                                            {g.is_primary_contact && (
                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                                                    {t('profile.primary')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-slate-400 capitalize">
                                            {g.relationship}{g.occupation ? ' · ' + g.occupation : ''}
                                        </p>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            {g.phone && (
                                                <a href={'tel:' + g.phone}
                                                   className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand">
                                                    <Phone className="w-3 h-3" />{g.phone}
                                                </a>
                                            )}
                                            {g.email && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                    <Mail className="w-3 h-3" />{g.email}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Attendance */}
                    <Card title={t('profile.attendance')} icon={CheckCircle2}>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <Stat label={t('profile.thisYear')}
                                  value={attendance.year_pct != null ? attendance.year_pct + '%' : '—'} />
                            <Stat label={t('profile.last30')}
                                  value={attendance.last_30_pct != null ? attendance.last_30_pct + '%' : '—'} />
                        </div>
                        {attendance.recent.length > 0 && (
                            <>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    {t('profile.recentDays')}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {attendance.recent.map((r) => (
                                        <span
                                            key={r.date}
                                            title={df.date(r.date) + ' · ' + r.status}
                                            className={cn('w-5 h-5 rounded text-[9px] font-black text-white flex items-center justify-center',
                                                ATTENDANCE_TONE[r.status] || 'bg-slate-300')}
                                        >
                                            {r.status}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Assignments */}
                    <Card title={t('profile.assignments')} icon={ClipboardList}>
                        {assignments.total === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noAssignments')}</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(assignments.by_status).map(([k, v]) => (
                                        <span key={k} className={cn(
                                            'px-2.5 py-1 rounded-lg text-xs font-bold',
                                            k === 'graded' ? 'bg-emerald-50 text-emerald-600'
                                                : k === 'missing' ? 'bg-red-50 text-red-500'
                                                    : k === 'submitted' ? 'bg-blue-50 text-blue-600'
                                                        : 'bg-slate-100 text-slate-500',
                                        )}>
                                            {v} {k}
                                        </span>
                                    ))}
                                </div>
                                <ul className="divide-y divide-slate-50 -mx-1">
                                    {assignments.recent.slice(0, 6).map((a) => (
                                        <li key={a.assignment_id} className="flex items-center justify-between gap-2 py-2 px-1">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{a.title}</p>
                                                <p className="text-[11px] font-medium text-slate-400">
                                                    {a.subject_name}{a.due_date ? ' · ' + df.date(a.due_date) : ''}
                                                </p>
                                            </div>
                                            {a.grade && (
                                                <span className="text-xs font-black text-brand shrink-0">{a.grade}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Card>

                    {/* Leave */}
                    <Card title={t('profile.leave')} icon={Clock}>
                        {leave.requests.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400">{t('profile.noLeaveRequests')}</p>
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

export default StudentDetailPage;
