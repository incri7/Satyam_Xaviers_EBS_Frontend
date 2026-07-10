import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { peopleService } from '../../api/services/people.service';
import {
    ArrowLeft, GraduationCap, Users, Wallet, CalendarDays,
    Phone, Mail, Briefcase, Receipt, Loader2, AlertCircle, Star,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_STYLES: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700',
    A: 'bg-red-100 text-red-700',
    L: 'bg-amber-100 text-amber-700',
    HD: 'bg-blue-100 text-blue-700',
};

const StudentDetailPage: React.FC = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['student-summary', studentId],
        queryFn: () => peopleService.getStudentSummary(Number(studentId)),
        enabled: !!studentId,
    });

    const fullName = data
        ? `${data.student.first_name} ${data.student.middle_name || ''} ${data.student.last_name || ''}`.replace(/\s+/g, ' ').trim()
        : '';

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <button
                        onClick={() => navigate('/people')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to People
                    </button>

                    {isLoading && (
                        <div className="flex justify-center py-24">
                            <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        </div>
                    )}

                    {isError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {(error as any)?.response?.data?.detail || 'Failed to load student'}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Header card */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-5">
                                <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center text-brand text-3xl font-black shrink-0">
                                    {data.student.first_name?.[0]?.toUpperCase() || 'S'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                                        <span className={cn(
                                            'px-2.5 py-1 rounded-lg text-xs font-bold uppercase',
                                            data.student.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-slate-100 text-slate-500'
                                        )}>
                                            {data.student.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 mt-1">
                                        Adm No: {data.student.admission_no || '—'}
                                        {data.enrollment && (
                                            <span className="text-slate-500">
                                                {' '}· {data.enrollment.class_name}
                                                {data.enrollment.section_name ? ` — ${data.enrollment.section_name}` : ''}
                                                {' '}· {data.enrollment.academic_year}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs font-medium text-slate-500">
                                        {data.student.dob && <span>DOB: {new Date(data.student.dob).toLocaleDateString()}</span>}
                                        {data.student.gender && <span>Gender: {data.student.gender}</span>}
                                        {data.student.blood_group && <span>Blood: {data.student.blood_group}</span>}
                                        {data.student.city && <span>{data.student.city}{data.student.state ? `, ${data.student.state}` : ''}</span>}
                                        {data.student.admission_date && <span>Admitted: {new Date(data.student.admission_date).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Stat row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">
                                        <CalendarDays className="w-4 h-4" />
                                        Attendance (30 days)
                                    </div>
                                    <p className={cn(
                                        'text-3xl font-black',
                                        data.attendance.attendance_pct == null ? 'text-slate-300' :
                                        data.attendance.attendance_pct < 75 ? 'text-red-600' :
                                        data.attendance.attendance_pct < 85 ? 'text-amber-600' : 'text-emerald-600'
                                    )}>
                                        {data.attendance.attendance_pct != null ? `${data.attendance.attendance_pct}%` : '—'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {data.attendance.last_30_days_present}/{data.attendance.last_30_days_total} days present
                                    </p>
                                    {data.attendance.recent.length > 0 && (
                                        <div className="flex gap-1 mt-3 flex-wrap">
                                            {data.attendance.recent.slice(0, 10).map((r) => (
                                                <span
                                                    key={r.date}
                                                    title={r.date}
                                                    className={cn('w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center', STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-500')}
                                                >
                                                    {r.status}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">
                                        <Wallet className="w-4 h-4" />
                                        Fee Balance
                                    </div>
                                    <p className={cn('text-3xl font-black', data.fees.balance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                                        Rs. {Math.abs(data.fees.balance).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {data.fees.balance > 0 ? 'outstanding' : 'fully paid / in credit'} · assigned Rs. {data.fees.total_assigned.toLocaleString()} · paid Rs. {data.fees.total_paid.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">
                                        <GraduationCap className="w-4 h-4" />
                                        Enrollment
                                    </div>
                                    {data.enrollment ? (
                                        <>
                                            <p className="text-xl font-black text-slate-900">
                                                {data.enrollment.class_name}{data.enrollment.section_name ? ` — ${data.enrollment.section_name}` : ''}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Academic year {data.enrollment.academic_year}</p>
                                        </>
                                    ) : (
                                        <p className="text-sm font-bold text-amber-600">Not enrolled this year</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Guardians */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-brand" />
                                        <h2 className="font-bold text-slate-900 text-sm">Guardians</h2>
                                    </div>
                                    {data.guardians.length === 0 ? (
                                        <div className="py-10 text-center text-slate-400 text-sm font-medium">No guardians linked</div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {data.guardians.map((g) => (
                                                <div key={g.parent_id} className="px-5 py-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-slate-900 text-sm">{g.name}</p>
                                                        {g.relationship && (
                                                            <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">{g.relationship}</span>
                                                        )}
                                                        {g.is_primary_contact && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-600 uppercase">
                                                                <Star className="w-3 h-3" /> Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-medium text-slate-500">
                                                        {g.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phone}</span>}
                                                        {g.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{g.email}</span>}
                                                        {g.occupation && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{g.occupation}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Recent payments */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-brand" />
                                        <h2 className="font-bold text-slate-900 text-sm">Recent Payments</h2>
                                    </div>
                                    {data.recent_payments.length === 0 ? (
                                        <div className="py-10 text-center text-slate-400 text-sm font-medium">No payments recorded</div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {data.recent_payments.map((p) => (
                                                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 text-sm">{p.receipt_no || `Payment #${p.id}`}</p>
                                                        <p className="text-[11px] font-medium text-slate-400">
                                                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                                                            {p.method ? ` · ${p.method.replace('_', ' ')}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className={cn('font-black text-sm', p.amount < 0 ? 'text-red-600' : 'text-slate-900')}>
                                                        Rs. {p.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentDetailPage;
