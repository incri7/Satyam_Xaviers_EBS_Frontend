import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { User, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfilePage: React.FC = () => {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: peopleService.getMe,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72 focus:outline-none">
                    <DashboardHeader />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                </main>
            </div>
        );
    }

    const userData = profile?.user || profile; // Polymorphic helper

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                    {/* Hero Profile Section */}
                    <div className="relative">
                        <div className="h-48 w-full bg-gradient-to-r from-brand to-rose-400 rounded-3xl" />
                        <div className="absolute -bottom-16 left-8 flex items-end gap-6">
                            <div className="w-32 h-32 bg-white rounded-3xl p-1 shadow-xl shadow-slate-200">
                                <div className="w-full h-full bg-slate-100 rounded-[1.4rem] flex items-center justify-center text-slate-400">
                                    <User className="w-16 h-16" />
                                </div>
                            </div>
                            <div className="pb-4">
                                <h1 className="text-3xl font-bold text-slate-900">{userData.first_name} {userData.last_name}</h1>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-brand/10 text-brand text-xs font-bold rounded-full uppercase tracking-wider">
                                        {userData.role}
                                    </span>
                                    <span className="text-slate-500 font-medium text-sm">Member since {new Date(userData.created_at).getFullYear()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20">
                        {/* Information Grid */}
                        <div className="lg:col-span-2 space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8"
                            >
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-brand" />
                                    Personal Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                        <p className="font-bold text-slate-700">{userData.first_name} {userData.middle_name || ''} {userData.last_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                        <p className="font-bold text-slate-700">{userData.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                                        <p className="font-bold text-slate-700">{userData.phone || 'Not Provided'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</p>
                                        <p className="font-bold text-brand uppercase">{userData.role}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Role Specific Details */}
                            {profile.designation && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8"
                                >
                                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-brand" />
                                        Professional Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Code</p>
                                            <p className="font-bold text-slate-700">{profile.staff_code}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Designation</p>
                                            <p className="font-bold text-slate-700">{profile.designation}</p>
                                        </div>
                                        {profile.qualification && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qualification</p>
                                                <p className="font-bold text-slate-700">{profile.qualification}</p>
                                            </div>
                                        )}
                                        {profile.experience_years !== undefined && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                                <p className="font-bold text-slate-700">{profile.experience_years} Years</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Sidebar info */}
                        <div className="space-y-8">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8"
                            >
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Security</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            <span className="font-bold text-slate-700 text-sm">Verified & Active</span>
                                        </div>
                                    </div>
                                    <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-200 hover:scale-[1.02] transition-all active:scale-[0.98]">
                                        Change Password
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
