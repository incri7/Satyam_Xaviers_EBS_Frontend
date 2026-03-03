import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login';
import ForgotPasswordPage from '../pages/ForgotPassword';
import ResetPasswordPage from '../pages/ResetPassword';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import PermissionsDashboard from '../pages/Permissions/PermissionsDashboard';
import AcademicsPage from '../pages/Academics/AcademicsPage';

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
                path: '/staff',
                element: <Dashboard />,
            },
            {
                path: '/financials',
                element: <Dashboard />,
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
