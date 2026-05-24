import React, { useState } from 'react';
import { X, CheckCircle2, Megaphone, AlertCircle, ChevronDown } from 'lucide-react';
import { noticesService } from '../../api/services/notices.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { NoticeAudienceScope, NoticePriority } from '../../types/notice';

interface CreateNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateNoticeModal: React.FC<CreateNoticeModalProps> = ({ isOpen, onClose, onCreated }) => {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        scope: 'all' as NoticeAudienceScope,
        priority: 'medium' as NoticePriority,
        valid_to: '',
    });

    const handleClose = () => {
        setFormData({ title: '', body: '', scope: 'all', priority: 'medium', valid_to: '' });
        setError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return setError('Title is required');
        if (!formData.body.trim()) return setError('Body is required');

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

            <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
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
                                    onChange={(e) => setFormData({ ...formData, scope: e.target.value as NoticeAudienceScope })}
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
