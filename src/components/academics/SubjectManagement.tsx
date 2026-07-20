import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { BookMarked, Plus, Search, X, Loader2, Microscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';

export const SubjectManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    const { data: subjects, isLoading } = useQuery({
        queryKey: ['subjects', 'all'],
        queryFn: () => academicsService.getSubjects(),
    });

    // Teacher options carry each teacher's subjects — invert to "who teaches X"
    const { data: teacherOptions } = useQuery({
        queryKey: ['teacher-options'],
        queryFn: academicsService.getTeacherOptions,
    });

    const teachersBySubject: Record<number, string[]> = {};
    (teacherOptions || []).forEach(tch => {
        tch.subjects.forEach(s => {
            (teachersBySubject[s.id] = teachersBySubject[s.id] || []).push(tch.name);
        });
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => academicsService.createSubject(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setIsCreateOpen(false);
            setNewName('');
            setCreateError(null);
        },
        onError: (err: any) => setCreateError(err.response?.data?.detail || 'Failed to add subject'),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return setCreateError('Subject name is required');
        createMutation.mutate(newName.trim());
    };

    const filtered = (subjects || []).filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search subjects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <span>Total Subjects:</span>
                        <span className="text-slate-900">{subjects?.length || 0}</span>
                    </div>
                    <AccessControl id="classes_create">
                        <button
                            onClick={() => { setIsCreateOpen(true); setCreateError(null); }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white font-bold text-sm rounded-xl shrink-0 hover:opacity-95 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Subject
                        </button>
                    </AccessControl>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                    <div className="inline-flex w-16 h-16 bg-slate-100 rounded-full items-center justify-center text-slate-400">
                        <BookMarked className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-900">No subjects found</p>
                    <p className="text-sm text-slate-500">Add the subjects taught at your school.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((subject, idx) => {
                        const teachers = teachersBySubject[subject.id] || [];
                        return (
                            <motion.div
                                key={subject.id}
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                        <BookMarked className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-900">{subject.name}</h4>
                                </div>
                                <div className="border-t border-slate-50 pt-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Teachers ({teachers.length})
                                    </p>
                                    {teachers.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No teacher assigned yet</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {teachers.map((name, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-lg text-xs font-medium text-slate-600">
                                                    <Microscope className="w-3 h-3 text-slate-400" />
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setIsCreateOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Add Subject</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Subject Name</label>
                                <input
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Serofero"
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                                />
                            </div>
                            {createError && (
                                <p className="text-sm font-medium text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{createError}</p>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-900 text-sm">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:opacity-95 disabled:opacity-50"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
