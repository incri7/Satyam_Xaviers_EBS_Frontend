import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Microscope, Briefcase, GraduationCap, MapPin, Mail, Phone,
    BookMarked, Users as UsersIcon, Loader2,
} from 'lucide-react';
import { academicsService } from '../../api/services/academics.service';

interface Props {
    teacherId: number | null;
    onClose: () => void;
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-slate-800 break-words">{value || '—'}</p>
        </div>
    </div>
);

export const TeacherProfileDrawer: React.FC<Props> = ({ teacherId, onClose }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['teacher-profile', teacherId],
        queryFn: () => academicsService.getTeacherProfile(teacherId as number),
        enabled: !!teacherId,
    });

    return (
        <AnimatePresence>
            {teacherId && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-slate-900">Teacher Profile</h2>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isLoading || !data ? (
                            <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Identity */}
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                        <Microscope className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{data.first_name} {data.last_name || ''}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {data.designation || 'Teacher'}{data.staff_code ? ` • ${data.staff_code}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-1 gap-4">
                                    <Row icon={<Mail className="w-4 h-4" />} label="Email" value={data.email} />
                                    <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={data.phone} />
                                    <Row icon={<GraduationCap className="w-4 h-4" />} label="Qualification" value={data.qualification} />
                                    <Row icon={<Briefcase className="w-4 h-4" />} label="Experience" value={data.experience_years != null ? `${data.experience_years} years` : null} />
                                    <Row icon={<MapPin className="w-4 h-4" />} label="Location" value={[data.city, data.state].filter(Boolean).join(', ') || null} />
                                </div>

                                {/* Subjects */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <BookMarked className="w-3.5 h-3.5" /> Subjects
                                    </p>
                                    {data.subjects.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {data.subjects.map(s => (
                                                <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">{s}</span>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-slate-400 font-medium">No subjects mapped.</p>}
                                </div>

                                {/* Classes taught */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <UsersIcon className="w-3.5 h-3.5" /> Classes taught
                                    </p>
                                    {data.teaches.length ? (
                                        <div className="space-y-2">
                                            {data.teaches.map(tc => (
                                                <div key={tc.class_name} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                                                    <span className="text-sm font-bold text-slate-800">{tc.class_name}</span>
                                                    <span className="text-xs font-medium text-slate-500 text-right">{tc.subjects.join(', ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-slate-400 font-medium">Not assigned to any class subject yet.</p>}
                                </div>

                                {/* Class teacher of */}
                                {data.class_teacher_of.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Class teacher of</p>
                                        <div className="flex flex-wrap gap-2">
                                            {data.class_teacher_of.map((ct, i) => (
                                                <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                                                    {ct.class_name} — {ct.section_name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
