import { Users, IndianRupee, CheckCircle2, ArrowRight, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { attendanceService } from '../../api/services/attendance.service';
import { financesService } from '../../api/services/finances.service';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../hooks/useDateFormat';

interface StatCardProps {
    title: string;
    value: string;
    trend: string;
    isPositive: boolean;
    icon: React.ElementType;
    color: 'blue' | 'purple' | 'green' | 'red';
    onClick?: () => void;
}

const colorVariants = {
    blue: 'bg-[#E3F2FD] text-[#2196F3]',
    purple: 'bg-[#F3E5F5] text-[#9C27B0]',
    green: 'bg-[#E8F5E9] text-[#4CAF50]',
    red: 'bg-[#FFF3E0] text-[#FB8C00]',
};

export const StatCard: React.FC<StatCardProps & { index: number }> = ({ title, value, trend, icon: Icon, color, index, onClick }) => {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand/20 transition-all duration-300 group text-left w-full cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{value}</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                        {trend}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand" />
                    </p>
                </div>
                <div className={cn("p-3.5 rounded-xl transition-all group-hover:bg-opacity-100 duration-300", colorVariants[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.button>
    );
};

export const StatGrid: React.FC = () => {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const { data: studentsData } = useQuery({
        queryKey: ['students-count'],
        queryFn: () => peopleService.getStudents({ limit: 1 }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: todaySummary } = useQuery({
        queryKey: ['attendance', 'today-summary', today],
        queryFn: attendanceService.getTodaySummary,
        staleTime: 60 * 1000,
    });
    const { data: outstanding } = useQuery({
        queryKey: ['finances', 'outstanding-summary'],
        queryFn: () => financesService.getOutstanding(500),
        staleTime: 5 * 60 * 1000,
    });
    const { data: monthlyReport } = useQuery({
        queryKey: ['monthly-revenue', now.getFullYear(), now.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
        staleTime: 5 * 60 * 1000,
    });

    const totalStudents = studentsData?.total_count != null ? studentsData.total_count.toLocaleString() : '—';

    // Present today with full context: X present / Y expected, Z absent,
    // and how many sections still haven't marked (per-class detail is in
    // the Attendance Overview card below).
    const s = todaySummary;
    const presentToday = s ? `${s.present}/${s.expected || '—'}` : '—';
    const sectionsUnmarked = s ? Math.max(0, (s.sections_total ?? 0) - (s.sections_marked ?? 0)) : 0;
    const attendanceTrend = s
        ? s.marked === 0
            ? t('dashboard.noAttendanceYet', 'Not marked yet today')
            : `${s.absent} ${t('dashboard.absent', 'absent')}${sectionsUnmarked > 0 ? ` · ${sectionsUnmarked} ${t('dashboard.sectionsUnmarked', 'sections unmarked')}` : ''}`
        : '';

    const outstandingTotal = outstanding?.total_outstanding != null
        ? `Rs ${Number(outstanding.total_outstanding).toLocaleString()}`
        : '—';
    const familiesDue = outstanding?.entries?.length ?? 0;

    const monthlyRevenue = monthlyReport?.total_collected != null
        ? `Rs ${Number(monthlyReport.total_collected).toLocaleString()}`
        : '—';

    const monthYearLabel = df.date(now, 'monthYear');

    const goToPeopleTab = (tab: string) => {
        localStorage.setItem('people_active_tab', tab);
        navigate('/people');
    };
    const goToFinancesTab = (tab: string) => {
        localStorage.setItem('finances_active_tab', tab);
        navigate('/finances');
    };
    const goToFeesReport = () => navigate('/finances/outstanding');

    const stats: StatCardProps[] = [
        {
            title: t('dashboard.totalStudents'),
            value: totalStudents,
            trend: t('dashboard.enrolledThisYear'),
            isPositive: true,
            icon: Users,
            color: 'blue',
            onClick: () => goToPeopleTab('students'),
        },
        {
            title: t('dashboard.presentToday', 'Present Today'),
            value: presentToday,
            trend: attendanceTrend,
            isPositive: true,
            icon: CheckCircle2,
            color: 'green',
            onClick: () => navigate('/attendance'),
        },
        {
            title: t('dashboard.feesOutstanding', 'Fees Outstanding'),
            value: outstandingTotal,
            trend: `${familiesDue} ${t('dashboard.familiesDue', 'families due')}`,
            isPositive: false,
            icon: TrendingDown,
            color: 'purple',
            onClick: goToFeesReport,
        },
        {
            title: t('dashboard.monthlyRevenue'),
            value: monthlyRevenue,
            trend: monthYearLabel,
            isPositive: true,
            icon: IndianRupee,
            color: 'red',
            onClick: () => goToFinancesTab('payments'),
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
                <StatCard key={stat.title} {...stat} index={index} />
            ))}
        </div>
    );
};
