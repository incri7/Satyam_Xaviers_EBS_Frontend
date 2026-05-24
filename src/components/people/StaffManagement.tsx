import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Edit2, Trash2, Users, MapPin, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import type { Staff } from '../../types/people';

export const StaffManagement: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page] = useState(1);
    const [limit] = useState(20);

    const { data: staffData, isLoading, isError } = useQuery({
        queryKey: ['staff', searchQuery, page, limit],
        queryFn: () => peopleService.getStaffList({ search: searchQuery, page, limit }),
    });

    const staffList = staffData?.staff || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>Total Staff:</span>
                    <span className="text-slate-900">{staffData?.total_count || 0}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : staffList.map((m: Staff) => (
                    <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="staff_update">
                                        <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="staff_delete">
                                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{m.first_name} {m.last_name}</h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{m.designation || 'Staff'}</span>
                                    <span>•</span>
                                    <span>{m.staff_code}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{m.city || 'N/A'}, {m.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-amber-50/50 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Joined: {m.join_date ? new Date(m.join_date).toLocaleDateString() : 'N/A'}</span>
                            <button className="text-xs font-bold text-amber-600 hover:underline">
                                Details →
                            </button>
                        </div>
                    </motion.div>
                ))}

                {isError && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-10 h-10 text-red-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Failed to load staff</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">There was a problem fetching staff records. Please try again.</p>
                    </div>
                )}
                {staffList.length === 0 && !isLoading && !isError && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No staff found</h3>
                    </div>
                )}
            </div>
        </div>
    );
};
