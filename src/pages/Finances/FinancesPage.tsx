import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Wallet, Landmark, Receipt, PieChart, Plus, Tag } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessControl } from '../../components/AccessControl';

// Sub-components
import { FinancialSummary } from '../../components/finances/FinancialSummary';
import { FeeStructureManagement } from '../../components/finances/FeeStructureManagement';
import { PaymentManagement } from '../../components/finances/PaymentManagement';
import { ExpenseManagement } from '../../components/finances/ExpenseManagement';
import { DiscountManagement } from '../../components/finances/DiscountManagement';

// Create Modals
import { CreateFeeStructureModal } from '../../components/finances/CreateFeeStructureModal';
import { RecordPaymentModal } from '../../components/finances/RecordPaymentModal';
import { RecordExpenseModal } from '../../components/finances/RecordExpenseModal';

const tabs = [
    { id: 'summary', label: 'Summary', icon: PieChart, resource: 'finances' },
    { id: 'fees', label: 'Fee Structures', icon: Landmark, resource: 'finances' },
    { id: 'payments', label: 'Payments', icon: Receipt, resource: 'payments' },
    { id: 'expenses', label: 'Expenses', icon: Wallet, resource: 'expenses' },
    { id: 'discounts', label: 'Discounts', icon: Tag, resource: 'finances' },
];

export const FinancesPage: React.FC = () => {
    const [activeTab, setActiveTabState] = useState(() => {
        return localStorage.getItem('finances_active_tab') || 'summary';
    });

    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        localStorage.setItem('finances_active_tab', tab);
    };

    const handleCreateAction = () => {
        if (activeTab === 'fees') setIsFeeModalOpen(true);
        else if (activeTab === 'payments') setIsPaymentModalOpen(true);
        else if (activeTab === 'expenses') setIsExpenseModalOpen(true);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finances Management</h1>
                            <p className="text-slate-500 font-medium">Manage school fees, structures, payments, and expenses</p>
                        </div>

                        {activeTab !== 'summary' && (
                            <AccessControl id={`${activeTab === 'fees' ? 'finances' : activeTab}_create`}>
                                <button
                                    onClick={handleCreateAction}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>
                                        {activeTab === 'fees' ? 'New Fee Structure' : 
                                         activeTab === 'payments' ? 'Record Payment' : 
                                         'Record Expense'}
                                    </span>
                                </button>
                            </AccessControl>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex p-1.5 bg-white rounded-2xl border border-slate-100 w-fit shadow-sm overflow-x-auto no-scrollbar max-w-full">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap",
                                        isActive
                                            ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'summary' && <FinancialSummary />}
                                {activeTab === 'fees' && <FeeStructureManagement />}
                                {activeTab === 'payments' && <PaymentManagement />}
                                {activeTab === 'expenses' && <ExpenseManagement />}
                                {activeTab === 'discounts' && <DiscountManagement />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Create Modals */}
            <CreateFeeStructureModal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} />
            <RecordPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
            <RecordExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
        </div>
    );
};

export default FinancesPage;
