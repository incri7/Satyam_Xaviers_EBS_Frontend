import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Home, Edit2, MapPin, Briefcase, Mail, Phone, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import type { Parent } from '../../types/people';

export const ParentManagement: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page] = useState(1);
    const [limit] = useState(20);

    const { data: parentData, isLoading } = useQuery({
        queryKey: ['parents', searchQuery, page, limit],
        queryFn: () => peopleService.getParents({ search: searchQuery, page, limit }),
    });

    const parents = parentData?.parents || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search parents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>Total Parents:</span>
                    <span className="text-slate-900">{parentData?.total_count || 0}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : parents.map((p: Parent) => (
                    <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 p-6 space-y-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                    <Home className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{p.first_name} {p.last_name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                        <Briefcase className="w-3 h-3" />
                                        <span>{p.occupation || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <AccessControl id="parents_update">
                                <button className="p-2 text-slate-400 hover:text-brand hover:bg-rose-50 rounded-lg transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </AccessControl>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Details</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span className="truncate">{p.user?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{p.user?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="line-clamp-2">{p.city || 'N/A'}, {p.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                                <Users className="w-3 h-3" />
                                <span>Nat ID: {p.national_id || 'N/A'}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
