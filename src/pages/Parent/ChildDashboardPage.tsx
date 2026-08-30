import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { ChildPageHeader } from '../../components/parent/ChildPageHeader';
import { parentService } from '../../api/services/parent.service';
import { getMarksComparison } from '../../api/services/exams.service';
import { TrendingUp, Calendar, CreditCard } from 'lucide-react';

const CHART_COLORS = ['#B4213A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const ChildDashboardPage: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const id = Number(studentId);

    const { data: attendance } = useQuery({
        queryKey: ['parent', 'child-attendance', id],
        queryFn: () => parentService.getChildAttendance(id, 90),
        enabled: !!id,
    });
    const { data: comparison } = useQuery({
        queryKey: ['marks-comparison', id],
        queryFn: () => getMarksComparison(id),
        enabled: !!id,
    });
    const { data: fees } = useQuery({
        queryKey: ['parent', 'child-fees', id],
        queryFn: () => parentService.getChildFees(id),
        enabled: !!id,
    });

    // ── Marks trend (one line per subject, x = exam) ──────────────────────────
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

    // ── Attendance trend (present % per week, last ~90 days) ──────────────────
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

    // ── Fee payments by month ───────────────────────────────────────────────
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

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <ChildPageHeader studentId={id} />

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
                </div>
            </main>
        </div>
    );
};

export default ChildDashboardPage;
