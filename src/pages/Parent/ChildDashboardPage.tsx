import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { parentService } from '../../api/services/parent.service';
import { getMarksComparison } from '../../api/services/exams.service';
import { leavesService, type LeaveType } from '../../api/services/leaves.service';
import {
    ArrowLeft, AlertCircle, Loader2, TrendingUp, Plus, CheckCircle2, Clock, XCircle,
    Calendar, BookOpen, CreditCard, FileText, LayoutDashboard,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type Tab = 'overview' | 'attendance' | 'marks' | 'fees' | 'leave';

const TABS: { id: Tab; icon: React.ElementType; labelKey: string }[] = [
    { id: 'overview', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { id: 'attendance', icon: Calendar, labelKey: 'home.parent.attendance' },
    { id: 'marks', icon: BookOpen, labelKey: 'home.parent.marks' },
    { id: 'fees', icon: CreditCard, labelKey: 'home.parent.fees' },
    { id: 'leave', icon: FileText, labelKey: 'home.parent.leave' },
];

const CHART_COLORS = ['#B4213A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const STATUS_STYLE: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700',
    A: 'bg-red-100 text-red-700',
    L: 'bg-amber-100 text-amber-700',
    HD: 'bg-blue-100 text-blue-700',
    H: 'bg-slate-100 text-slate-500',
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};

const LEAVE_STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
};

const LEAVE_TYPE_VALUES: LeaveType[] = ['casual', 'sick', 'earned', 'maternity', 'unpaid'];

const ChildDashboardPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const id = Number(studentId);
    const queryClient = useQueryClient();

    const activeTab: Tab = (['overview', 'attendance', 'marks', 'fees', 'leave'].includes(searchParams.get('tab') || '')
        ? (searchParams.get('tab') as Tab)
        : 'overview');
    const setTab = (tab: Tab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    // Child name/class — shares the query key ParentHome and Sidebar already use, so this is cache, not a new request.
    const { data: childrenData } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
    });
    const child = childrenData?.children.find(c => c.student_id === id);
    const childName = child ? [child.first_name, child.last_name].filter(Boolean).join(' ') : '';

    const { data: attendance, isLoading: attLoading, error: attError } = useQuery({
        queryKey: ['parent', 'child-attendance', id],
        queryFn: () => parentService.getChildAttendance(id, 90),
        enabled: !!id,
    });
    const { data: marks, isLoading: marksLoading, error: marksError } = useQuery({
        queryKey: ['parent', 'child-marks', id],
        queryFn: () => parentService.getChildMarks(id),
        enabled: !!id,
    });
    const { data: comparison } = useQuery({
        queryKey: ['marks-comparison', id],
        queryFn: () => getMarksComparison(id),
        enabled: !!id,
    });
    const { data: fees, isLoading: feesLoading, error: feesError } = useQuery({
        queryKey: ['parent', 'child-fees', id],
        queryFn: () => parentService.getChildFees(id),
        enabled: !!id,
    });
    const { data: leaves, isLoading: leavesLoading } = useQuery({
        queryKey: ['parent', 'child-leaves', id],
        queryFn: () => leavesService.getChildLeaves(id),
        enabled: !!id,
    });

    // ── Analytics: marks trend (one line per subject, x = exam) ──────────────
    const showMarksChart = (comparison?.exams.length ?? 0) >= 2;
    const marksChartData = useMemo(() => {
        if (!comparison) return [];
        return comparison.exams.map(exam => {
            const row: Record<string, string | number | null> = { exam: exam.name };
            comparison.subjects.forEach(s => { row[s.subject_name] = s.pct_by_exam[String(exam.id)] ?? null; });
            return row;
        });
    }, [comparison]);
    const subjectNames = comparison?.subjects.map(s => s.subject_name) ?? [];

    // ── Analytics: attendance trend (present % per week, last ~90 days) ──────
    const attendanceChartData = useMemo(() => {
        if (!attendance?.records.length) return [];
        const buckets = new Map<string, { present: number; total: number }>();
        for (const r of attendance.records) {
            const d = new Date(r.date);
            const mondayOffset = (d.getDay() + 6) % 7;
            const monday = new Date(d);
            monday.setDate(d.getDate() - mondayOffset);
            const key = monday.toISOString().slice(0, 10);
            const bucket = buckets.get(key) ?? { present: 0, total: 0 };
            bucket.total += 1;
            if (r.status === 'P' || r.status === 'L' || r.status === 'HD') bucket.present += 1;
            buckets.set(key, bucket);
        }
        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([weekStart, { present, total }]) => ({
                week: new Date(weekStart).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
                attendance: total > 0 ? Math.round((present / total) * 100) : 0,
            }));
    }, [attendance, locale]);

    // ── Analytics: fee payments by month ──────────────────────────────────────
    const feeChartData = useMemo(() => {
        if (!fees?.payment_history.length) return [];
        const buckets = new Map<string, number>();
        for (const p of fees.payment_history) {
            const d = new Date(p.paid_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
        }
        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({
                month: new Date(`${month}-01`).toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
                amount,
            }));
    }, [fees, locale]);

    // ── Leave request form (Leave tab) ────────────────────────────────────────
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual' as LeaveType, start_date: '', end_date: '', reason: '' });
    const [leaveFormError, setLeaveFormError] = useState('');
    const [leaveFormSuccess, setLeaveFormSuccess] = useState('');

    const submitLeaveMutation = useMutation({
        mutationFn: () => leavesService.submitLeave({
            applicant_type: 'student',
            applicant_student_id: id,
            leave_type: leaveForm.leave_type,
            start_date: leaveForm.start_date,
            end_date: leaveForm.end_date,
            reason: leaveForm.reason || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent', 'child-leaves', id] });
            setLeaveFormSuccess(t('parent.leaveSubmitted'));
            setLeaveFormError('');
            setShowLeaveForm(false);
            setLeaveForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
            setTimeout(() => setLeaveFormSuccess(''), 4000);
        },
        onError: (err: any) => setLeaveFormError(err.response?.data?.detail || t('parent.failedSubmit')),
    });

    const handleLeaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveForm.start_date || !leaveForm.end_date) {
            setLeaveFormError(t('parent.dateRequired'));
            return;
        }
        setLeaveFormError('');
        submitLeaveMutation.mutate();
    };

    const LEAVE_TYPE_LABEL: Record<string, string> = {
        casual: t('leaves.typeCasual'), sick: t('leaves.typeSick'), earned: t('leaves.typeEarned'),
        maternity: t('leaves.typeMaternity'), unpaid: t('leaves.typeUnpaid'),
    };
    const LEAVE_STATUS_LABEL: Record<string, string> = {
        pending: t('leaves.statusPending'), approved: t('leaves.statusApproved'), rejected: t('leaves.statusRejected'),
    };
    const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
        P: t('attendance.present'), A: t('attendance.absent'), L: t('attendance.late'),
        HD: t('attendance.halfDay'), H: t('home.student.holiday'),
    };

    type MarkEntry = NonNullable<typeof marks>['marks'][number];
    const marksByExam = (marks?.marks ?? []).reduce<Record<string, MarkEntry[]>>((acc, m) => {
        (acc[m.exam_name] = acc[m.exam_name] || []).push(m);
        return acc;
    }, {});

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Link to="/home/parent" className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{childName || t('home.parent.myChildren')}</h1>
                            {child && (
                                <p className="text-xs font-semibold text-slate-500">
                                    {child.class_name}{child.section_name ? ` · ${child.section_name}` : ''} · {child.admission_no}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Analytics ─────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-4 h-4 text-brand" />
                                <h2 className="font-bold text-slate-800 text-sm">{t('parent.marksTrend')}</h2>
                            </div>
                            {showMarksChart ? (
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={marksChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="exam" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} domain={[0, 100]} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            {subjectNames.map((name, i) => (
                                                <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center">
                                    <p className="text-sm font-semibold text-slate-400">{t('parent.notEnoughExams')}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-brand" />
                                <h2 className="font-bold text-slate-800 text-sm">{t('parent.attendanceTrend')}</h2>
                            </div>
                            {attendanceChartData.length > 0 ? (
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={attendanceChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} domain={[0, 100]} />
                                            <Tooltip formatter={(v) => [`${v}%`, t('parent.attendance')]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                            <Bar dataKey="attendance" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center">
                                    <p className="text-sm font-semibold text-slate-400">{t('parent.noRecords')}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard className="w-4 h-4 text-brand" />
                                <h2 className="font-bold text-slate-800 text-sm">{t('parent.paymentHistory')}</h2>
                            </div>
                            {feeChartData.length > 0 ? (
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={feeChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                                            <Tooltip formatter={(v) => [`Rs ${Number(v).toLocaleString()}`, t('parent.paid')]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                            <Bar dataKey="amount" fill="#B4213A" radius={[4, 4, 0, 0]} barSize={28} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center">
                                    <p className="text-sm font-semibold text-slate-400">{t('parent.noPaymentHistory')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Tabs ──────────────────────────────────────────────── */}
                    <div className="flex p-1 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                                    activeTab === tab.id ? "bg-brand text-white shadow-md shadow-brand/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {t(tab.labelKey)}
                            </button>
                        ))}
                    </div>

                    {/* ── Attendance tab ────────────────────────────────────── */}
                    {activeTab === 'attendance' && (
                        <>
                            {attLoading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>}
                            {attError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" /> {t('parent.failedAttendance')}
                                </div>
                            )}
                            {attendance && (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                                            <p className="text-2xl font-bold text-slate-900">{attendance.total_days}</p>
                                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{t('parent.totalDays')}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm text-center">
                                            <p className="text-2xl font-bold text-emerald-700">{attendance.present_days}</p>
                                            <p className="text-xs font-semibold text-emerald-600 mt-0.5">{t('parent.present')}</p>
                                        </div>
                                        <div className="bg-brand/5 rounded-2xl p-4 border border-brand/20 shadow-sm text-center">
                                            <p className="text-2xl font-bold text-brand">{attendance.attendance_percent}%</p>
                                            <p className="text-xs font-semibold text-brand/70 mt-0.5">{t('parent.attendance')}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        {attendance.records.length === 0 ? (
                                            <p className="text-center text-slate-400 font-medium py-10">{t('parent.noRecords')}</p>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {attendance.records.map(r => (
                                                    <div key={r.date} className="flex items-center justify-between px-5 py-3">
                                                        <span className="text-sm font-semibold text-slate-700">
                                                            {new Date(r.date).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <span className={cn("text-xs font-bold px-3 py-1 rounded-lg", STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-500')}>
                                                            {ATTENDANCE_STATUS_LABEL[r.status] || r.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ── Marks tab ─────────────────────────────────────────── */}
                    {activeTab === 'marks' && (
                        <>
                            {marksLoading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>}
                            {marksError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" /> {t('parent.failedMarks')}
                                </div>
                            )}
                            {marks && Object.keys(marksByExam).length === 0 && (
                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                                    <p className="font-bold text-slate-400">{t('parent.noMarks')}</p>
                                </div>
                            )}
                            {Object.entries(marksByExam).map(([examName, entries]) => (
                                <div key={examName} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                                        <h2 className="font-bold text-slate-800">{examName}</h2>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {entries.map((m, i) => {
                                            const pct = m.max_marks && m.obtained != null ? Math.round((Number(m.obtained) / Number(m.max_marks)) * 100) : null;
                                            return (
                                                <div key={i} className="flex items-center justify-between px-5 py-3">
                                                    <span className="text-sm font-semibold text-slate-700">{m.subject_name}</span>
                                                    <div className="text-right">
                                                        {m.is_absent ? (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700">{t('marks.absent')}</span>
                                                        ) : (
                                                            <>
                                                                <span className="text-sm font-bold text-slate-900">{m.obtained ?? '–'} / {m.max_marks ?? '–'}</span>
                                                                {pct != null && (
                                                                    <p className={cn("text-xs font-semibold mt-0.5", pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600')}>{pct}%</p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* ── Fees tab ──────────────────────────────────────────── */}
                    {activeTab === 'fees' && (
                        <>
                            {feesLoading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>}
                            {feesError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-sm flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" /> {t('parent.failedFees')}
                                </div>
                            )}
                            {fees && (
                                <>
                                    <div className={cn("rounded-2xl p-5 border-2", Number(fees.total_due) > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
                                        <p className="text-sm font-semibold text-slate-600">{t('parent.totalOutstanding')}</p>
                                        <p className={cn("text-2xl md:text-3xl font-bold mt-0.5", Number(fees.total_due) > 0 ? "text-red-700" : "text-emerald-700")}>
                                            Rs {Number(fees.total_due).toLocaleString()}
                                        </p>
                                        {Number(fees.total_due) === 0 && (
                                            <p className="text-sm text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> {t('parent.allClear')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        {fees.fees.length === 0 ? (
                                            <p className="text-center text-slate-400 font-medium py-10">{t('parent.noFees')}</p>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {fees.fees.map((fee, i) => (
                                                    <div key={i} className="px-5 py-4">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{fee.fee_name}</p>
                                                                <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">{fee.frequency}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-slate-700">Rs {Number(fee.amount).toLocaleString()}</p>
                                                                <p className="text-xs text-emerald-600 font-medium mt-0.5">{t('parent.paid')} Rs {Number(fee.paid_amount).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        {Number(fee.balance) > 0 && (
                                                            <div className="mt-2 flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5">
                                                                <span className="text-xs font-semibold text-red-600">{t('parent.balanceDue')}</span>
                                                                <span className="text-sm font-bold text-red-700">Rs {Number(fee.balance).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {fees.payment_history.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                                                <h2 className="font-bold text-slate-800 text-sm">{t('parent.paymentHistory')}</h2>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {fees.payment_history.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-700">{p.fee_name || t('parent.payment')}</p>
                                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                                {new Date(p.paid_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} · {p.receipt_no}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-900">Rs {Number(p.amount).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* ── Leave tab ─────────────────────────────────────────── */}
                    {activeTab === 'leave' && (
                        <>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowLeaveForm(v => !v)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-95 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('parent.newRequest')}
                                </button>
                            </div>

                            {leaveFormSuccess && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2 text-emerald-700 font-medium text-sm">
                                    <CheckCircle2 className="w-5 h-5" /> {leaveFormSuccess}
                                </div>
                            )}

                            {showLeaveForm && (
                                <form onSubmit={handleLeaveSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                                    <h2 className="font-bold text-slate-800">{t('parent.newLeaveRequest')}</h2>
                                    {leaveFormError && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> {leaveFormError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('leaves.leaveType')}</label>
                                            <select
                                                value={leaveForm.leave_type}
                                                onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value as LeaveType }))}
                                                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                            >
                                                {LEAVE_TYPE_VALUES.map(val => <option key={val} value={val}>{LEAVE_TYPE_LABEL[val]}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('parent.startDate')}</label>
                                            <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(p => ({ ...p, start_date: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('parent.endDate')}</label>
                                            <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(p => ({ ...p, end_date: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('leaves.reason')}</label>
                                            <input type="text" value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} placeholder={t('parent.briefReason')} className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" disabled={submitLeaveMutation.isPending} className="px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
                                            {submitLeaveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {t('leaves.submitRequest')}
                                        </button>
                                        <button type="button" onClick={() => setShowLeaveForm(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {leavesLoading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>}
                            {leaves && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    {leaves.leaves.length === 0 ? (
                                        <p className="text-center text-slate-400 font-medium py-10">{t('parent.noLeaves')}</p>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {leaves.leaves.map(leave => (
                                                <div key={leave.id} className="px-5 py-4 flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type} {t('parent.leaveLabel')}</p>
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5">{leave.start_date} → {leave.end_date}</p>
                                                        {leave.reason && <p className="text-xs text-slate-500 mt-0.5">{leave.reason}</p>}
                                                    </div>
                                                    <span className={cn("flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg shrink-0", LEAVE_STATUS_STYLE[leave.status])}>
                                                        {LEAVE_STATUS_ICON[leave.status]}
                                                        {LEAVE_STATUS_LABEL[leave.status] ?? leave.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChildDashboardPage;
