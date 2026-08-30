import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import NLQBar from '../../components/NLQBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/useAuthStore';
import { financesService } from '../../api/services/finances.service';
import { attendanceService } from '../../api/services/attendance.service';
import { peopleService } from '../../api/services/people.service';
import { LeaveBalanceCard } from '../../components/leaves/LeaveBalanceCard';
import { AbsentTodayCard } from '../../components/attendance/AbsentTodayCard';
import { Users, TrendingDown, CheckCircle2, Activity, ArrowRight } from 'lucide-react';

const PrincipalHome: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const goToFeesReport = () => {
        localStorage.setItem('reports_active_tab', 'fees');
        navigate('/reports');
    };
    const today = new Date();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const todayLabel = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    const firstName = user?.firstName || 'Principal';

    const [presentCount, setPresentCount] = useState<number | null>(null);
    const [lateFlash, setLateFlash] = useState(false);

    // Seed the live counter with today's actual count; WS events increment from there
    const { data: todaySummary } = useQuery({
        queryKey: ['attendance', 'today-summary'],
        queryFn: attendanceService.getTodaySummary,
    });
    useEffect(() => {
        if (todaySummary && presentCount === null) {
            setPresentCount(todaySummary.present);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todaySummary]);

    const { data: monthlyReport } = useQuery({
        queryKey: ['finances', 'monthly-report', today.getFullYear(), today.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(today.getFullYear(), today.getMonth() + 1),
    });

    const { data: outstanding } = useQuery({
        queryKey: ['finances', 'outstanding'],
        queryFn: () => financesService.getOutstanding(200),
    });

    // Total students in the school — the denominator the principal expects,
    // shown even before any attendance is marked.
    const { data: studentsMeta } = useQuery({
        queryKey: ['students-total'],
        queryFn: () => peopleService.getStudents({ limit: 1, filter_by_status: 'active' }),
        staleTime: 5 * 60 * 1000,
    });
    const totalStudents = studentsMeta?.total_count ?? todaySummary?.expected ?? null;

    const handleAttendanceUpdated = useCallback((event: { payload: Record<string, unknown> }) => {
        const status = event.payload.status as string;
        if (status === 'P' || status === 'L' || status === 'HD') {
            setPresentCount(prev => (prev ?? 0) + 1);
            setLateFlash(true);
            setTimeout(() => setLateFlash(false), 800);
        }
    }, []);

    useWebSocket({
        'attendance.updated': handleAttendanceUpdated,
    });

    const totalOutstanding = outstanding?.total_outstanding ?? 0;
    const familiesDue = outstanding?.entries.length ?? 0;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {t('home.goodMorning')}, {firstName}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => navigate('/reports')}
                            className={`text-left bg-white rounded-2xl border-2 p-4 transition-all group hover:shadow-md hover:border-emerald-300 ${lateFlash ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.principal.presentToday')}</p>
                            </div>
                            <p className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
                                {presentCount !== null ? presentCount : '—'}
                                {totalStudents != null && (
                                    <span className="text-base text-slate-400 font-bold"> / {totalStudents}</span>
                                )}
                            </p>
                            <p className="text-xs font-bold mt-0.5 flex items-center gap-1">
                                {todaySummary && todaySummary.marked > 0 ? (
                                    <span className="text-red-600">{todaySummary.absent} {t('dashboard.absent', 'absent')}</span>
                                ) : (
                                    <span className="text-slate-400">{t('dashboard.noAttendanceYet', 'Not marked yet')}</span>
                                )}
                                <ArrowRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </button>

                        <button
                            onClick={goToFeesReport}
                            className="text-left bg-red-50 border border-red-100 rounded-2xl p-4 transition-all group hover:shadow-md hover:border-red-300"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">{t('home.principal.outstanding')}</p>
                            </div>
                            <p className="text-2xl font-black text-red-700 flex items-center gap-1">
                                Rs {Number(totalOutstanding).toLocaleString()}
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </button>

                        <button
                            onClick={goToFeesReport}
                            className="text-left bg-white border border-slate-100 rounded-2xl p-4 shadow-sm transition-all group hover:shadow-md hover:border-slate-300"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-slate-400" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.principal.familiesDue')}</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900 flex items-center gap-1">
                                {familiesDue}
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </button>

                        <button
                            onClick={goToFeesReport}
                            className="text-left bg-emerald-50 border border-emerald-100 rounded-2xl p-4 transition-all group hover:shadow-md hover:border-emerald-300"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{t('home.principal.thisMonth')}</p>
                            </div>
                            <p className="text-2xl font-black text-emerald-700 flex items-center gap-1">
                                Rs {monthlyReport ? Number(monthlyReport.total_collected).toLocaleString() : '—'}
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                        </button>
                    </div>

                    <LeaveBalanceCard />

                    <AbsentTodayCard />

                    <NLQBar />
                </div>
            </main>
        </div>
    );
};

export default PrincipalHome;
