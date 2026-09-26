import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Briefcase, GraduationCap, Home, Link2, Plus, UserCircle } from 'lucide-react';

import { Button, Tabs, type TabItem } from '../../design-system';
import { AppPage, PageBar } from '../../components/layout/AppPage';
import { AccessControl } from '../../components/AccessControl';
import { StudentManagement } from '../../components/people/StudentManagement';
import { TeacherManagement } from '../../components/people/TeacherManagement';
import { StaffManagement } from '../../components/people/StaffManagement';
import { ParentManagement } from '../../components/people/ParentManagement';
import { UserManagement } from '../../components/people/UserManagement';
import { AddStaffModal } from '../../components/people/AddStaffModal';
import { RegistrationModal } from '../../components/registration/RegistrationModal';
import { AddStudentToParentModal } from '../../components/registration/AddStudentToParentModal';
import { WorkforceRegistrationModal } from '../../components/people/WorkforceRegistrationModal';
import { peopleService } from '../../api/services/people.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';

type PeopleTab = 'students' | 'teachers' | 'staff' | 'parents' | 'users';
const TABS: PeopleTab[] = ['students', 'teachers', 'staff', 'parents', 'users'];
const STORAGE_KEY = 'people_active_tab';

function readTab(): PeopleTab {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as PeopleTab | null;
        return saved && TABS.includes(saved) ? saved : 'students';
    } catch {
        return 'students';
    }
}

/**
 * Totals for the tab badges (Figma "People tabs"): one row each, so the
 * count is the whole register, not the filtered page below.
 */
function useTabCounts() {
    const one = { page: 1, limit: 1 };
    const results = useQueries({
        queries: [
            { queryKey: ['people-count', 'students'], queryFn: () => peopleService.getStudents(one) },
            { queryKey: ['people-count', 'teachers'], queryFn: () => peopleService.getTeachers(one) },
            { queryKey: ['people-count', 'staff'], queryFn: () => peopleService.getStaffList(one) },
            { queryKey: ['people-count', 'parents'], queryFn: () => peopleService.getParents(one) },
            { queryKey: ['people-count', 'users'], queryFn: () => peopleService.getUsers(one) },
        ].map((q) => ({ ...q, staleTime: 60 * 1000 })),
    });
    return Object.fromEntries(TABS.map((tab, i) => [tab, (results[i].data as { total_count?: number } | undefined)?.total_count])) as Record<PeopleTab, number | undefined>;
}

/** Figma F01–F05: Students and staff. */
const PeoplePage = () => {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const [tab, setTabState] = useState<PeopleTab>(readTab);
    const [registering, setRegistering] = useState(false);
    const [addingChild, setAddingChild] = useState(false);
    const [addingWorkforce, setAddingWorkforce] = useState(false);
    const [addingStaff, setAddingStaff] = useState(false);
    const counts = useTabCounts();

    const setTab = (next: PeopleTab) => {
        setTabState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* the tab just won't be remembered */ }
    };

    const items: TabItem<PeopleTab>[] = [
        { value: 'students', label: t('peoplePage.tabs.students'), icon: GraduationCap },
        { value: 'teachers', label: t('peoplePage.tabs.teachers'), icon: BookOpen },
        { value: 'staff', label: t('peoplePage.tabs.staff'), icon: Briefcase },
        { value: 'parents', label: t('peoplePage.tabs.parents'), icon: Home },
        { value: 'users', label: t('peoplePage.tabs.users'), icon: UserCircle },
    ].map((item) => {
        const n = counts[item.value as PeopleTab];
        return { ...item, count: n === undefined ? undefined : formatCount(n, lang) } as TabItem<PeopleTab>;
    });

    const actions = {
        students: (
            <>
                <AccessControl id="add_student_modal">
                    <Button variant="quiet" leftIcon={Link2} onClick={() => setAddingChild(true)}>{t('peoplePage.actions.addToParent')}</Button>
                </AccessControl>
                <AccessControl id="registration_modal">
                    <Button leftIcon={Plus} onClick={() => setRegistering(true)}>{t('peoplePage.actions.registerStudent')}</Button>
                </AccessControl>
            </>
        ),
        teachers: (
            // Teachers sign in (attendance, marks), so adding one creates their account too.
            <AccessControl id="users_create">
                <Button leftIcon={Plus} onClick={() => setAddingWorkforce(true)}>{t('peoplePage.actions.addTeacher')}</Button>
            </AccessControl>
        ),
        staff: (
            <AccessControl id="staff_create">
                <Button leftIcon={Plus} onClick={() => setAddingStaff(true)}>{t('peoplePage.actions.addStaff')}</Button>
            </AccessControl>
        ),
        parents: (
            <>
                <AccessControl id="add_student_modal">
                    <Button variant="quiet" leftIcon={Link2} onClick={() => setAddingChild(true)}>{t('peoplePage.actions.addToParent')}</Button>
                </AccessControl>
                <AccessControl id="registration_modal">
                    <Button leftIcon={Plus} onClick={() => setRegistering(true)}>{t('peoplePage.actions.registerFamily')}</Button>
                </AccessControl>
            </>
        ),
        users: (
            <AccessControl id="users_create">
                <Button leftIcon={Plus} onClick={() => setAddingWorkforce(true)}>{t('peoplePage.actions.addAccount')}</Button>
            </AccessControl>
        ),
    }[tab];

    return (
        <AppPage title={t('peoplePage.title')}>
            <PageBar actions={actions}>
                <Tabs items={items} value={tab} onChange={setTab} aria-label={t('peoplePage.tabsLabel')} />
            </PageBar>

            <div role="tabpanel" aria-label={t(`peoplePage.tabs.${tab}`)} className="min-w-0">
                {tab === 'students' && <StudentManagement />}
                {tab === 'teachers' && <TeacherManagement />}
                {tab === 'staff' && <StaffManagement />}
                {tab === 'parents' && <ParentManagement />}
                {tab === 'users' && <UserManagement />}
            </div>

            <AccessControl id="registration_modal">
                <RegistrationModal isOpen={registering} onClose={() => setRegistering(false)} />
            </AccessControl>
            <AccessControl id="add_student_modal">
                <AddStudentToParentModal isOpen={addingChild} onClose={() => setAddingChild(false)} />
            </AccessControl>
            <WorkforceRegistrationModal
                isOpen={addingWorkforce}
                onClose={() => setAddingWorkforce(false)}
                initialRole={tab === 'teachers' ? 'teacher' : undefined}
            />
            <AddStaffModal isOpen={addingStaff} onClose={() => setAddingStaff(false)} />
        </AppPage>
    );
};

export default PeoplePage;
