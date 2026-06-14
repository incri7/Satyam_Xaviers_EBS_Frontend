import { Users, IndianRupee, UserCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { attendanceService } from '../../api/services/attendance.service';
import { financesService } from '../../api/services/finances.service';
import { useTranslation } from 'react-i18next';

interface StatCardProps {
    title: string;
    value: string;
    trend: string;
    isPositive: boolean;
    icon: React.ElementType;
    color: 'blue' | 'purple' | 'green' | 'red';
}

const colorVariants = {
    blue: 'bg-[#E3F2FD] text-[#2196F3]',
    purple: 'bg-[#F3E5F5] text-[#9C27B0]',
    green: 'bg-[#E8F5E9] text-[#4CAF50]',
    red: 'bg-[#FFF3E0] text-[#FB8C00]',
};

export const StatCard: React.FC<StatCardProps & { index: number }> = ({ title, value, trend, icon: Icon, color, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 group"
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{value}</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mb-2">{trend}</p>
                </div>
                <div className={cn("p-3.5 rounded-xl transition-all group-hover:bg-opacity-100 duration-300", colorVariants[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
};

export const StatGrid: React.FC = () => {
    const { t, i18n } = useTranslation();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const { data: studentsData } = useQuery({
        queryKey: ['students-count'],
        queryFn: () => peopleService.getStudents({ limit: 1 }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: staffData } = useQuery({
        queryKey: ['staff-count'],
        queryFn: () => peopleService.getStaffList({ limit: 1 }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: attendanceData } = useQuery({
        queryKey: ['attendance-today-count', today],
        queryFn: () => attendanceService.getAttendances({ date: today, limit: 1 }),
        staleTime: 60 * 1000,
    });
    const { data: monthlyReport } = useQuery({
        queryKey: ['monthly-revenue', now.getFullYear(), now.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
        staleTime: 5 * 60 * 1000,
    });

    const totalStudents = studentsData?.total_count != null ? studentsData.total_count.toLocaleString() : '—';
    const totalStaff = staffData?.total_count != null ? staffData.total_count.toLocaleString() : '—';
    const todayMarked = attendanceData?.total_count != null ? attendanceData.total_count.toLocaleString() : '—';
    const monthlyRevenue = monthlyReport?.total_collected != null
        ? `Rs ${Number(monthlyReport.total_collected).toLocaleString()}`
        : '—';

    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
    const monthYearLabel = now.toLocaleString(locale, { month: 'long', year: 'numeric' });

    const stats: StatCardProps[] = [
        {
            title: t('dashboard.totalStudents'),
            value: totalStudents,
            trend: t('dashboard.enrolledThisYear'),
            isPositive: true,
            icon: Users,
            color: 'blue',
        },
        {
            title: t('dashboard.totalStaff'),
            value: totalStaff,
            trend: t('dashboard.activeStaff'),
            isPositive: true,
            icon: UserCheck,
            color: 'purple',
        },
        {
            title: t('dashboard.todayAttendance'),
            value: todayMarked,
            trend: t('dashboard.recordsMarked'),
            isPositive: true,
            icon: CheckCircle2,
            color: 'green',
        },
        {
            title: t('dashboard.monthlyRevenue'),
            value: monthlyRevenue,
            trend: monthYearLabel,
            isPositive: true,
            icon: IndianRupee,
            color: 'red',
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
