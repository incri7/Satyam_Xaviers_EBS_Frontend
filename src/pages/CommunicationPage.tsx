import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bell, Search, Plus, Calendar, User,
    MoreVertical, Trash2, Edit2,
    Megaphone, Users, GraduationCap, UserCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/useAuthStore';
import { noticesService } from '../api/services/notices.service';
import { CreateNoticeModal } from '../components/communication/CreateNoticeModal';
import type { Notice, NoticeAudienceScope, NoticePriority } from '../types/notice';

const CommunicationPage: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'my_role'>('all');

    const canCreate = user?.role === 'admin' || user?.role === 'principal';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

    const filteredNotices = notices.filter((n: Notice) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <CreateNoticeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchNotices}
            />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand/10 rounded-3xl flex items-center justify-center text-brand flex-shrink-0">
                        <Megaphone className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('communication.title')}</h1>
                        <p className="text-slate-500 font-medium">{t('communication.subtitle')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder={t('communication.searchNotices')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-brand/5 w-[280px] transition-all outline-none"
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-brand text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
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
                            <button className="w-full bg-white text-brand py-3 rounded-xl font-bold text-xs hover:bg-brand-50 transition-colors">
                                {t('communication.enableNotifications')}
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
                                <NoticeCard key={notice.id} notice={notice} canManage={canCreate} />
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
    );
};

const NoticeCard: React.FC<{ notice: Notice; canManage: boolean }> = ({ notice, canManage }) => {
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
                                {notice.scope === 'role' ? notice.role : notice.scope}
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
                                {t('communication.postedBy')}{notice.posted_by_user_id}
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-brand rounded-xl transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-slate-50 text-slate-400 rounded-xl transition-all">
                                    <MoreVertical className="w-4 h-4" />
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
