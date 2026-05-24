import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { attendanceService } from '../../api/services/attendance.service';

export const AttendanceOverviewCard: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: classesData } = useQuery({
        queryKey: ['classes-attendance-overview'],
        queryFn: () => academicsService.getClasses({ limit: 20 }),
        staleTime: 10 * 60 * 1000,
    });

    const { data: attendanceData } = useQuery({
        queryKey: ['attendance-today-overview', today],
        queryFn: () => attendanceService.getAttendances({ date: today, limit: 100 }),
        staleTime: 60 * 1000,
    });

    const classMap = new Map((classesData?.classes ?? []).map(c => [c.id, c.name]));

    const grouped = new Map<number, { present: number; total: number }>();
    for (const record of attendanceData?.attendances ?? []) {
        if (!grouped.has(record.class_id)) {
            grouped.set(record.class_id, { present: 0, total: 0 });
        }
        const g = grouped.get(record.class_id)!;
        g.total += 1;
        if (record.status === 'P' || record.status === 'L' || record.status === 'HD') {
            g.present += 1;
        }
    }

    const data = Array.from(grouped.entries())
        .map(([classId, { present, total }]) => ({
            class: classMap.get(classId) ?? `Class ${classId}`,
            attendance: total > 0 ? Math.round((present / total) * 100) : 0,
        }))
        .sort((a, b) => a.class.localeCompare(b.class));

    const hasData = data.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-1">Attendance Overview by Class</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Today — {today}</p>
            {!hasData ? (
                <div className="h-[240px] flex items-center justify-center">
                    <p className="text-sm font-semibold text-slate-400">No attendance marked today yet</p>
                </div>
            ) : (
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis
                                dataKey="class"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                                dx={-10}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                formatter={(value) => [`${value}%`, 'Attendance']}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar
                                dataKey="attendance"
                                fill="#10B981"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10B981] rounded-sm"></div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">attendance %</span>
                </div>
            </div>
        </motion.div>
    );
};
