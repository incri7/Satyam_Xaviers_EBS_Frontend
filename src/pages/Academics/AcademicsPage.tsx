import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, Layers, Plus, UserCheck } from 'lucide-react';

import { Button, Tabs, type TabItem } from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { AcademicsExplorer } from '../../components/academics/AcademicsExplorer';
import { EnrollmentManagement } from '../../components/academics/EnrollmentManagement';
import { CreateClassModal } from '../../components/academics/CreateClassModal';
import { CreateEnrollmentModal } from '../../components/academics/CreateEnrollmentModal';
import { academicsService } from '../../api/services/academics.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { currentAcademicYear } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';

type Tab = 'classes' | 'enrolments';
const TAB_KEY = 'academics_active_tab';

/** Figma F08–F11: Classes and subjects. */
const AcademicsPage = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.user?.role);
    const [tab, setTabState] = useState<Tab>(() => {
        try { return localStorage.getItem(TAB_KEY) === 'enrollments' ? 'enrolments' : 'classes'; } catch { return 'classes'; }
    });
    const [creating, setCreating] = useState(false);

    const setTab = (next: Tab) => {
        setTabState(next);
        try { localStorage.setItem(TAB_KEY, next === 'enrolments' ? 'enrollments' : 'classes'); } catch { /* not remembered */ }
    };

    // Totals for the tab badges.
    const classCount = useQuery({ queryKey: ['classes', 'count'], queryFn: () => academicsService.getClasses({ limit: 1 }), staleTime: 60 * 1000 });
    const enrolCount = useQuery({
        queryKey: ['enrollments', 'count', currentAcademicYear()],
        queryFn: () => academicsService.getEnrollments({ academic_year: currentAcademicYear(), limit: 1 }),
        staleTime: 60 * 1000,
    });
    const count = (n?: number) => (n === undefined ? undefined : formatCount(n, lang));

    const items: TabItem<Tab>[] = [
        { value: 'classes', label: t('classesPage.tabs.classes'), icon: Layers, count: count(classCount.data?.total_count) },
        { value: 'enrolments', label: t('classesPage.tabs.enrolments'), icon: UserCheck, count: count(enrolCount.data?.total_count) },
    ];

    const actions =
        tab === 'classes' ? (
            <AccessControl id="classes_create">
                <Button leftIcon={Plus} onClick={() => setCreating(true)}>{t('classesPage.action.addClass')}</Button>
            </AccessControl>
        ) : (
            <>
                {(role === 'admin' || role === 'principal') && (
                    <Button variant="quiet" leftIcon={Award} onClick={() => navigate('/promotion')}>{t('classesPage.action.promotion')}</Button>
                )}
                <AccessControl id="enrollments_create">
                    <Button leftIcon={UserCheck} onClick={() => setCreating(true)}>{t('classesPage.action.enrol')}</Button>
                </AccessControl>
            </>
        );

    return (
        <AppPage title={t('classesPage.title')}>
            <PageBar actions={actions}>
                <Tabs items={items} value={tab} onChange={setTab} aria-label={t('classesPage.tabsLabel')} />
            </PageBar>

            <div role="tabpanel" aria-label={t(`classesPage.tabs.${tab}`)} className="min-w-0">
                {tab === 'classes' ? <AcademicsExplorer /> : <EnrollmentManagement />}
            </div>

            <CreateClassModal isOpen={tab === 'classes' && creating} onClose={() => setCreating(false)} />
            {tab === 'enrolments' && creating && <CreateEnrollmentModal isOpen onClose={() => setCreating(false)} />}
        </AppPage>
    );
};

export default AcademicsPage;
