import { UserPlus, CalendarClock, BellRing, FileBarChart2, GraduationCap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import type { PermissionAction } from '../../types/auth';

interface QuickActionProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick?: () => void;
}

const QuickAction: React.FC<QuickActionProps & { isHighlighted?: boolean, index: number }> = ({ title, description, icon: Icon, onClick, isHighlighted, index }) => {
    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, backgroundColor: isHighlighted ? "#FFF5F6" : "#F8FAFC" }}
            whileTap={{ scale: 0.98 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={cn(
                "flex flex-col items-center justify-center p-6 bg-white border rounded-xl shadow-sm text-center group min-h-[160px]",
                isHighlighted ? "border-brand bg-[#FFF5F6]" : "border-slate-100"
            )}
        >
            <div className={cn("p-2 mb-3 text-brand transition-transform group-hover:rotate-6 duration-300")}>
                <Icon className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 leading-tight">{title}</h3>
            <p className="text-[10px] font-semibold text-slate-400">{description}</p>
        </motion.button>
    );
};

export const QuickActions: React.FC<{ onRegisterParent?: () => void, onAddStudent?: () => void }> = ({ onRegisterParent, onAddStudent }) => {
    const actions: Array<{
        title: string;
        description: string;
        icon: React.ElementType;
        onClick?: () => void;
        isHighlighted?: boolean;
        permissions: Array<{ resource: string; action: PermissionAction }>;
    }> = [
            {
                title: 'Register Parent',
                description: 'Add new parent & students',
                icon: UserPlus,
                onClick: onRegisterParent,
                isHighlighted: true,
                permissions: [{ resource: 'parents', action: 'create' }],
            },
            {
                title: 'Add Student',
                description: 'Assign to existing parent',
                icon: GraduationCap,
                onClick: onAddStudent,
                isHighlighted: false,
                permissions: [{ resource: 'students', action: 'create' }],
            },
            {
                title: 'Leave Requests',
                description: '3 pending',
                icon: CalendarClock,
                permissions: [{ resource: 'staff', action: 'read' }],
            },
            {
                title: 'Review Notices',
                description: '2 drafts',
                icon: BellRing,
                permissions: [{ resource: 'staff', action: 'create' }],
            },
            {
                title: 'Generate Reports',
                description: 'Monthly',
                icon: FileBarChart2,
                permissions: [{ resource: 'finances', action: 'read' }],
            },
        ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {actions.map((action, index) => {
                const id = `action_${action.title.toLowerCase().replace(/\s+/g, '_')}`;
                return (
                    <AccessControl key={action.title} id={id as any}>
                        <QuickAction {...action} index={index} />
                    </AccessControl>
                );
            })}
        </div>
    );
};
