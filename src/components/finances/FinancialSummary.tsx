import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { financesService } from '../../api/services/finances.service';
import { TrendingUp, TrendingDown, CreditCard, PieChart, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export const FinancialSummary: React.FC = () => {
    const { data: summary, isLoading } = useQuery({
        queryKey: ['financial-summary'],
        queryFn: () => financesService.getFinancialSummary(),
    });

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
        }).format(amt);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Income',
            value: summary?.total_income || 0,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: <ArrowUpRight className="w-4 h-4" />,
            trendColor: 'text-emerald-500'
        },
        {
            label: 'Total Expenses',
            value: summary?.total_expense || 0,
            icon: TrendingDown,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            trend: <ArrowDownRight className="w-4 h-4" />,
            trendColor: 'text-rose-500'
        },
        {
            label: 'Net Balance',
            value: summary?.net_balance || 0,
            icon: CreditCard,
            color: 'text-brand',
            bg: 'bg-brand/5',
            trend: <PieChart className="w-4 h-4" />,
            trendColor: 'text-brand'
        }
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", card.bg, card.color)}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", card.bg, card.trendColor)}>
                                    {card.trend}
                                    Stats
                                </div>
                            </div>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">{card.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                {formatCurrency(card.value)}
                            </h3>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Period Info */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">Report Period</h4>
                            <p className="text-sm text-slate-500 font-medium">Last 30 days summary</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-600">Start Date</span>
                            <span className="text-sm font-black text-slate-900">{summary?.start_date}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-600">End Date</span>
                            <span className="text-sm font-black text-slate-900">{summary?.end_date}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="bg-brand rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-brand/20">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <h4 className="text-xl font-bold mb-2">Financial Health</h4>
                            <p className="text-white/80 font-medium text-sm leading-relaxed">
                                Your school's current financial balance is looking {summary && summary.net_balance >= 0 ? 'positive' : 'negative'}. Review expenses to maintain a healthy budget.
                            </p>
                        </div>
                        <div className="pt-8">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Current Balance</p>
                                    <p className="text-4xl font-black tracking-tight">{formatCurrency(summary?.net_balance || 0)}</p>
                                </div>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center self-end">
                                    <TrendingUp className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
                </div>
            </div>
        </div>
    );
};
