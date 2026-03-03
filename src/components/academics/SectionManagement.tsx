import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '../../api/services/academics.service';
import { Search, Trash2, Layers, Users as UsersIcon, GraduationCap, Edit2 } from 'lucide-react';
import { AccessControl } from '../AccessControl';
import { EditSectionModal } from './EditSectionModal';
import type { Section } from '../../types/academic';

export const SectionManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilterState] = useState<number | null>(() => {
        const saved = localStorage.getItem('academics_section_class_filter');
        return saved ? Number(saved) : null;
    });
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const setClassFilter = (id: number | null) => {
        setClassFilterState(id);
        if (id) localStorage.setItem('academics_section_class_filter', id.toString());
        else localStorage.removeItem('academics_section_class_filter');
    };

    const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
        queryKey: ['sections', searchQuery, classFilter],
        queryFn: () => academicsService.getSections({ search: searchQuery, class_id: classFilter || undefined }),
    });

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const deleteMutation = useMutation({
        mutationFn: academicsService.deleteSection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections'] });
        },
        onError: (err: any) => {
            alert(err.message || 'Failed to delete section');
        }
    });

    const isLoading = sectionsLoading;
    const sections = sectionsData?.sections || [];
    const classes = classesData?.classes || [];

    return (
        <div className="space-y-6">
            <EditSectionModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedSection(null);
                }}
                sectionData={selectedSection}
            />

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-1">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search sections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                        />
                    </div>

                    <select
                        value={classFilter || ''}
                        onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : null)}
                        className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all outline-none cursor-pointer"
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 shrink-0">
                    <span>Active Sections:</span>
                    <span className="text-slate-900">{sectionsData?.total_count || 0}</span>
                </div>
            </div>

            {/* List Table View (Premium Style) */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Section Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Class</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Class Teacher</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                                        </td>
                                    </tr>
                                ))
                            ) : sections.map((section) => (
                                <tr key={section.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                                                {section.name[0]}
                                            </div>
                                            <span className="font-bold text-slate-900">{section.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit">
                                            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-700">
                                                {classes.find(c => c.id === section.class_id)?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <UsersIcon className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-600">{section.capacity} Students</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-medium text-slate-500 italic">
                                            {section.class_teacher_id ? `ID: ${section.class_teacher_id}` : 'Not Assigned'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <AccessControl id="sections_update">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSection(section);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                            </AccessControl>
                                            <AccessControl id="sections_delete">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this section?')) {
                                                            deleteMutation.mutate(section.id);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </AccessControl>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sections.length === 0 && !isLoading && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Layers className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No sections found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Click the add button above to create your first section.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
