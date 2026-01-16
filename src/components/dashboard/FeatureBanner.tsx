import { UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export const FeatureBanner: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#8B2332] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 group shadow-lg shadow-brand/10"
        >
            <div className="flex items-center gap-4">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80"
                >
                    <UserPlus className="w-6 h-6" />
                </motion.div>
                <div>
                    <h2 className="text-xl font-bold text-white leading-tight">New: Parent & Student Registration</h2>
                    <p className="text-sm text-white/70 font-medium">Quickly register new parents and students in one streamlined process</p>
                </div>
            </div>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAction}
                className="bg-white text-[#8B2332] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-white/90 transition-all flex-shrink-0 shadow-sm"
            >
                Get Started
            </motion.button>
        </motion.div>
    );
};
