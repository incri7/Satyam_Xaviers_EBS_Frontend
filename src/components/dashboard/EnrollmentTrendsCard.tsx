import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { year: '2020', students: 1000 },
    { year: '2021', students: 1050 },
    { year: '2022', students: 1120 },
    { year: '2023', students: 1180 },
    { year: '2024', students: 1234 },
];

export const EnrollmentTrendsCard: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-6">Student Enrollment Trends</h3>
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
            <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-brand rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">students</span>
                </div>
            </div>
        </motion.div>
    );
};
