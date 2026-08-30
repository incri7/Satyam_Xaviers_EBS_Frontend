import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Megaphone, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { noticesService } from '../../api/services/notices.service';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { NoticeAudienceScope, NoticePriority } from '../../types/notice';
import type { Class, Section } from '../../types/academic';

const NOTICE_ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'principal', label: 'Principal' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'coordinator', label: 'Coordinator' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'parent', label: 'Parent' },
    { value: 'student', label: 'Student' },
    { value: 'staff', label: 'Staff' },
];

interface StudentOption {
    id: number;
    first_name: string;
    last_name: string;
    admission_no?: string;
}

interface CreateNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const initialFormData = {
    title: '',
    body: '',
    scope: 'all' as NoticeAudienceScope,
    priority: 'medium' as NoticePriority,
    valid_to: '',
    role: '',
    class_id: '' as number | '',
    section_id: '' as number | '',
    student_id: '' as number | '',
};

export const CreateNoticeModal: React.FC<CreateNoticeModalProps> = ({ isOpen, onClose, onCreated }) => {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState(initialFormData);

    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [studentQuery, setStudentQuery] = useState('');
    const [studentResults, setStudentResults] = useState<StudentOption[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
    const [studentSearching, setStudentSearching] = useState(false);
    const studentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        academicsService.getClasses({ limit: 100 }).then(res => setClasses(res.classes)).catch(() => setClasses([]));
    }, [isOpen]);

    useEffect(() => {
        if (formData.scope !== 'class_section' || !formData.class_id) {
            setSections([]);
            return;
        }
        academicsService.getSections({ class_id: Number(formData.class_id), limit: 100 })
            .then(res => setSections(res.sections))
            .catch(() => setSections([]));
    }, [formData.scope, formData.class_id]);

    const handleClose = () => {
        setFormData(initialFormData);
        setStudentQuery('');
        setStudentResults([]);
        setSelectedStudent(null);
        setError(null);
        onClose();
    };

    const handleScopeChange = (scope: NoticeAudienceScope) => {
        setFormData({ ...formData, scope, role: '', class_id: '', section_id: '', student_id: '' });
        setStudentQuery('');
        setStudentResults([]);
        setSelectedStudent(null);
    };

    const handleStudentSearch = (query: string) => {
        setStudentQuery(query);
        setSelectedStudent(null);
        setFormData(prev => ({ ...prev, student_id: '' }));
        if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);
        if (query.trim().length < 2) {
            setStudentResults([]);
            return;
        }
        studentSearchTimer.current = setTimeout(async () => {
            setStudentSearching(true);
            try {
                const res = await peopleService.getStudents({ search: query.trim(), limit: 8 });
                setStudentResults(res.students || []);
            } catch {
                setStudentResults([]);
            } finally {
                setStudentSearching(false);
            }
        }, 300);
    };

    const pickStudent = (s: StudentOption) => {
        setSelectedStudent(s);
        setFormData(prev => ({ ...prev, student_id: s.id }));
        setStudentResults([]);
        setStudentQuery(`${s.first_name} ${s.last_name}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return setError('Title is required');
        if (!formData.body.trim()) return setError('Body is required');
        if (formData.scope === 'role' && !formData.role) return setError('Select which role this notice is for');
        if (formData.scope === 'class_section' && !formData.class_id) return setError('Select which class this notice is for');
        if (formData.scope === 'student' && !formData.student_id) return setError('Search and select a student');

        setIsSubmitting(true);
        setError(null);
        try {
            await noticesService.createNotice({
                title: formData.title.trim(),
                body: formData.body.trim(),
                scope: formData.scope,
                priority: formData.priority,
                posted_by_user_id: user?.id,
                valid_to: formData.valid_to || undefined,
                role: formData.scope === 'role' ? formData.role : undefined,
                class_id: formData.scope === 'class_section' ? Number(formData.class_id) : undefined,
                section_id: formData.scope === 'class_section' && formData.section_id ? Number(formData.section_id) : undefined,
                student_id: formData.scope === 'student' ? Number(formData.student_id) : undefined,
            });
            onCreated();
            handleClose();
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail.map((d: any) => d.msg || String(d)).join(', '));
            } else {
                setError(detail || err.message || 'Failed to post notice');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Post Notice</h2>
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

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Notice title..."
                            autoFocus
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Body</label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder="Notice content..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Audience</label>
                            <div className="relative">
                                <select
                                    value={formData.scope}
                                    onChange={(e) => handleScopeChange(e.target.value as NoticeAudienceScope)}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                >
                                    <option value="all">Everyone</option>
                                    <option value="role">By Role</option>
                                    <option value="class_section">Class/Section</option>
                                    <option value="student">Specific Student</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Priority</label>
                            <div className="relative">
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as NoticePriority })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {formData.scope === 'role' && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Which Role</label>
                            <div className="relative">
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                >
                                    <option value="">Select a role...</option>
                                    {NOTICE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {formData.scope === 'class_section' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Class</label>
                                <div className="relative">
                                    <select
                                        value={formData.class_id}
                                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : '', section_id: '' })}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none"
                                    >
                                        <option value="">Select class...</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Section (optional)</label>
                                <div className="relative">
                                    <select
                                        value={formData.section_id}
                                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value ? Number(e.target.value) : '' })}
                                        disabled={!formData.class_id}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none appearance-none disabled:opacity-50"
                                    >
                                        <option value="">Whole class</option>
                                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.scope === 'student' && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Which Student</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={studentQuery}
                                    onChange={(e) => handleStudentSearch(e.target.value)}
                                    placeholder="Search student by name or admission no..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                                />
                            </div>
                            {studentSearching && <p className="text-xs text-slate-400 ml-1">Searching...</p>}
                            {studentResults.length > 0 && (
                                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-50">
                                    {studentResults.map(s => (
                                        <button
                                            type="button"
                                            key={s.id}
                                            onClick={() => pickStudent(s)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                                        >
                                            <span>{s.first_name} {s.last_name}</span>
                                            {s.admission_no && <span className="text-xs text-slate-400">{s.admission_no}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedStudent && (
                                <p className="text-xs font-bold text-brand ml-1">
                                    Selected: {selectedStudent.first_name} {selectedStudent.last_name}
                                    {selectedStudent.admission_no ? ` (${selectedStudent.admission_no})` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Valid Until (optional)</label>
                        <input
                            type="date"
                            value={formData.valid_to}
                            onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                        />
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Posting...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Post Notice</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
