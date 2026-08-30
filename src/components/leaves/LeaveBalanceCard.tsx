import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Umbrella } from 'lucide-react';
import { leavesService } from '../../api/services/leaves.service';

export const LeaveBalanceCard: React.FC = () => {
    const { t } = useTranslation();

    const { data: leaveBalance } = useQuery({
        queryKey: ['leaves', 'my-balance'],
        queryFn: () => leavesService.getMyBalance(),
    });

    if (!leaveBalance) return null;

    const balanceItems = [
        { labelKey: 'leaves.typeCasual', remaining: leaveBalance.casual_remaining, total: leaveBalance.casual_total },
        { labelKey: 'leaves.typeSick', remaining: leaveBalance.sick_remaining, total: leaveBalance.sick_total },
        { labelKey: 'leaves.typeEarned', remaining: leaveBalance.earned_remaining, total: leaveBalance.earned_total },
        { labelKey: 'leaves.typeMaternity', remaining: leaveBalance.maternity_remaining, total: leaveBalance.maternity_total },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Umbrella className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-slate-700">{t('home.teacher.leaveBalance')} {leaveBalance.year}</span>
                </div>
                <Link to="/leave" className="text-xs font-bold text-brand hover:underline">
                    {t('home.teacher.applyLeave')}
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {balanceItems.map(item => (
                    <div key={item.labelKey} className="text-center">
                        <p className="text-lg font-black text-slate-900">{item.remaining}</p>
                        <p className="text-xs text-slate-400 font-medium">/{item.total} {t(item.labelKey)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
