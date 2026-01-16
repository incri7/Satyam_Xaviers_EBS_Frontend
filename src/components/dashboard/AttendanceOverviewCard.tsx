import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { class: 'Class 1', attendance: 98 },
    { class: 'Class 2', attendance: 92 },
    { class: 'Class 3', attendance: 95 },
    { class: 'Class 4', attendance: 90 },
    { class: 'Class 5', attendance: 98 },
    { class: 'Class 6', attendance: 88 },
    { class: 'Class 7', attendance: 95 },
    { class: 'Class 8', attendance: 92 },
    { class: 'Class 9', attendance: 98 },
    { class: 'Class 10', attendance: 85 },
];

export const AttendanceOverviewCard: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-6">Attendance Overview by Class</h3>
            <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                            dataKey="class"
                            axisLine={false}
                            tickLine={false}
                            tick={(props) => {
                                const { x, y, payload } = props;
                                // Only show specific class labels to match image
                                const labels = ['Class 2', 'Class 4', 'Class 6', 'Class 8', 'Class 10'];
                                if (!labels.includes(payload.value)) return null;
                                return (
                                    <text x={x} y={y + 10} fill="#94A3B8" fontSize={10} fontWeight={600} textAnchor="middle">
                                        {payload.value}
                                    </text>
                                );
                            }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                            dx={-10}
                            domain={[0, 100]}
                        />
                        <Tooltip
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
            <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10B981] rounded-sm"></div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">attendance</span>
                </div>
            </div>
        </motion.div>
    );
};
