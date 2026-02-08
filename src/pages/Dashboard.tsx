import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { StatGrid } from '../components/dashboard/StatGrid';
import { QuickActions } from '../components/dashboard/QuickActions';
import { FeatureBanner } from '../components/dashboard/FeatureBanner';
import { EnrollmentTrendsCard } from '../components/dashboard/EnrollmentTrendsCard';
import { AttendanceOverviewCard } from '../components/dashboard/AttendanceOverviewCard';
import { FeeCollectionCard } from '../components/dashboard/FeeCollectionCard';
import { RecentActivities } from '../components/dashboard/RecentActivities';
import { RegistrationModal } from '../components/registration/RegistrationModal';
import { AddStudentToParentModal } from '../components/registration/AddStudentToParentModal';
import { AccessControl } from '../components/AccessControl';
import { motion } from 'framer-motion';
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 15,
        },
    },
};

const Dashboard: React.FC = () => {
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#FDFCFB] overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex-1 overflow-y-auto p-8 space-y-6"
                >
                    {/* Top Ribbon Banner */}
                    <AccessControl id="dashboard_banner">
                        <motion.div variants={itemVariants}>
                            <FeatureBanner onAction={() => setIsRegistrationModalOpen(true)} />
                        </motion.div>
                    </AccessControl>

                    {/* Stat Cards Grid */}
                    <AccessControl id="dashboard_stats">
                        <motion.div variants={itemVariants}>
                            <StatGrid />
                        </motion.div>
                    </AccessControl>

                    {/* Quick Actions Grid */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-base font-bold text-slate-800">Quick Actions</h2>
                        <QuickActions
                            onRegisterParent={() => setIsRegistrationModalOpen(true)}
                            onAddStudent={() => setIsAddStudentModalOpen(true)}
                        />
                    </motion.div>

                    {/* Charts & Activities Grid */}
                    <AccessControl id="enrollment_trends">
                        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                            {/* Row 1 Charts */}
                            <EnrollmentTrendsCard />
                            <AttendanceOverviewCard />

                            {/* Row 2: Fee Status and Activities */}
                            <FeeCollectionCard />
                            <RecentActivities />
                        </motion.div>
                    </AccessControl>
                </motion.div>
            </main>

            {/* Registration Modal */}
            <AccessControl id="registration_modal">
                <RegistrationModal
                    isOpen={isRegistrationModalOpen}
                    onClose={() => setIsRegistrationModalOpen(false)}
                />
            </AccessControl>

            {/* Add Student to Existing Parent Modal */}
            <AccessControl id="add_student_modal">
                <AddStudentToParentModal
                    isOpen={isAddStudentModalOpen}
                    onClose={() => setIsAddStudentModalOpen(false)}
                />
            </AccessControl>
        </div>
    );
};

export default Dashboard;
