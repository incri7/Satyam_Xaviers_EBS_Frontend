import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import NLQBar from '../../components/NLQBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/useAuthStore';
import { financesService } from '../../api/services/finances.service';
import { Users, TrendingDown, CheckCircle2, Activity } from 'lucide-react';

const PrincipalHome: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();
    const today = new Date();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const todayLabel = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    const firstName = user?.firstName || 'Principal';

    const [presentCount, setPresentCount] = useState<number | null>(null);
    const [lateFlash, setLateFlash] = useState(false);

    const { data: monthlyReport } = useQuery({
        queryKey: ['finances', 'monthly-report', today.getFullYear(), today.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(today.getFullYear(), today.getMonth() + 1),
    });

    const { data: outstanding } = useQuery({
        queryKey: ['finances', 'outstanding'],
        queryFn: () => financesService.getOutstanding(200),
    });

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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {t('home.goodMorning')}, {firstName}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">{todayLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className={`bg-white rounded-2xl border-2 p-4 transition-all ${lateFlash ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.principal.presentToday')}</p>
                            </div>
                            <p className="text-3xl font-black text-slate-900 tabular-nums">
                                {presentCount !== null ? presentCount : '—'}
                            </p>
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">{t('home.principal.liveUpdate')}</p>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">{t('home.principal.outstanding')}</p>
                            </div>
                            <p className="text-2xl font-black text-red-700">
                                Rs {Number(totalOutstanding).toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-slate-400" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('home.principal.familiesDue')}</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{familiesDue}</p>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{t('home.principal.thisMonth')}</p>
                            </div>
                            <p className="text-2xl font-black text-emerald-700">
                                Rs {monthlyReport ? Number(monthlyReport.total_collected).toLocaleString() : '—'}
                            </p>
                        </div>
                    </div>

                    <NLQBar />
                </div>
            </main>
        </div>
    );
};

export default PrincipalHome;
