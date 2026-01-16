import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const DashboardLayout: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-background-soft p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                        <p className="text-slate-500">Welcome back, <span className="font-semibold text-brand">{user?.email}</span></p>
                    </div>
                    <div className="w-32">
                        <Button variant="outline" onClick={logout}>
                            Log out
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-700 mb-2">Profile Status</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                        </span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-700 mb-2">Role</h3>
                        <p className="text-sm text-slate-600 capitalize">{user?.role || 'User'}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-700 mb-2">Account ID</h3>
                        <p className="text-sm text-slate-600">#{user?.id}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
