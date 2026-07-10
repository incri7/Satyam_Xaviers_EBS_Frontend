import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login';
import ForgotPasswordPage from '../pages/ForgotPassword';
import ResetPasswordPage from '../pages/ResetPassword';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleRoute } from '../components/RoleRoute';
import { useAuthStore } from '../store/useAuthStore';
import { homeForRole } from '../utils/roleHome';
import Dashboard from '../pages/Dashboard';
import PermissionsDashboard from '../pages/Permissions/PermissionsDashboard';
import AcademicsPage from '../pages/Academics/AcademicsPage';
import PeoplePage from '../pages/People/PeoplePage';
import ProfilePage from '../pages/Profile/ProfilePage';
import FinancesPage from '../pages/Finances/FinancesPage';
import CommunicationPage from '../pages/CommunicationPage';
import AttendancePage from '../pages/Attendance/AttendancePage';
import MarksPage from '../pages/Marks/MarksPage';
import AssignmentsPage from '../pages/Assignments/AssignmentsPage';
import TeacherHome from '../pages/Home/TeacherHome';
import ParentHome from '../pages/Home/ParentHome';
import AccountantHome from '../pages/Home/AccountantHome';
import CoordinatorHome from '../pages/Home/CoordinatorHome';
import TeacherLeavePage from '../pages/Leaves/TeacherLeavePage';
import StudentHome from '../pages/Home/StudentHome';
import PrincipalHome from '../pages/Home/PrincipalHome';
import ChildAttendancePage from '../pages/Parent/ChildAttendancePage';
import ChildMarksPage from '../pages/Parent/ChildMarksPage';
import ChildFeesPage from '../pages/Parent/ChildFeesPage';
import ChildLeavePage from '../pages/Parent/ChildLeavePage';
import RegisterPage from '../pages/Registration/RegisterPage';
import AcademicCalendarPage from '../pages/AcademicCalendar/AcademicCalendarPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import PromotionPage from '../pages/Promotion/PromotionPage';

/** Role-aware landing: send each user to their own home screen. */
const HomeRedirect = () => {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    if (!_hasHydrated) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to={homeForRole(user?.role)} replace />;
};

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
    },
    {
        path: '/reset-password',
        element: <ResetPasswordPage />,
    },
    {
        path: '/register/:token',
        element: <RegisterPage />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            // ── All authenticated users ────────────────────────────────
            {
                path: '/profile',
                element: <ProfilePage />,
            },
            {
                path: '/communication',
                element: <CommunicationPage />,
            },

            // ── Admin + principal (admin always allowed by RoleRoute) ──
            {
                element: <RoleRoute roles={['principal']} />,
                children: [
                    { path: '/dashboard', element: <Dashboard /> },
                    { path: '/settings', element: <Dashboard /> },
                    { path: '/settings/permissions', element: <PermissionsDashboard /> },
                    { path: '/academic-calendar', element: <AcademicCalendarPage /> },
                    { path: '/promotion', element: <PromotionPage /> },
                ],
            },

            // ── Management ─────────────────────────────────────────────
            {
                element: <RoleRoute roles={['principal', 'coordinator']} />,
                children: [
                    { path: '/people', element: <PeoplePage /> },
                    { path: '/staff', element: <Navigate to="/people" replace /> },
                    { path: '/academics', element: <AcademicsPage /> },
                ],
            },
            {
                element: <RoleRoute roles={['principal', 'coordinator', 'accountant']} />,
                children: [
                    { path: '/reports', element: <ReportsPage /> },
                ],
            },

            // ── Finance ────────────────────────────────────────────────
            {
                element: <RoleRoute roles={['principal', 'accountant']} />,
                children: [
                    { path: '/finances', element: <FinancesPage /> },
                    { path: '/financials', element: <Navigate to="/finances" replace /> },
                ],
            },

            // ── Teaching ───────────────────────────────────────────────
            {
                element: <RoleRoute roles={['teacher', 'principal', 'coordinator']} />,
                children: [
                    { path: '/attendance', element: <AttendancePage /> },
                    { path: '/marks', element: <MarksPage /> },
                    { path: '/assignments', element: <AssignmentsPage /> },
                ],
            },

            // ── Leave (staff-side) ─────────────────────────────────────
            {
                element: <RoleRoute roles={['teacher', 'staff', 'coordinator', 'principal']} />,
                children: [
                    { path: '/leave', element: <TeacherLeavePage /> },
                ],
            },

            // ── Parent ─────────────────────────────────────────────────
            {
                element: <RoleRoute roles={['parent']} />,
                children: [
                    { path: '/parent/child/:studentId/attendance', element: <ChildAttendancePage /> },
                    { path: '/parent/child/:studentId/marks', element: <ChildMarksPage /> },
                    { path: '/parent/child/:studentId/fees', element: <ChildFeesPage /> },
                    { path: '/parent/child/:studentId/leave', element: <ChildLeavePage /> },
                ],
            },

            // ── Role homes (strict) ────────────────────────────────────
            {
                element: <RoleRoute roles={['teacher']} />,
                children: [{ path: '/home/teacher', element: <TeacherHome /> }],
            },
            {
                element: <RoleRoute roles={['parent']} />,
                children: [{ path: '/home/parent', element: <ParentHome /> }],
            },
            {
                element: <RoleRoute roles={['accountant']} />,
                children: [{ path: '/home/accountant', element: <AccountantHome /> }],
            },
            {
                element: <RoleRoute roles={['coordinator']} />,
                children: [{ path: '/home/coordinator', element: <CoordinatorHome /> }],
            },
            {
                element: <RoleRoute roles={['student']} />,
                children: [{ path: '/home/student', element: <StudentHome /> }],
            },
            {
                element: <RoleRoute roles={['principal']} />,
                children: [{ path: '/home/principal', element: <PrincipalHome /> }],
            },
        ]
    },
    {
        path: '/',
        element: <HomeRedirect />,
    },
    {
        path: '*',
        element: <Navigate to="/login" replace />,
    }
]);
