import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login';
import ForgotPasswordPage from '../pages/ForgotPassword';
import ResetPasswordPage from '../pages/ResetPassword';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleRoute } from '../components/RoleRoute';
import { HomeRedirect } from './HomeRedirect';
import Dashboard from '../pages/Dashboard';
import PermissionsDashboard from '../pages/Permissions/PermissionsDashboard';
import AcademicsPage from '../pages/Academics/AcademicsPage';
import PeoplePage from '../pages/People/PeoplePage';
import StudentDetailPage from '../pages/People/StudentDetailPage';
import TeacherDetailPage from '../pages/People/TeacherDetailPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import FinancesPage from '../pages/Finances/FinancesPage';
import OutstandingFeesPage from '../pages/Finances/OutstandingFeesPage';
import LedgerPage from '../pages/Finances/LedgerPage';
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
import ChildDashboardPage from '../pages/Parent/ChildDashboardPage';
import ChildAttendancePage from '../pages/Parent/ChildAttendancePage';
import ChildMarksPage from '../pages/Parent/ChildMarksPage';
import ChildFeesPage from '../pages/Parent/ChildFeesPage';
import ChildLeavePage from '../pages/Parent/ChildLeavePage';
import RegisterPage from '../pages/Registration/RegisterPage';
import AcademicCalendarPage from '../pages/AcademicCalendar/AcademicCalendarPage';
import PromotionPage from '../pages/Promotion/PromotionPage';
import TimetablePage from '../pages/Timetable/TimetablePage';
import LeaveApprovalsPage from '../pages/Leaves/LeaveApprovalsPage';
import ActivityLogPage from '../pages/Activity/ActivityLogPage';
import ManageActivityPage from '../pages/Activity/ManageActivityPage';

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
            // Everyone may open it; what they see is what admin has granted.
            {
                path: '/activity',
                element: <ActivityLogPage />,
            },

            // ── Admin-only (RoleRoute always allows admin) ──
            {
                element: <RoleRoute roles={[]} />,
                children: [
                    { path: '/dashboard', element: <Dashboard /> },
                    { path: '/settings', element: <Navigate to="/settings/permissions" replace /> },
                    { path: '/settings/permissions', element: <PermissionsDashboard /> },
                    { path: '/activity/manage', element: <ManageActivityPage /> },
                ],
            },

            // ── Admin + principal ──
            {
                element: <RoleRoute roles={['principal']} />,
                children: [
                    { path: '/academic-calendar', element: <AcademicCalendarPage /> },
                    { path: '/promotion', element: <PromotionPage /> },
                ],
            },

            // ── Management ─────────────────────────────────────────────
            {
                element: <RoleRoute roles={['principal', 'coordinator']} />,
                children: [
                    { path: '/people', element: <PeoplePage /> },
                    { path: '/people/students/:studentId', element: <StudentDetailPage /> },
                    { path: '/people/teachers/:teacherId', element: <TeacherDetailPage /> },
                    { path: '/staff', element: <Navigate to="/people" replace /> },
                    { path: '/academics', element: <AcademicsPage /> },
                    { path: '/timetable', element: <TimetablePage /> },
                ],
            },
            {
                element: <RoleRoute roles={['principal', 'coordinator', 'accountant']} />,
                children: [
                ],
            },

            // ── Finance ────────────────────────────────────────────────
            {
                element: <RoleRoute roles={['principal', 'accountant']} />,
                children: [
                    { path: '/finances', element: <FinancesPage /> },
                    { path: '/finances/outstanding', element: <OutstandingFeesPage /> },
                    { path: '/finances/ledger', element: <LedgerPage /> },
                    { path: '/financials', element: <Navigate to="/finances" replace /> },
                    // Reports is retired: attendance lives on the Attendance page
                    // and the fee figures moved onto Outstanding Fees. Without
                    // this a saved link falls to the catch-all and bounces the
                    // user to /login, which reads as being signed out.
                    { path: '/reports', element: <Navigate to="/finances/outstanding" replace /> },
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
                element: <RoleRoute roles={['teacher', 'staff', 'coordinator', 'principal', 'accountant']} />,
                children: [
                    { path: '/leave', element: <TeacherLeavePage /> },
                ],
            },
            // Deciding OTHER people's leave requests — admin/principal only.
            {
                element: <RoleRoute roles={['principal']} />,
                children: [
                    { path: '/leave-approvals', element: <LeaveApprovalsPage /> },
                ],
            },

            // ── Parent ─────────────────────────────────────────────────
            {
                element: <RoleRoute roles={['parent']} />,
                children: [
                    { path: '/parent/child/:studentId/dashboard', element: <ChildDashboardPage /> },
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
