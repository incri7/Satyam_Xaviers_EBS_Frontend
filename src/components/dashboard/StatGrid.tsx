import { Users, IndianRupee, UserCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

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

export const StatCard: React.FC<StatCardProps & { index: number }> = ({ title, value, icon: Icon, color, index }) => {
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
                    <p className="text-[10px] font-semibold text-slate-400 mb-2">Enrolled this year</p>
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-green-500">
                        +12% from last year
                    </div>
                </div>
                <div className={cn("p-3.5 rounded-xl transition-all group-hover:bg-opacity-100 duration-300", colorVariants[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
};

export const StatGrid: React.FC = () => {
    const stats: StatCardProps[] = [
        {
            title: 'Total Students',
            value: '1,234',
            trend: '+12%',
            isPositive: true,
            icon: Users,
            color: 'blue',
        },
        {
            title: 'Total Staff',
            value: '87',
            trend: '+3 new hires',
            isPositive: true,
            icon: UserCheck,
            color: 'purple',
        },
        {
            title: "Today's Attendance",
            value: '95%',
            trend: '1,172 / 1,234 present',
            isPositive: true,
            icon: CheckCircle2,
            color: 'green',
        },
        {
            title: 'Monthly Revenue',
            value: '₹2,45,000',
            trend: '78%',
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
