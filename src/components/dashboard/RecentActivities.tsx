import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { noticesService } from '../../api/services/notices.service';
import { useTranslation } from 'react-i18next';

const useRelativeTime = () => {
    const { t } = useTranslation();

    return (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffDays === 0) {
            if (diffHours < 1) return t('dashboard.justNow');
            return t('dashboard.hoursAgo', { count: diffHours });
        }
        if (diffDays === 1) return t('dashboard.yesterday');
        return t('dashboard.daysAgo', { count: diffDays });
    };
};

export const RecentActivities: React.FC = () => {
    const { t } = useTranslation();
    const formatRelativeTime = useRelativeTime();

    const { data: notices, isLoading } = useQuery({
        queryKey: ['recent-notices-dashboard'],
        queryFn: () => noticesService.getNotices({ limit: 5 }),
        staleTime: 2 * 60 * 1000,
    });

    const activities = (notices ?? []).map(n => ({
        id: String(n.id),
        action: n.title,
        time: formatRelativeTime(n.created_at),
        priority: n.priority,
    }));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm h-full"
        >
            <h3 className="text-base font-bold text-slate-800 mb-8">{t('dashboard.recentNotices')}</h3>
            {isLoading ? (
                <div className="space-y-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-slate-200 rounded w-3/4" />
                                <div className="h-2 bg-slate-100 rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400">{t('dashboard.noNotices')}</p>
            ) : (
                <div className="space-y-8">
                    {activities.map((activity, index) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            key={activity.id}
                            className="flex gap-4 group cursor-pointer"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0 group-hover:scale-150 transition-transform duration-300" />
                            <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1 group-hover:text-brand transition-colors">{activity.action}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};
