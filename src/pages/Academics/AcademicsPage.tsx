import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers, Users, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AccessControl } from '../../components/AccessControl';

import { ClassManagement } from '../../components/academics/ClassManagement';
import { SectionManagement } from '../../components/academics/SectionManagement';
import { EnrollmentManagement } from '../../components/academics/EnrollmentManagement';
import { CreateClassModal } from '../../components/academics/CreateClassModal';
import { CreateSectionModal } from '../../components/academics/CreateSectionModal';
import { CreateEnrollmentModal } from '../../components/academics/CreateEnrollmentModal';

type ActiveTab = 'classes' | 'sections' | 'enrollments';

const AcademicsPage: React.FC = () => {
    const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
        return (localStorage.getItem('academics_active_tab') as ActiveTab) || 'classes';
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const setActiveTab = (tab: ActiveTab) => {
        setActiveTabState(tab);
        localStorage.setItem('academics_active_tab', tab);
    };

    const tabs = [
        { id: 'classes', label: 'Classes', icon: BookOpen, permission: 'classes' },
        { id: 'sections', label: 'Sections', icon: Layers, permission: 'sections' },
        { id: 'enrollments', label: 'Enrollments', icon: Users, permission: 'enrollments' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Academics Management</h1>
                            <p className="text-slate-500 font-medium">Manage your school's classes, sections, and student enrollments</p>
                        </div>

                        <AccessControl id={`${activeTab}_create`}>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add {activeTab.slice(0, -1)}</span>
                            </button>
                        </AccessControl>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex p-1.5 bg-white rounded-2xl border border-slate-100 w-fit shadow-sm">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ActiveTab)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200",
                                    activeTab === tab.id
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-200 scale-100"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'classes' && <ClassManagement />}
                                {activeTab === 'sections' && <SectionManagement />}
                                {activeTab === 'enrollments' && <EnrollmentManagement />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Create Modals */}
                <CreateClassModal
                    isOpen={activeTab === 'classes' && isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />
                <CreateSectionModal
                    isOpen={activeTab === 'sections' && isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />
                <CreateEnrollmentModal
                    isOpen={activeTab === 'enrollments' && isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />
            </main>
        </div>
    );
};

export default AcademicsPage;
