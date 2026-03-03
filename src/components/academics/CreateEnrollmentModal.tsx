import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, UserCheck, AlertCircle, Calendar, Search, User, Loader2 } from 'lucide-react';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import type { Student } from '../../types/people';

interface CreateEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateEnrollmentModal: React.FC<CreateEnrollmentModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        student_id: '',
        class_id: '',
        section_id: '',
        academic_year: '2024-2025',
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch students when debounced query changes
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

    // Fetch classes for dropdown
    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    // Fetch sections for selected class
    const { data: sectionsData } = useQuery({
        queryKey: ['sections', formData.class_id],
        queryFn: () => academicsService.getSections({ class_id: formData.class_id ? Number(formData.class_id) : undefined }),
        enabled: !!formData.class_id,
    });

    const mutation = useMutation({
        mutationFn: academicsService.createEnrollment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
            handleClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || err.message || 'Failed to enroll student');
        }
    });

    const handleClose = () => {
        setFormData({ student_id: '', class_id: '', section_id: '', academic_year: '2024-2025' });
        setSearchQuery('');
        setDebouncedQuery('');
        setSelectedStudent(null);
        setSearchResults([]);
        setError(null);
        onClose();
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setFormData({ ...formData, student_id: student.id.toString() });
        setSearchQuery(''); // Clear query after selection
        setShowResults(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.student_id) return setError('Student selection is required');
        if (!formData.class_id) return setError('Class selection is required');

        mutation.mutate({
            student_id: Number(formData.student_id),
            class_id: Number(formData.class_id),
            section_id: formData.section_id ? Number(formData.section_id) : undefined,
            academic_year: formData.academic_year,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>

            <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">New Enrollment</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Academic Year</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={formData.academic_year}
                                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="2024-2025">2024-2025</option>
                                <option value="2023-2024">2023-2024</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-slate-700 ml-1">Search Student</label>
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

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl max-h-60 overflow-y-auto">
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
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Adm: {student.admission_no || 'N/A'} • Status: {student.status}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && showResults && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl p-6 text-center">
                                <p className="text-sm font-medium text-slate-500">No students found matching "{searchQuery}"</p>
                            </div>
                        )}

                        {selectedStudent && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-900">Selected: {selectedStudent.first_name} {selectedStudent.last_name}</p>
                                        <p className="text-[10px] font-medium text-emerald-600 uppercase">ID: {selectedStudent.id}</p>
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
                                    Clear
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
                                    <option value="">Select Class</option>
                                    {classesData?.classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Section (Optional)</label>
                            <div className="relative">
                                <select
                                    value={formData.section_id}
                                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                                    disabled={!formData.class_id}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none disabled:opacity-50"
                                >
                                    <option value="">Select Section</option>
                                    {sectionsData?.sections.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={mutation.isPending || !selectedStudent}
                            className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Processing...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Complete Enrollment</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
