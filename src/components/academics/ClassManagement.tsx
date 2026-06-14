import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { Search, Edit2, Trash2, BookOpen, Clock, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccessControl } from '../AccessControl';
import { EditClassModal } from './EditClassModal';
import { useTranslation } from 'react-i18next';
import type { Class } from '../../types/academic';

export const ClassManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['classes', searchQuery],
        queryFn: () => academicsService.getClasses({ search: searchQuery }),
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: academicsService.deleteClass,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete class');
        }
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                ))}
            </div>
        );
    }

    const classes = [...(data?.classes || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
        <div className="space-y-6">
            <EditClassModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedClass(null);
                }}
                classData={selectedClass}
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('academics.searchClasses')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <span>{t('academics.totalClasses')}</span>
                    <span className="text-slate-900">{data?.total_count || 0}</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => (
                    <motion.div
                        key={cls.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-brand/10 rounded-2xl">
                                    <BookOpen className="w-6 h-6 text-brand" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <AccessControl id="classes_update">
                                        <button
                                            onClick={() => {
                                                setSelectedClass(cls);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                    <AccessControl id="classes_delete">
                                        <button
                                            onClick={() => {
                                                if (window.confirm(t('common.confirm') + '?')) {
                                                    deleteMutation.mutate(cls.id);
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AccessControl>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-4">{cls.name}</h3>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                    <Clock className="w-4 h-4" />
                                    <span>{t('academics.created')} {new Date(cls.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                    <Calendar className="w-4 h-4" />
                                    <span>{t('academics.lastUpdated')} {new Date(cls.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 group-hover:bg-brand/5 transition-colors">
                            <button className="text-sm font-bold text-brand hover:underline">
                                {t('academics.viewSections')}
                            </button>
                        </div>
                    </motion.div>
                ))}

                {classes.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <BookOpen className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{t('academics.noClassesFound')}</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">{t('academics.noClassesDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
