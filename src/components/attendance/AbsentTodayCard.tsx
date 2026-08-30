import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserX, CheckCircle2 } from 'lucide-react';
import { attendanceService } from '../../api/services/attendance.service';

export const AbsentTodayCard: React.FC = () => {
    const { t } = useTranslation();

    const { data, isLoading } = useQuery({
        queryKey: ['attendance', 'absent-today'],
        queryFn: () => attendanceService.getAbsentToday(),
    });

    const students = data?.students ?? [];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                <h2 className="font-bold text-slate-800">{t('home.absentToday.title')}</h2>
                {data && (
                    <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-lg">
                        {data.count}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="py-10 text-center text-sm text-slate-400 font-medium">…</div>
            )}

            {!isLoading && students.length === 0 && (
                <div className="py-10 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-400 text-sm">
                        {data?.any_marked ? t('home.absentToday.allPresent') : t('home.absentToday.notMarkedYet')}
                    </p>
                </div>
            )}

            {students.length > 0 && (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {students.map(s => (
                        <div key={s.student_id} className="px-5 py-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-slate-900 truncate">{s.student_name}</span>
                            <span className="text-xs font-medium text-slate-400 shrink-0">
                                {s.class_name ?? '—'}
                                {s.section_name ? ` · ${s.section_name}` : ` · ${t('home.absentToday.noSection')}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
