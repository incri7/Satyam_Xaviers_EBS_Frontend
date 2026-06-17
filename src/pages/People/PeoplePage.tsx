import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { RegistrationModal } from '../../components/registration/RegistrationModal';
import { AddStudentToParentModal } from '../../components/registration/AddStudentToParentModal';
import { WorkforceRegistrationModal } from '../../components/people/WorkforceRegistrationModal';
import { useTranslation } from 'react-i18next';

type PeopleTab = 'students' | 'teachers' | 'staff' | 'parents' | 'users';

const PeoplePage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTabState] = useState<PeopleTab>(() => {
        const validTabs: PeopleTab[] = ['students', 'teachers', 'staff', 'parents', 'users'];
        const fromUrl = searchParams.get('tab') as PeopleTab | null;
        if (fromUrl && validTabs.includes(fromUrl)) return fromUrl;
        return (localStorage.getItem('people_active_tab') as PeopleTab) || 'students';
    });
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [isWorkforceModalOpen, setIsWorkforceModalOpen] = useState(false);

    const setActiveTab = (tab: PeopleTab) => {
        setActiveTabState(tab);
        localStorage.setItem('people_active_tab', tab);
    };

    const categories = [
        {
            id: 'system',
            labelKey: 'people.system',
            tabs: [
                { id: 'users', labelKey: 'people.userAccounts', icon: UserCircle, resource: 'users' },
            ]
        },
        {
            id: 'workforce',
            labelKey: 'people.schoolPersonnel',
            tabs: [
                { id: 'teachers', labelKey: 'people.teachers', icon: Microscope, resource: 'teachers' },
                { id: 'staff', labelKey: 'people.staff', icon: Users, resource: 'staff' },
            ]
        },
        {
            id: 'family',
            labelKey: 'people.schoolFamily',
            tabs: [
                { id: 'students', labelKey: 'people.students', icon: GraduationCap, resource: 'students' },
                { id: 'parents', labelKey: 'people.parents', icon: Home, resource: 'parents' },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('people.title')}</h1>
                            <p className="text-slate-500 font-medium">{t('people.subtitle')}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {(activeTab === 'students' || activeTab === 'parents') && (
                                <>
                                    <AccessControl id="add_student_modal">
                                        <button
                                            onClick={() => setIsAddStudentModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>{t('people.assignStudent')}</span>
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="registration_modal">
                                        <button
                                            onClick={() => setIsRegistrationModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                        >
                                            <Plus className="w-5 h-5 text-white" />
                                            <span>{t('people.registerGuardian')}</span>
                                        </button>
                                    </AccessControl>
                                </>
                            )}

                            {activeTab === 'users' && (
                                <AccessControl id="users_create">
                                    <button
                                        onClick={() => setIsWorkforceModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span>{t('people.registerUser')}</span>
                                    </button>
                                </AccessControl>
                            )}
                        </div>
                    </div>

                    {/* Grouped Tab Navigation */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-6 items-start">
                            {categories.map((category) => (
                                <div key={category.id} className="space-y-2.5">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] px-2">
                                        {t(category.labelKey)}
                                    </h3>
                                    <div className="flex p-1 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit">
                                        {category.tabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as PeopleTab)}
                                                className={cn(
                                                    "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap",
                                                    activeTab === tab.id
                                                        ? "bg-sky-500 text-white shadow-md shadow-sky-200 scale-100"
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                )}
                                            >
                                                <tab.icon className="w-3.5 h-3.5" />
                                                {t(tab.labelKey)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
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

            {/* Registration Modals */}
            <AccessControl id="registration_modal">
                <RegistrationModal
                    isOpen={isRegistrationModalOpen}
                    onClose={() => setIsRegistrationModalOpen(false)}
                />
            </AccessControl>

            <AccessControl id="add_student_modal">
                <AddStudentToParentModal
                    isOpen={isAddStudentModalOpen}
                    onClose={() => setIsAddStudentModalOpen(false)}
                />
            </AccessControl>

            <WorkforceRegistrationModal
                isOpen={isWorkforceModalOpen}
                onClose={() => setIsWorkforceModalOpen(false)}
            />
        </div>
    );
};

export default PeoplePage;
