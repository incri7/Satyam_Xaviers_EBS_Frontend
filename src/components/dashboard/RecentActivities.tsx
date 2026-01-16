import React from 'react';
import { motion } from 'framer-motion';

const activities = [
    { id: '1', action: '5 new student admissions', time: 'Today' },
    { id: '2', action: '2 staff leave approvals', time: 'Today' },
    { id: '3', action: '12 fee payment reminders sent', time: '2 hours ago' },
    { id: '4', action: 'Annual Day notice published', time: '5 hours ago' },
    { id: '5', action: 'Monthly backup completed', time: 'Yesterday' },
];

export const RecentActivities: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm h-full"
        >
            <h3 className="text-base font-bold text-slate-800 mb-8">Recent Activities</h3>
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
        </motion.div>
    );
};
