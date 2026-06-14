import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

export const FeeCollectionCard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const now = new Date();

    const { data: outstanding } = useQuery({
        queryKey: ['fee-outstanding'],
        queryFn: () => financesService.getOutstanding(500),
        staleTime: 5 * 60 * 1000,
    });

    const { data: monthlyReport } = useQuery({
        queryKey: ['monthly-report-fee-card', now.getFullYear(), now.getMonth() + 1],
        queryFn: () => financesService.getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
        staleTime: 5 * 60 * 1000,
    });

    const collected = monthlyReport?.total_collected ?? 0;
    const totalOutstanding = outstanding?.total_outstanding ?? 0;
    const isLoading = !monthlyReport && !outstanding;

    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';

    const data = [
        { name: t('dashboard.collected'), value: collected, color: '#10B981' },
        { name: t('dashboard.outstanding'), value: totalOutstanding, color: '#EF4444' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-1">{t('dashboard.feeStatus')}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
                {now.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </p>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `Rs ${Number(value).toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4 w-full">
                    {data.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">{item.name}:</span>
                            </div>
                            <span className={cn(
                                "text-xs font-bold",
                                item.color === '#10B981' ? "text-green-500" : "text-red-500"
                            )}>
                                {isLoading ? '—' : `Rs ${item.value.toLocaleString()}`}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
