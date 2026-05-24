import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useQueries } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';

const now = new Date();
const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
const YEARS = Array.from({ length: 5 }, (_, i) => {
    const start = currentStartYear - (4 - i);
    return `${start}-${start + 1}`;
});

export const EnrollmentTrendsCard: React.FC = () => {
    const results = useQueries({
        queries: YEARS.map(year => ({
            queryKey: ['enrollment-count', year],
            queryFn: () => academicsService.getEnrollments({ academic_year: year, limit: 1 }),
            staleTime: 10 * 60 * 1000,
        })),
    });

    const data = YEARS.map((year, i) => ({
        year,
        students: results[i].data?.total_count ?? 0,
    })).filter(d => d.students > 0);

    const hasData = data.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-6">Student Enrollment Trends</h3>
            {!hasData ? (
                <div className="h-[240px] flex items-center justify-center">
                    <p className="text-sm font-semibold text-slate-400">No enrollment data available</p>
                </div>
            ) : (
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis
                                dataKey="year"
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
                            />
                            <Tooltip
                                formatter={(value) => [value, 'Students']}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="students"
                                stroke="#A63446"
                                strokeWidth={3}
                                dot={{ fill: '#A63446', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-brand rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">students enrolled</span>
                </div>
            </div>
        </motion.div>
    );
};
