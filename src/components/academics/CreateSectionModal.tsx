import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, Layers, AlertCircle, ChevronDown, Search, User, Loader2 } from 'lucide-react';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import type { Teacher } from '../../types/people';

interface CreateSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateSectionModal: React.FC<CreateSectionModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        class_id: '',
        capacity: 40,
        class_teacher_id: '',
    });

    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
    const [debouncedTeacherQuery, setDebouncedTeacherQuery] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
    const [teacherResults, setTeacherResults] = useState<Teacher[]>([]);
    const [showTeacherResults, setShowTeacherResults] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce teacher search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTeacherQuery(teacherSearchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [teacherSearchQuery]);

    // Fetch teachers when debounced query changes
    useEffect(() => {
        if (!debouncedTeacherQuery || debouncedTeacherQuery.length < 2 || selectedTeacher) {
            setTeacherResults([]);
            return;
        }

        const fetchTeachers = async () => {
            setIsSearchingTeachers(true);
            try {
                const response = await peopleService.getTeachers({ search: debouncedTeacherQuery, limit: 10 });
                setTeacherResults(response.teachers || []);
                setShowTeacherResults(true);
            } catch (err) {
                console.error('Teacher search failed:', err);
            } finally {
                setIsSearchingTeachers(false);
            }
        };

        fetchTeachers();
    }, [debouncedTeacherQuery, selectedTeacher]);

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const mutation = useMutation({
        mutationFn: academicsService.createSection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections'] });
            handleClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || err.message || 'Failed to create section');
        }
    });

    const handleClose = () => {
        setFormData({ name: '', class_id: '', capacity: 40, class_teacher_id: '' });
        setTeacherSearchQuery('');
        setDebouncedTeacherQuery('');
        setSelectedTeacher(null);
        setTeacherResults([]);
        setShowTeacherResults(false);
        setError(null);
        onClose();
    };

    const handleSelectTeacher = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setFormData({ ...formData, class_teacher_id: teacher.id.toString() });
        setTeacherSearchQuery('');
        setShowTeacherResults(false);
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return setError('Section name is required');
        if (!formData.class_id) return setError('Class selection is required');

        mutation.mutate({
            name: formData.name,
            class_id: Number(formData.class_id),
            capacity: Number(formData.capacity),
            class_teacher_id: formData.class_teacher_id ? Number(formData.class_teacher_id) : undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>

            <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Add New Section</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Class</label>
                            <div className="relative">
                                <select
                                    value={formData.class_id}
                                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                >
                                    <option value="">Select class</option>
                                    {classesData?.classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Section Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. A, B, C"
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Class Teacher (Optional)</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search teacher by name..."
                                value={teacherSearchQuery}
                                onChange={(e) => {
                                    setTeacherSearchQuery(e.target.value);
                                    if (selectedTeacher) setSelectedTeacher(null);
                                }}
                                onFocus={() => teacherSearchQuery.length >= 2 && setShowTeacherResults(true)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                            />
                            {isSearchingTeachers && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />
                            )}
                        </div>

                        {/* Teacher Results Dropdown */}
                        {showTeacherResults && teacherResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl max-h-48 overflow-y-auto">
                                {teacherResults.map((teacher) => (
                                    <button
                                        key={teacher.id}
                                        type="button"
                                        onClick={() => handleSelectTeacher(teacher)}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-none"
                                    >
                                        <div className="w-8 h-8 bg-brand/5 rounded-full flex items-center justify-center text-brand">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{teacher.first_name} {teacher.last_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Code: {teacher.staff_code || 'N/A'} • {teacher.designation || 'Teacher'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedTeacher && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-900">Assigned: {selectedTeacher.first_name} {selectedTeacher.last_name}</p>
                                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-tight">Code: {selectedTeacher.staff_code}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTeacher(null);
                                        setTeacherSearchQuery('');
                                        setFormData({ ...formData, class_teacher_id: '' });
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Capacity</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                        />
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Creating...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Create Section</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
