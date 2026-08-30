import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Briefcase, MapPin, Mail, Phone, Calendar, Loader2 } from 'lucide-react';
import { peopleService } from '../../api/services/people.service';

interface Props {
    staffId: number | null;
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

export const StaffProfileDrawer: React.FC<Props> = ({ staffId, onClose }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['staff-profile', staffId],
        queryFn: () => peopleService.getStaffProfile(staffId as number),
        enabled: !!staffId,
    });

    return (
        <AnimatePresence>
            {staffId && (
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
                            <h2 className="text-lg font-bold text-slate-900">Staff Profile</h2>
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
                                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{data.first_name} {data.last_name || ''}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {data.designation || 'Staff'}{data.staff_code ? ` • ${data.staff_code}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-1 gap-4">
                                    <Row icon={<Mail className="w-4 h-4" />} label="Email" value={data.email} />
                                    <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={data.phone} />
                                    <Row icon={<Briefcase className="w-4 h-4" />} label="Designation" value={data.designation} />
                                    <Row
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Joined"
                                        value={data.join_date ? new Date(data.join_date).toLocaleDateString() : null}
                                    />
                                    <Row
                                        icon={<MapPin className="w-4 h-4" />}
                                        label="Location"
                                        value={[data.address_line, data.city, data.state].filter(Boolean).join(', ') || null}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
