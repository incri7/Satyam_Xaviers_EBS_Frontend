import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface PermissionStatsProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    color: string;
}

export const PermissionStats: React.FC<PermissionStatsProps> = ({
    icon: Icon,
    label,
    value,
    color
}) => {
    // Map colors to full Tailwind classes to ensure they are constrained and purged correctly
    const colorVariants: Record<string, string> = {
        blue: 'bg-blue-500 text-white shadow-blue-200',
        indigo: 'bg-indigo-500 text-white shadow-indigo-200',
        emerald: 'bg-emerald-500 text-white shadow-emerald-200',
        purple: 'bg-purple-500 text-white shadow-purple-200',
        orange: 'bg-orange-500 text-white shadow-orange-200',
        red: 'bg-red-500 text-white shadow-red-200',
        slate: 'bg-slate-500 text-white shadow-slate-200',
    };

    const bgClass = colorVariants[color] || colorVariants.blue;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${bgClass}`}>
                <Icon className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
        </motion.div>
    );
};
