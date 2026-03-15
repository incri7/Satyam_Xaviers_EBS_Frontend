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
                element: <Dashboard />,
            },
            {
                path: '/reports',
                element: <Dashboard />,
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
