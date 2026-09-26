import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, FileSpreadsheet, History, Landmark, PieChart, Plus, Receipt, TrendingDown, Wallet } from 'lucide-react';

import { Button, Tabs, type TabItem } from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { FinancialSummary } from '../../components/finances/FinancialSummary';
import { FeeStructureManagement } from '../../components/finances/FeeStructureManagement';
import { PaymentManagement } from '../../components/finances/PaymentManagement';
import { ExpenseManagement } from '../../components/finances/ExpenseManagement';
import { DiscountManagement } from '../../components/finances/DiscountManagement';
import { AuditTrail } from '../../components/finances/AuditTrail';
import { CreateFeeStructureModal } from '../../components/finances/CreateFeeStructureModal';
import { RecordPaymentModal } from '../../components/finances/RecordPaymentModal';
import { RecordExpenseModal } from '../../components/finances/RecordExpenseModal';

const FINANCE_TABS = ['summary', 'fees', 'payments', 'expenses', 'discounts', 'activity'] as const;
type FinanceTab = (typeof FINANCE_TABS)[number];
const TAB_KEY = 'finances_active_tab';

/** Figma E02–E06: Fees and payments. */
export function FinancesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [tab, setTabState] = useState<FinanceTab>(() => {
        try {
            const saved = localStorage.getItem(TAB_KEY);
            return FINANCE_TABS.includes(saved as FinanceTab) ? (saved as FinanceTab) : 'summary';
        } catch {
            return 'summary';
        }
    });
    const [paying, setPaying] = useState(false);
    const [spending, setSpending] = useState(false);
    const [newFee, setNewFee] = useState<{ classId?: number } | null>(null);
    const [applying, setApplying] = useState(false);

    const setTab = (next: FinanceTab) => {
        setTabState(next);
        try { localStorage.setItem(TAB_KEY, next); } catch { /* not remembered */ }
    };

    const items: TabItem<FinanceTab>[] = [
        { value: 'summary', label: t('financePage.tabs.summary'), icon: PieChart },
        { value: 'fees', label: t('financePage.tabs.fees'), icon: Landmark },
        { value: 'payments', label: t('financePage.tabs.payments'), icon: Receipt },
        { value: 'expenses', label: t('financePage.tabs.expenses'), icon: Wallet },
        { value: 'discounts', label: t('financePage.tabs.discounts'), icon: Award },
        { value: 'activity', label: t('financePage.tabs.activity'), icon: History },
    ];

    const recordPayment = (
        <AccessControl id="payments_create">
            <Button leftIcon={Receipt} onClick={() => setPaying(true)}>{t('financePage.action.recordPayment')}</Button>
        </AccessControl>
    );
    const actions = {
        summary: (
            <>
                <Button variant="quiet" leftIcon={FileSpreadsheet} onClick={() => navigate('/finances/ledger')}>{t('financePage.action.ledger')}</Button>
                {recordPayment}
            </>
        ),
        fees: (
            <AccessControl id="finances_create">
                <Button leftIcon={Plus} onClick={() => setNewFee({})}>{t('financePage.action.newFee')}</Button>
            </AccessControl>
        ),
        payments: (
            <>
                <Button variant="quiet" leftIcon={TrendingDown} onClick={() => navigate('/finances/outstanding')}>{t('financePage.action.outstanding')}</Button>
                {recordPayment}
            </>
        ),
        expenses: (
            <AccessControl id="expenses_create">
                <Button leftIcon={Wallet} onClick={() => setSpending(true)}>{t('financePage.action.recordExpense')}</Button>
            </AccessControl>
        ),
        discounts: (
            <AccessControl id="finances_create">
                <Button leftIcon={Award} onClick={() => setApplying(true)}>{t('financePage.action.applyScholarship')}</Button>
            </AccessControl>
        ),
        activity: undefined,
    }[tab];

    return (
        <AppPage title={t('financePage.title')}>
            <PageBar actions={actions}>
                <Tabs items={items} value={tab} onChange={setTab} aria-label={t('financePage.tabsLabel')} />
            </PageBar>

            <div role="tabpanel" aria-label={t(`financePage.tabs.${tab}`)} className="min-w-0">
                {tab === 'summary' && <FinancialSummary />}
                {tab === 'fees' && <FeeStructureManagement onAdd={(classId) => setNewFee({ classId })} />}
                {tab === 'payments' && <PaymentManagement />}
                {tab === 'expenses' && <ExpenseManagement />}
                {tab === 'discounts' && <DiscountManagement applying={applying} setApplying={setApplying} />}
                {tab === 'activity' && <AuditTrail />}
            </div>

            <RecordPaymentModal isOpen={paying} onClose={() => setPaying(false)} />
            <RecordExpenseModal isOpen={spending} onClose={() => setSpending(false)} />
            {newFee && <CreateFeeStructureModal key={newFee.classId ?? 'all'} isOpen classId={newFee.classId} onClose={() => setNewFee(null)} />}
        </AppPage>
    );
}

export default FinancesPage;
