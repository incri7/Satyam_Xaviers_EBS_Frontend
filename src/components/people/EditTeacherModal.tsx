import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../../api/services/people.service';
import { X, Microscope, Save, Briefcase, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Teacher, TeacherUpdate } from '../../types/people';

interface EditTeacherModalProps {
    teacher: Teacher;
    isOpen: boolean;
    onClose: () => void;
}

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({ teacher, isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset } = useForm<TeacherUpdate>();

    useEffect(() => {
        if (teacher) {
            reset({
                first_name: teacher.first_name,
                last_name: teacher.last_name,
                middle_name: teacher.middle_name,
                staff_code: teacher.staff_code,
                join_date: teacher.join_date,
                designation: teacher.designation,
                dob: teacher.dob,
                gender: teacher.gender,
                blood_group: teacher.blood_group,
                address_line: (teacher as any).address_line,
                city: teacher.city,
                state: teacher.state,
                pincode: teacher.pincode,
                qualification: teacher.qualification,
                experience_years: teacher.experience_years,
            });
        }
    }, [teacher, reset]);

    const mutation = useMutation({
        mutationFn: (data: TeacherUpdate) => peopleService.updateTeacher(teacher.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            onClose();
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to update teacher');
        }
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Microscope className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Edit Teacher Profile</h2>
                                    <p className="text-slate-500 font-medium">Update professional details and personal information</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <form id="edit-teacher-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex-1 overflow-y-auto p-8 pt-6">
                            <div className="space-y-10">
                                {/* Basic Info */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                        <Briefcase className="w-4 h-4" />
                                        Professional Information
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                                            <input
                                                {...register('first_name')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                                            <input
                                                {...register('last_name')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Designation</label>
                                            <input
                                                {...register('designation')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Qualifications & Exp */}
                                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Qualification</label>
                                        <input
                                            {...register('qualification')}
                                            className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Experience (Years)</label>
                                        <input
                                            type="number"
                                            {...register('experience_years')}
                                            className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                        />
                                    </div>
                                </section>

                                {/* Address */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                        <MapPin className="w-4 h-4 ml-[-2px]" />
                                        Location Details
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Address Line</label>
                                            <input
                                                {...register('address_line')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
                                            <input
                                                {...register('city')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">State</label>
                                            <input
                                                {...register('state')}
                                                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4 sticky bottom-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-teacher-form"
                                disabled={mutation.isPending}
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {mutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
