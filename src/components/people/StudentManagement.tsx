import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { Search, Edit2, Trash2, GraduationCap, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { cn } from '../../utils/cn';
import { EditStudentModal } from './EditStudentModal';
import type { Student } from '../../types/people';

export const StudentManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const { data: studentData, isLoading } = useQuery({
        queryKey: ['students', searchQuery, page, limit],
        queryFn: () => peopleService.getStudents({ search: searchQuery, page, limit }),
    });

    const deleteMutation = useMutation({
        mutationFn: peopleService.deleteStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete student');
        }
    });

    const students = studentData?.students || [];

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, admission ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>Total Students:</span>
                    <span className="text-slate-900">{studentData?.total_count || 0}</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : students.map((student: Student) => (
                    <motion.div
                        key={student.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                                    <GraduationCap className="w-8 h-8" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="students_update">
                                        <button
                                            onClick={() => setEditingStudent(student)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="students_delete">
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this student profile?')) {
                                                    deleteMutation.mutate(student.id);
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{student.first_name} {student.last_name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adm No: {student.admission_no}</p>
                            </div>

                            <div className="space-y-2 text-sm font-medium text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        student.status === 'active' ? "bg-emerald-500" : "bg-red-500"
                                    )} />
                                    <span className="capitalize">{student.status}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1">{student.city || 'N/A'}, {student.state || ''}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 group-hover:bg-brand/5 transition-colors flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">DOB: {new Date(student.dob).toLocaleDateString()}</span>
                            <button className="text-xs font-bold text-brand hover:underline">
                                Details →
                            </button>
                        </div>
                    </motion.div>
                ))}

                {students.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <GraduationCap className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No students found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search query or add a new student.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls (Simple) */}
            {studentData && studentData.total_pages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm font-bold text-slate-400">Page {page} of {studentData.total_pages}</span>
                    <button
                        disabled={page === studentData.total_pages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {editingStudent && (
                <EditStudentModal
                    student={editingStudent}
                    isOpen={!!editingStudent}
                    onClose={() => setEditingStudent(null)}
                />
            )}
        </div>
    );
};
