import { useTranslation } from 'react-i18next';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';

import { Banner, Button } from '../design-system';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { AccessControl } from '../components/AccessControl';
import { KpiGrid } from '../features/dashboard/KpiGrid';
import { QuickActions } from '../features/dashboard/QuickActions';
import { EnrolmentTrendCard } from '../features/dashboard/EnrolmentTrendCard';
import { AttendanceByClassCard } from '../features/dashboard/AttendanceByClassCard';
import { FeeCollectionCard } from '../features/dashboard/FeeCollectionCard';
import { RecentNoticesCard } from '../features/dashboard/RecentNoticesCard';
import { useStudentCount } from '../features/dashboard/queries';

/**
 * Admin dashboard. Figma B01 "School overview".
 *
 * Every card loads, fails and retries on its own; the banner on top only
 * summarises (a fresh school with no students yet, or something failed).
 */
const Dashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="flex h-dvh overflow-hidden bg-canvas">
            <Sidebar />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden lg:pl-[260px]">
                <DashboardHeader title={t('adminDashboard.title')} />
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-3.5 px-4 pt-1 pb-8 lg:gap-[18px] lg:px-7 lg:pt-6">
                        <PageBanner />

                        <AccessControl id="dashboard_stats">
                            <KpiGrid />
                        </AccessControl>

                        <QuickActions />

                        <AccessControl id="enrollment_trends">
                            <div className="grid gap-3.5 lg:grid-cols-2">
                                <EnrolmentTrendCard />
                                <AttendanceByClassCard />
                            </div>
                            <div className="grid items-start gap-3.5 lg:grid-cols-2">
                                <FeeCollectionCard />
                                <RecentNoticesCard />
                            </div>
                        </AccessControl>
                    </div>
                </div>
            </main>
        </div>
    );
};

/**
 * Figma B01 Empty ("Welcome") and Error ("could not load") banners.
 * Failed queries are read from the cache, so the banner never disagrees
 * with the cards under it.
 */
function PageBanner() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const students = useStudentCount();
    // Re-render when any fetch settles, so the failed list below is current.
    useIsFetching();
    const failed = queryClient.getQueryCache().findAll({ predicate: (q) => q.state.status === 'error' && q.getObserversCount() > 0 });

    if (failed.length > 0) {
        return (
            <Banner
                tone="bad"
                title={t('adminDashboard.banner.errorTitle')}
                action={
                    <Button
                        variant="quiet"
                        size="sm"
                        leftIcon={RotateCw}
                        onClick={() => failed.forEach((q) => void queryClient.refetchQueries({ queryKey: q.queryKey, exact: true }))}
                    >
                        {t('adminDashboard.retry')}
                    </Button>
                }
            >
                {t('adminDashboard.banner.errorBody')}
            </Banner>
        );
    }
    if (students.data === 0) {
        return (
            <Banner tone="info" title={t('adminDashboard.banner.welcomeTitle')}>
                {t('adminDashboard.banner.welcomeBody')}
            </Banner>
        );
    }
    return null;
}

export default Dashboard;
