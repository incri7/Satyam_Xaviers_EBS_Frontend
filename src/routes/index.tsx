import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login';
import ForgotPasswordPage from '../pages/ForgotPassword';
import ResetPasswordPage from '../pages/ResetPassword';
import { ProtectedRoute } from '../components/ProtectedRoute';
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
            {
                path: '/dashboard',
                element: <Dashboard />,
            },
            {
                path: '/academics',
                element: <AcademicsPage />,
            },
            {
                path: '/people',
                element: <PeoplePage />,
            },
            {
                path: '/profile',
                element: <ProfilePage />,
            },
            {
                path: '/staff',
                element: <Navigate to="/people" replace />,
            },
            {
                path: '/finances',
                element: <FinancesPage />,
            },
            {
                path: '/financials',
                element: <Navigate to="/finances" replace />,
            },
            {
                path: '/communication',
                element: <CommunicationPage />,
            },
            {
                path: '/home/teacher',
                element: <TeacherHome />,
            },
            {
                path: '/home/parent',
                element: <ParentHome />,
            },
            {
                path: '/home/accountant',
                element: <AccountantHome />,
            },
            {
                path: '/home/coordinator',
                element: <CoordinatorHome />,
            },
            {
                path: '/home/student',
                element: <StudentHome />,
            },
            {
                path: '/home/principal',
                element: <PrincipalHome />,
            },
            {
                path: '/leave',
                element: <TeacherLeavePage />,
            },
            {
                path: '/parent/child/:studentId/attendance',
                element: <ChildAttendancePage />,
            },
            {
                path: '/parent/child/:studentId/marks',
                element: <ChildMarksPage />,
            },
            {
                path: '/parent/child/:studentId/fees',
                element: <ChildFeesPage />,
            },
            {
                path: '/parent/child/:studentId/leave',
                element: <ChildLeavePage />,
            },
            {
                path: '/attendance',
                element: <AttendancePage />,
            },
            {
                path: '/marks',
                element: <MarksPage />,
            },
            {
                path: '/assignments',
                element: <AssignmentsPage />,
            },
            {
                path: '/reports',
                element: <ReportsPage />,
            },
            {
                path: '/academic-calendar',
                element: <AcademicCalendarPage />,
            },
            {
                path: '/promotion',
                element: <PromotionPage />,
            },
            {
                path: '/settings',
                element: <Dashboard />,
            },
            {
                path: '/settings/permissions',
                element: <PermissionsDashboard />,
            }
        ]
    },
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '*',
        element: <Navigate to="/login" replace />,
    }
]);
