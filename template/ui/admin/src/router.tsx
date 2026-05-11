import { createBrowserRouter } from 'react-router-dom';

import PublicLayout from '@/layouts/public';
import UserLayout from '@/layouts/user';
import AdminLayout from '@/layouts/admin';
import AccountLayout from '@/layouts/account';

import LoginPage from '@/pages/public/login';
import SignupPage from '@/pages/public/signup';
import ForgotPasswordPage from '@/pages/public/forgot-password';
import ResetPasswordPage from '@/pages/public/reset-password';
import ErrorPage from '@/pages/public/error';

import SelectAccountPage from '@/pages/user/select-account';
import ProfilePage from '@/pages/user/profile';

import AdminDashboardPage from '@/pages/admin/dashboard';
import AdminAccountsPage from '@/pages/admin/accounts';
import AdminUsersPage from '@/pages/admin/users';

import AccountDashboardPage from '@/pages/account/dashboard';
import AccountMembersPage from '@/pages/account/members';
import AccountSettingsPage from '@/pages/account/settings';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <PublicLayout />,
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <LoginPage /> },
            { path: 'login', element: <LoginPage /> },
            { path: 'signup', element: <SignupPage /> },
            { path: 'forgot-password', element: <ForgotPasswordPage /> },
            { path: 'recover/:token', element: <ResetPasswordPage /> }
        ]
    },
    {
        path: '/user',
        element: <UserLayout />,
        children: [
            { index: true, element: <SelectAccountPage /> },
            { path: 'select-account', element: <SelectAccountPage /> },
            { path: 'profile', element: <ProfilePage /> }
        ]
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            { index: true, element: <AdminDashboardPage /> },
            { path: 'dashboard', element: <AdminDashboardPage /> },
            { path: 'users', element: <AdminUsersPage /> },
            { path: 'accounts', element: <AdminAccountsPage /> }
        ]
    },
    {
        path: '/account/:accountId',
        element: <AccountLayout />,
        children: [
            { index: true, element: <AccountDashboardPage /> },
            { path: 'dashboard', element: <AccountDashboardPage /> },
            { path: 'members', element: <AccountMembersPage /> },
            { path: 'settings', element: <AccountSettingsPage /> }
        ]
    },
    {
        path: '*',
        element: <ErrorPage />
    }
]);
