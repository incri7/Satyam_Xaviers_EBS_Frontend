import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, UserPlus, AlertCircle, ChevronDown, Search, User, Loader2 } from 'lucide-react';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import type { Student } from '../../types/people';
import type { Enrollment } from '../../types/academic';

interface EditEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrollmentData: Enrollment | null;
}

export const EditEnrollmentModal: React.FC<EditEnrollmentModalProps> = ({ isOpen, onClose, enrollmentData }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        student_id: '',
        class_id: '',
        section_id: '',
        academic_year: '2024-2025',
        is_active: true,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial student lookup for edit
    useEffect(() => {
        if (enrollmentData && isOpen) {
            setFormData({
                student_id: enrollmentData.student_id.toString(),
                class_id: enrollmentData.class_id.toString(),
                section_id: enrollmentData.section_id?.toString() || '',
                academic_year: enrollmentData.academic_year,
                is_active: enrollmentData.is_active,
            });

            // Fetch student name for UI
            peopleService.getStudents({ limit: 100 }).then(res => {
                const student = res.students.find((s: Student) => s.id === enrollmentData.student_id);
                if (student) setSelectedStudent(student);
            });
        }
    }, [enrollmentData, isOpen]);

    // Debounce student search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2 || selectedStudent) {
            setSearchResults([]);
            return;
        }

        const fetchStudents = async () => {
            setIsSearching(true);
            try {
                const response = await peopleService.getStudents({ search: debouncedQuery, limit: 10 });
                setSearchResults(response.students || []);
                setShowResults(true);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        };

        fetchStudents();
    }, [debouncedQuery, selectedStudent]);

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', formData.class_id],
        queryFn: () => academicsService.getSections({ class_id: formData.class_id ? Number(formData.class_id) : undefined }),
        enabled: !!formData.class_id,
    });

    const mutation = useMutation({
        mutationFn: (data: { id: number; payload: any }) => academicsService.updateEnrollment(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
            handleClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || err.message || 'Failed to update enrollment');
        }
    });

    const handleClose = () => {
        setError(null);
        setSelectedStudent(null);
        setSearchQuery('');
        onClose();
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setFormData({ ...formData, student_id: student.id.toString() });
        setSearchQuery('');
        setShowResults(false);
    };

    if (!isOpen || !enrollmentData) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.student_id) return setError('Student selection is required');
        if (!formData.class_id) return setError('Class selection is required');

        mutation.mutate({
            id: enrollmentData.id,
            payload: {
                student_id: Number(formData.student_id),
                class_id: Number(formData.class_id),
                section_id: formData.section_id ? Number(formData.section_id) : null,
                academic_year: formData.academic_year,
                is_active: formData.is_active,
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>

            <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Edit Enrollment</h2>
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

                    <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-slate-700 ml-1">Student</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or admission no..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (selectedStudent) setSelectedStudent(null);
                                }}
                                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />
                            )}
                        </div>

                        {showResults && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl max-h-48 overflow-y-auto">
                                {searchResults.map((student) => (
                                    <button
                                        key={student.id}
                                        type="button"
                                        onClick={() => handleSelectStudent(student)}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-none"
                                    >
                                        <div className="w-8 h-8 bg-brand/5 rounded-full flex items-center justify-center text-brand">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{student.first_name} {student.last_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adm No: {student.admission_no}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedStudent && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-tight">Active Selection</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setSearchQuery('');
                                        setFormData({ ...formData, student_id: '' });
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Class</label>
                            <div className="relative">
                                <select
                                    value={formData.class_id}
                                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value, section_id: '' })}
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
                            <label className="text-sm font-bold text-slate-700 ml-1">Section</label>
                            <div className="relative">
                                <select
                                    disabled={!formData.class_id}
                                    value={formData.section_id}
                                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none disabled:opacity-50"
                                >
                                    <option value="">Select section</option>
                                    {sectionsData?.sections.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Academic Year</label>
                            <div className="relative">
                                <select
                                    value={formData.academic_year}
                                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                >
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2023-2024">2023-2024</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
                            <div className="flex h-[44px] items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.is_active}
                                        onChange={() => setFormData({ ...formData, is_active: true })}
                                        className="w-4 h-4 text-brand focus:ring-brand/20"
                                    />
                                    <span className="text-sm font-bold text-slate-700">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!formData.is_active}
                                        onChange={() => setFormData({ ...formData, is_active: false })}
                                        className="w-4 h-4 text-brand focus:ring-brand/20"
                                    />
                                    <span className="text-sm font-bold text-slate-700">Inactive</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Updating...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Update Enrollment</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
