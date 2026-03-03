import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Microscope, Home, UserCircle, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AccessControl } from '../../components/AccessControl';
import { StudentManagement } from '../../components/people/StudentManagement';
import { TeacherManagement } from '../../components/people/TeacherManagement';
import { StaffManagement } from '../../components/people/StaffManagement';
import { ParentManagement } from '../../components/people/ParentManagement';
import { UserManagement } from '../../components/people/UserManagement';

type PeopleTab = 'students' | 'teachers' | 'staff' | 'parents' | 'users';

const PeoplePage: React.FC = () => {
    const [activeTab, setActiveTabState] = useState<PeopleTab>(() => {
        return (localStorage.getItem('people_active_tab') as PeopleTab) || 'students';
    });

    const setActiveTab = (tab: PeopleTab) => {
        setActiveTabState(tab);
        localStorage.setItem('people_active_tab', tab);
    };

    const tabs = [
        { id: 'students', label: 'Students', icon: GraduationCap, resource: 'students' },
        { id: 'teachers', label: 'Teachers', icon: Microscope, resource: 'teachers' },
        { id: 'staff', label: 'Staff', icon: Users, resource: 'staff' },
        { id: 'parents', label: 'Parents', icon: Home, resource: 'parents' },
        { id: 'users', label: 'User Accounts', icon: UserCircle, resource: 'users' },
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
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">People Management</h1>
                            <p className="text-slate-500 font-medium">Manage students, teachers, staff and system users</p>
                        </div>

                        <AccessControl id={`${activeTab}_create`}>
                            <button
                                className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add New {activeTab.slice(0, -1)}</span>
                            </button>
                        </AccessControl>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex p-1.5 bg-white rounded-2xl border border-slate-100 w-fit shadow-sm overflow-x-auto no-scrollbar max-w-full">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as PeopleTab)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap",
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
                                {activeTab === 'students' && <StudentManagement />}
                                {activeTab === 'teachers' && <TeacherManagement />}
                                {activeTab === 'staff' && <StaffManagement />}
                                {activeTab === 'parents' && <ParentManagement />}
                                {activeTab === 'users' && <UserManagement />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PeoplePage;
