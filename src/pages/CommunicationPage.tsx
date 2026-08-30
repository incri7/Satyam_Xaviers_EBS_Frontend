import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Bell, Search, Plus, Calendar, User,
    Trash2, Edit2, X, Save, ArrowLeft,
    Megaphone, Users, GraduationCap, UserCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/useAuthStore';
import { noticesService } from '../api/services/notices.service';
import { academicsService } from '../api/services/academics.service';
import { peopleService } from '../api/services/people.service';
import { requestFCMToken, deviceService } from '../api/services/device.service';
import { CreateNoticeModal } from '../components/communication/CreateNoticeModal';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { homeForRole } from '../utils/roleHome';
import type { Notice, NoticeAudienceScope, NoticePriority } from '../types/notice';
import type { Class, Section } from '../types/academic';

const CommunicationPage: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'my_role'>('all');

    const canCreate = user?.role === 'admin' || user?.role === 'principal';
    // Parents get no sidebar outside a child's pages (see Sidebar.tsx) — this
    // page needs its own way back to the dashboard in that case.
    const hasSidebar = user?.role !== 'parent';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [notifStatus, setNotifStatus] = useState<'idle' | 'enabling' | 'enabled' | 'unavailable'>('idle');
    const [classNames, setClassNames] = useState<Record<number, string>>({});
    const [sectionNames, setSectionNames] = useState<Record<number, string>>({});
    const [studentNames, setStudentNames] = useState<Record<number, string>>({});

    const handleDelete = async (notice: Notice) => {
        if (!window.confirm(`Delete notice "${notice.title}"?`)) return;
        try {
            await noticesService.deleteNotice(notice.id);
            fetchNotices();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete notice');
        }
    };

    const handleEnableNotifications = async () => {
        setNotifStatus('enabling');
        try {
            const token = await requestFCMToken();
            if (token) {
                await deviceService.registerToken(token);
                setNotifStatus('enabled');
            } else {
                setNotifStatus('unavailable');
            }
        } catch {
            setNotifStatus('unavailable');
        }
    };

    useEffect(() => {
        fetchNotices();
    }, [activeTab]);

    const fetchNotices = async () => {
        setIsLoading(true);
        try {
            const data = await noticesService.getNotices(
                activeTab === 'my_role' ? { role: user?.role } : {}
            );
            setNotices(data);
        } catch (error) {
            console.error('Failed to fetch notices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const classIds = [...new Set(notices.filter(n => n.scope === 'class_section' && n.class_id).map(n => n.class_id!))];
        const sectionIds = [...new Set(notices.filter(n => n.scope === 'class_section' && n.section_id).map(n => n.section_id!))];
        const studentIds = [...new Set(notices.filter(n => n.scope === 'student' && n.student_id).map(n => n.student_id!))];

        if (classIds.length && Object.keys(classNames).length === 0) {
            academicsService.getClasses({ limit: 100 }).then(res => {
                setClassNames(Object.fromEntries(res.classes.map((c: Class) => [c.id, c.name])));
            }).catch(() => {});
        }
        if (sectionIds.length && Object.keys(sectionNames).length === 0) {
            academicsService.getSections({ limit: 100 }).then(res => {
                setSectionNames(Object.fromEntries(res.sections.map((s: Section) => [s.id, s.name])));
            }).catch(() => {});
        }
        const missingStudentIds = studentIds.filter(id => !(id in studentNames));
        if (missingStudentIds.length) {
            Promise.all(missingStudentIds.map(id => peopleService.getStudent(id).catch(() => null))).then(results => {
                const found: Record<number, string> = {};
                results.forEach((s: { first_name: string; last_name: string } | null, i) => {
                    if (s) found[missingStudentIds[i]] = `${s.first_name} ${s.last_name}`;
                });
                if (Object.keys(found).length) setStudentNames(prev => ({ ...prev, ...found }));
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notices]);

    const filteredNotices = notices.filter((n: Notice) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", hasSidebar && "lg:pl-72")}>
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <CreateNoticeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchNotices}
            />
            {editingNotice && (
                <EditNoticeModal
                    notice={editingNotice}
                    onClose={() => setEditingNotice(null)}
                    onSaved={() => { setEditingNotice(null); fetchNotices(); }}
                    initialStudentLabel={editingNotice.student_id ? studentNames[editingNotice.student_id] : undefined}
                />
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 md:gap-6">
                    {!hasSidebar && (
                        <Link to={homeForRole(user?.role || '')} className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                    )}
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-brand/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-brand flex-shrink-0">
                        <Megaphone className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t('communication.title')}</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">{t('communication.subtitle')}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 sm:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder={t('communication.searchNotices')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-brand/5 w-full sm:w-[280px] transition-all outline-none"
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-brand text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            {t('communication.postNotice')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Filters */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-brand/5 rounded-full blur-2xl" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">{t('communication.filters')}</h3>
                        <div className="space-y-2 relative z-10">
                            <FilterButton
                                active={activeTab === 'all'}
                                onClick={() => setActiveTab('all')}
                                icon={<Bell className="w-4 h-4" />}
                                label={t('communication.allNotices')}
                                count={notices.length}
                            />
                            <FilterButton
                                active={activeTab === 'my_role'}
                                onClick={() => setActiveTab('my_role')}
                                icon={<UserCircle className="w-4 h-4" />}
                                label={t('communication.forMyRole')}
                            />
                        </div>
                    </div>

                    <div className="bg-brand rounded-[2rem] p-8 text-white shadow-xl shadow-brand/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -m-4 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-125 duration-700" />
                        <div className="relative z-10 space-y-4">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Bell className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-bold tracking-tight">{t('communication.stayUpdated')}</h4>
                            <p className="text-xs text-brand-50/80 font-medium leading-relaxed">
                                {t('communication.enableNotificationsDesc')}
                            </p>
                            <button
                                onClick={handleEnableNotifications}
                                disabled={notifStatus === 'enabling' || notifStatus === 'enabled'}
                                className="w-full bg-white text-brand py-3 rounded-xl font-bold text-xs hover:bg-brand-50 transition-colors disabled:opacity-70"
                            >
                                {notifStatus === 'enabling' ? '…' :
                                 notifStatus === 'enabled' ? '✓ Notifications enabled' :
                                 notifStatus === 'unavailable' ? 'Not available on this device' :
                                 t('communication.enableNotifications')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-3 space-y-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-6">
                            {[1, 2, 3].map(i => <NoticeSkeleton key={i} />)}
                        </div>
                    ) : filteredNotices.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredNotices.map((notice: Notice) => (
                                <NoticeCard
                                    key={notice.id}
                                    notice={notice}
                                    canManage={canCreate}
                                    onEdit={() => setEditingNotice(notice)}
                                    onDelete={() => handleDelete(notice)}
                                    targetClassName={notice.class_id ? classNames[notice.class_id] : undefined}
                                    targetSectionName={notice.section_id ? sectionNames[notice.section_id] : undefined}
                                    targetStudentName={notice.student_id ? studentNames[notice.student_id] : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm border border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <Search className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900">{t('communication.noNoticesFound')}</h3>
                                <p className="text-slate-500 font-medium max-w-xs">{t('communication.noNoticesDesc')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
                </div>
            </main>
        </div>
    );
};

const EDIT_NOTICE_ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'principal', label: 'Principal' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'coordinator', label: 'Coordinator' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'parent', label: 'Parent' },
    { value: 'student', label: 'Student' },
    { value: 'staff', label: 'Staff' },
];

const EditNoticeModal: React.FC<{
    notice: Notice;
    onClose: () => void;
    onSaved: () => void;
    initialStudentLabel?: string;
}> = ({ notice, onClose, onSaved, initialStudentLabel }) => {
    const [title, setTitle] = useState(notice.title);
    const [body, setBody] = useState(notice.body);
    const [priority, setPriority] = useState<NoticePriority>(notice.priority);
    const [validTo, setValidTo] = useState(notice.valid_to ? notice.valid_to.slice(0, 10) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [scope, setScope] = useState<NoticeAudienceScope>(notice.scope);
    const [role, setRole] = useState(notice.role || '');
    const [classId, setClassId] = useState<number | ''>(notice.class_id ?? '');
    const [sectionId, setSectionId] = useState<number | ''>(notice.section_id ?? '');
    const [studentId, setStudentId] = useState<number | ''>(notice.student_id ?? '');
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [studentQuery, setStudentQuery] = useState(initialStudentLabel || (notice.student_id ? `#${notice.student_id}` : ''));
    const [studentResults, setStudentResults] = useState<{ id: number; first_name: string; last_name: string; admission_no?: string }[]>([]);
    const studentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        academicsService.getClasses({ limit: 100 }).then(res => setClasses(res.classes)).catch(() => setClasses([]));
    }, []);

    useEffect(() => {
        if (scope !== 'class_section' || !classId) {
            setSections([]);
            return;
        }
        academicsService.getSections({ class_id: Number(classId), limit: 100 }).then(res => setSections(res.sections)).catch(() => setSections([]));
    }, [scope, classId]);

    const handleScopeChange = (next: NoticeAudienceScope) => {
        setScope(next);
        setRole('');
        setClassId('');
        setSectionId('');
        setStudentId('');
        setStudentQuery('');
        setStudentResults([]);
    };

    const handleStudentSearch = (query: string) => {
        setStudentQuery(query);
        setStudentId('');
        if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);
        if (query.trim().length < 2) {
            setStudentResults([]);
            return;
        }
        studentSearchTimer.current = setTimeout(async () => {
            try {
                const res = await peopleService.getStudents({ search: query.trim(), limit: 8 });
                setStudentResults(res.students || []);
            } catch {
                setStudentResults([]);
            }
        }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return setError('Title is required');
        if (!body.trim()) return setError('Body is required');
        if (scope === 'role' && !role) return setError('Select which role this notice is for');
        if (scope === 'class_section' && !classId) return setError('Select which class this notice is for');
        if (scope === 'student' && !studentId) return setError('Search and select a student');
        setSaving(true);
        setError(null);
        try {
            await noticesService.updateNotice(notice.id, {
                title: title.trim(),
                body: body.trim(),
                priority,
                valid_to: validTo || undefined,
                scope,
                role: scope === 'role' ? role : undefined,
                class_id: scope === 'class_section' ? Number(classId) : undefined,
                section_id: scope === 'class_section' && sectionId ? Number(sectionId) : undefined,
                student_id: scope === 'student' ? Number(studentId) : undefined,
            });
            onSaved();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update notice');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-8 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Edit Notice</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Body</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Audience</label>
                        <select
                            value={scope}
                            onChange={(e) => handleScopeChange(e.target.value as NoticeAudienceScope)}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                        >
                            <option value="all">Everyone</option>
                            <option value="role">By Role</option>
                            <option value="class_section">Class/Section</option>
                            <option value="student">Specific Student</option>
                        </select>
                    </div>

                    {scope === 'role' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Which Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            >
                                <option value="">Select a role...</option>
                                {EDIT_NOTICE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                    )}

                    {scope === 'class_section' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Class</label>
                                <select
                                    value={classId}
                                    onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : ''); setSectionId(''); }}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">Select class...</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Section (optional)</label>
                                <select
                                    value={sectionId}
                                    onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')}
                                    disabled={!classId}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                >
                                    <option value="">Whole class</option>
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {scope === 'student' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Which Student</label>
                            <input
                                type="text"
                                value={studentQuery}
                                onChange={(e) => handleStudentSearch(e.target.value)}
                                placeholder="Search student by name or admission no..."
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            />
                            {studentResults.length > 0 && (
                                <div className="mt-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-50">
                                    {studentResults.map(s => (
                                        <button
                                            type="button"
                                            key={s.id}
                                            onClick={() => { setStudentId(s.id); setStudentQuery(`${s.first_name} ${s.last_name}`); setStudentResults([]); }}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                                        >
                                            <span>{s.first_name} {s.last_name}</span>
                                            {s.admission_no && <span className="text-xs text-slate-400">{s.admission_no}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as NoticePriority)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Valid Until</label>
                            <input
                                type="date"
                                value={validTo}
                                onChange={(e) => setValidTo(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-900 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:opacity-95 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const NoticeCard: React.FC<{
    notice: Notice;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
    targetClassName?: string;
    targetSectionName?: string;
    targetStudentName?: string;
}> = ({ notice, canManage, onEdit, onDelete, targetClassName, targetSectionName, targetStudentName }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';

    const priorityColors: Record<NoticePriority, string> = {
        low: 'bg-green-50 text-green-600 border-green-100',
        medium: 'bg-amber-50 text-amber-600 border-amber-100',
        high: 'bg-red-50 text-red-600 border-red-100'
    };

    const PRIORITY_LABEL: Record<string, string> = {
        low: t('communication.priorityLow'),
        medium: t('communication.priorityMedium'),
        high: t('communication.priorityHigh'),
    };

    const scopeIcons: Record<NoticeAudienceScope, React.ReactNode> = {
        all: <Users className="w-5 h-5" />,
        role: <UserCircle className="w-5 h-5" />,
        class_section: <GraduationCap className="w-5 h-5" />,
        student: <User className="w-5 h-5" />
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDay = (dateStr: string) => new Date(dateStr).getDate();
    const getMonthStr = (dateStr: string) => new Date(dateStr).toLocaleString(locale, { month: 'short' });

    return (
        <div className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden">
            <div className={cn(
                "absolute top-0 right-0 px-6 py-4 rounded-bl-[2rem] border-l border-b border-inherit text-[10px] font-black uppercase tracking-widest",
                priorityColors[notice.priority]
            )}>
                {PRIORITY_LABEL[notice.priority] ?? notice.priority} {t('communication.priority')}
            </div>

            <div className="flex gap-8">
                <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-brand/60">{getMonthStr(notice.created_at)}</span>
                    <span className="text-lg font-black text-slate-900">{getDay(notice.created_at)}</span>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                                {scopeIcons[notice.scope]}
                                {notice.scope === 'role' && (notice.role || 'Role')}
                                {notice.scope === 'all' && 'Everyone'}
                                {notice.scope === 'class_section' && (
                                    targetClassName
                                        ? `${targetClassName}${targetSectionName ? ' - ' + targetSectionName : ''}`
                                        : 'Class/Section'
                                )}
                                {notice.scope === 'student' && (targetStudentName || 'Student')}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-brand transition-colors">{notice.title}</h3>
                    </div>

                    <p className="text-slate-600 font-medium leading-relaxed break-words whitespace-pre-wrap">
                        {notice.body}
                    </p>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {t('communication.validThru')} {notice.valid_to ? formatDate(notice.valid_to) : t('communication.noExpiry')}
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                {t('communication.postedBy')}{notice.posted_by_name || `#${notice.posted_by_user_id}`}
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onEdit}
                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-brand rounded-xl transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold transition-all duration-300",
            active
                ? "bg-brand text-white shadow-lg shadow-brand/20 translate-x-1"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
    >
        <div className="flex items-center gap-3">
            <span className={cn(active ? "text-white" : "text-brand")}>{icon}</span>
            <span className="text-sm">{label}</span>
        </div>
        {count !== undefined && (
            <span className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}>
                {count}
            </span>
        )}
    </button>
);

const NoticeSkeleton: React.FC = () => (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm animate-pulse flex gap-8">
        <div className="w-14 h-14 bg-slate-100 rounded-[1.25rem] flex-shrink-0" />
        <div className="flex-1 space-y-4">
            <div className="space-y-2">
                <div className="w-24 h-6 bg-slate-50 rounded-xl" />
                <div className="w-2/3 h-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="space-y-2">
                <div className="w-full h-4 bg-slate-50 rounded-lg" />
                <div className="w-5/6 h-4 bg-slate-50 rounded-lg" />
            </div>
        </div>
    </div>
);

export default CommunicationPage;
