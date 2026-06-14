import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { Trash2, UserCheck, Calendar, User, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { AccessControl } from '../AccessControl';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { useTranslation } from 'react-i18next';
import type { Enrollment } from '../../types/academic';

export const EnrollmentManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [academicYear, setAcademicYearState] = useState(() => {
        return localStorage.getItem('academics_enrollment_year') || '2024-2025';
    });
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const setAcademicYear = (year: string) => {
        setAcademicYearState(year);
        localStorage.setItem('academics_enrollment_year', year);
    };

    const { data: enrollmentData, isLoading } = useQuery({
        queryKey: ['enrollments', academicYear],
        queryFn: () => academicsService.getEnrollments({ academic_year: academicYear }),
    });

    const deleteMutation = useMutation({
        mutationFn: academicsService.deleteEnrollment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete enrollment');
        }
    });

    const enrollments = enrollmentData?.enrollments || [];

    return (
        <div className="space-y-6">
            <EditEnrollmentModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedEnrollment(null);
                }}
                enrollmentData={selectedEnrollment}
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none cursor-pointer appearance-none"
                        >
                            <option value="2024-2025">Year 2024-2025</option>
                            <option value="2023-2024">Year 2023-2024</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>{t('academics.activeEnrollments')}</span>
                    <span className="text-slate-900">{enrollmentData?.total_count || 0}</span>
                </div>
            </div>

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                    ))
                ) : enrollments.map((enrollment) => (
                    <motion.div
                        key={enrollment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand/30 transition-all hover:shadow-lg hover:shadow-slate-200/50 relative group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 line-clamp-1">{t('academics.studentId')} {enrollment.student_id}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{enrollment.academic_year}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('academics.class')}</p>
                                <p className="text-sm font-bold text-slate-800">{enrollment.class_?.name || `ID: ${enrollment.class_id}`}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('academics.section')}</p>
                                <p className="text-sm font-bold text-slate-800">{enrollment.section?.name || (enrollment.section_id ? `ID: ${enrollment.section_id}` : 'None')}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                                enrollment.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                                {enrollment.is_active ? t('academics.active') : t('academics.inactive')}
                            </div>

                            <div className="flex gap-1">
                                <AccessControl id="enrollments_update">
                                    <button
                                        onClick={() => {
                                            setSelectedEnrollment(enrollment);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </AccessControl>
                                <AccessControl id="enrollments_delete">
                                    <button
                                        onClick={() => {
                                            if (window.confirm(t('common.confirm') + '?')) {
                                                deleteMutation.mutate(enrollment.id);
                                            }
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </AccessControl>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {enrollments.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <UserCheck className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{t('academics.noEnrollmentsFound')}</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">{t('academics.noEnrollmentsDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
