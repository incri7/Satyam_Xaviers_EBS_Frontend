import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Edit2, Trash2, Microscope, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { EditTeacherModal } from './EditTeacherModal';
import type { Teacher } from '../../types/people';

export const TeacherManagement: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

    const { data: teacherData, isLoading } = useQuery({
        queryKey: ['teachers', searchQuery, page, limit],
        queryFn: () => peopleService.getTeachers({ search: searchQuery, page, limit }),
    });

    const teachers = teacherData?.teachers || [];

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, staff code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>Total Teachers:</span>
                    <span className="text-slate-900">{teacherData?.total_count || 0}</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : teachers.map((teacher: Teacher) => (
                    <motion.div
                        key={teacher.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Microscope className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="teachers_update">
                                        <button
                                            onClick={() => setEditingTeacher(teacher)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="teachers_delete">
                                        <button
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{teacher.first_name} {teacher.last_name}</h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{teacher.designation || 'Teacher'}</span>
                                    <span>•</span>
                                    <span>{teacher.staff_code}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{teacher.qualification || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{teacher.city || 'N/A'}, {teacher.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-blue-50/50 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Exp: {teacher.experience_years || 0} Years</span>
                            <button className="text-xs font-bold text-blue-600 hover:underline">
                                View Profile →
                            </button>
                        </div>
                    </motion.div>
                ))}

                {teachers.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Microscope className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No teachers found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search query or add a new teacher.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {teacherData && teacherData.total_pages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm font-bold text-slate-400">Page {page} of {teacherData.total_pages}</span>
                    <button
                        disabled={page === teacherData.total_pages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {editingTeacher && (
                <EditTeacherModal
                    teacher={editingTeacher}
                    isOpen={!!editingTeacher}
                    onClose={() => setEditingTeacher(null)}
                />
            )}
        </div>
    );
};
