import { UserPlus, Users, Briefcase, ShieldCheck, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AccessControl } from '../AccessControl';
import type { ComponentId } from '../../config/permissionRegistry';
import { useTranslation } from 'react-i18next';

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

export const QuickActions: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Admin provisioning actions. Each carries a STABLE `id` for permission gating
    // (never derived from the translated title) and a real navigation target.
    const actions: Array<{
        id: ComponentId;
        title: string;
        description: string;
        icon: React.ElementType;
        to: string;
    }> = [
            {
                id: 'action_add_student',
                title: t('dashboard.addStudent'),
                description: t('dashboard.addStudentDesc'),
                icon: UserPlus,
                to: '/people?tab=students',
            },
            {
                id: 'action_register_parent',
                title: t('dashboard.registerParent'),
                description: t('dashboard.registerParentDesc'),
                icon: Users,
                to: '/people?tab=parents',
            },
            {
                id: 'action_register_user',
                title: t('dashboard.registerUser'),
                description: t('dashboard.registerUserDesc'),
                icon: Briefcase,
                to: '/people?tab=users',
            },
            {
                id: 'action_setup_academics',
                title: t('dashboard.setupAcademics'),
                description: t('dashboard.setupAcademicsDesc'),
                icon: BookOpen,
                to: '/academics',
            },
            {
                id: 'action_manage_permissions',
                title: t('dashboard.managePermissions'),
                description: t('dashboard.managePermissionsDesc'),
                icon: ShieldCheck,
                to: '/settings/permissions',
            },
        ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {actions.map((action, index) => (
                <AccessControl key={action.id} id={action.id}>
                    <QuickAction
                        title={action.title}
                        description={action.description}
                        icon={action.icon}
                        onClick={() => navigate(action.to)}
                        index={index}
                    />
                </AccessControl>
            ))}
        </div>
    );
};
