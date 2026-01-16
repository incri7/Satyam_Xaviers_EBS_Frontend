import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

const data = [
    { name: 'Collected', value: 1912100, color: '#10B981' },
    { name: 'Outstanding', value: 537900, color: '#EF4444' },
];

export const FeeCollectionCard: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
            <h3 className="text-base font-bold text-slate-800 mb-6">Fee Collection Status</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4 w-full">
                    {data.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">{item.name}:</span>
                            </div>
                            <span className={cn(
                                "text-xs font-bold",
                                item.name === 'Collected' ? "text-green-500" : "text-red-500"
                            )}>
                                ₹{item.value.toLocaleString('en-IN')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// Helper function needed for imports in next steps
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
