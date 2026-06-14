import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { examsService, type MarkEntry } from '../../api/services/exams.service';
import { CheckCircle2, AlertCircle, ChevronDown, Save, Loader2, GraduationCap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

const MarksPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [marksMap, setMarksMap] = useState<Record<number, { obtained: string; is_absent: boolean }>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    const { data: examsData } = useQuery({
        queryKey: ['exams', academicYear],
        queryFn: () => examsService.listExams({ academic_year: academicYear }),
    });

    const { data: classesData } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
    });

    const { data: sectionsData } = useQuery({
        queryKey: ['sections', selectedClassId],
        queryFn: () => academicsService.getSections({ class_id: Number(selectedClassId), limit: 100 }),
        enabled: !!selectedClassId,
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', 'marks', selectedClassId],
        queryFn: () => peopleService.getStudents({ limit: 100 }),
        enabled: !!selectedClassId,
    });

    const students = studentsData?.students || [];

    const { data: existingMarks } = useQuery({
        queryKey: ['marks', selectedExamId, selectedClassId, selectedSectionId, selectedSubjectId],
        queryFn: () => examsService.getMarksForClass(
            Number(selectedExamId),
            Number(selectedClassId),
            {
                section_id: selectedSectionId ? Number(selectedSectionId) : undefined,
                subject_id: selectedSubjectId ? Number(selectedSubjectId) : undefined,
            }
        ),
        enabled: !!(selectedExamId && selectedClassId),
        onSuccess: (data: any) => {
            const map: Record<number, { obtained: string; is_absent: boolean }> = {};
            data.marks.forEach((m: any) => {
                map[m.student_id] = {
                    obtained: m.obtained != null ? String(m.obtained) : '',
                    is_absent: m.is_absent,
                };
            });
            setMarksMap(map);
        },
    } as any);

    const saveMutation = useMutation({
        mutationFn: ({ examId, scheduleId }: { examId: number; scheduleId: number }) => {
            const marks: MarkEntry[] = students.map((s: any) => {
                const entry = marksMap[s.id];
                return {
                    student_id: s.id,
                    obtained: entry?.is_absent ? null : (entry?.obtained ? parseFloat(entry.obtained) : null),
                    is_absent: entry?.is_absent ?? false,
                };
            });
            return examsService.batchSaveMarks(examId, { schedule_id: scheduleId, marks });
        },
        onSuccess: () => {
            setSuccessMessage(t('common.success'));
            setErrorMessage('');
            setTimeout(() => setSuccessMessage(''), 4000);
            queryClient.invalidateQueries({ queryKey: ['marks'] });
        },
        onError: (err: any) => {
            setErrorMessage(err.response?.data?.detail || t('common.error'));
        },
    });

    const scheduleId = (existingMarks as any)?.schedule_id;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{t('marks.title')}</h1>
                            <p className="text-slate-500 text-sm font-medium">{students.length} {t('marks.students')}</p>
                        </div>
                        <button
                            onClick={() => selectedExamId && scheduleId && saveMutation.mutate({ examId: Number(selectedExamId), scheduleId })}
                            disabled={saveMutation.isPending || !selectedExamId || !selectedClassId || !scheduleId}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all disabled:opacity-50"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {t('marks.saveMarks')}
                        </button>
                    </div>

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />{successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />{errorMessage}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Exam dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('marks.exam')}</label>
                            <div className="relative">
                                <select
                                    value={selectedExamId}
                                    onChange={e => { setSelectedExamId(e.target.value); setMarksMap({}); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">{t('marks.selectExam')}</option>
                                    {examsData?.exams.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        {/* Class dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('attendance.class')}</label>
                            <div className="relative">
                                <select
                                    value={selectedClassId}
                                    onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); setMarksMap({}); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20"
                                >
                                    <option value="">{t('attendance.selectClass')}</option>
                                    {classesData?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        {/* Section dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('marks.section')}</label>
                            <div className="relative">
                                <select
                                    value={selectedSectionId}
                                    onChange={e => setSelectedSectionId(e.target.value)}
                                    disabled={!selectedClassId}
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                                >
                                    <option value="">{t('marks.allSections')}</option>
                                    {sectionsData?.sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        {/* Subject ID input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('marks.subjectId')}</label>
                            <input
                                type="number"
                                value={selectedSubjectId}
                                onChange={e => setSelectedSubjectId(e.target.value)}
                                placeholder={t('marks.subjectIdManual')}
                                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>

                    {/* Marks Grid */}
                    {!selectedClassId ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400">{t('marks.selectPrompt')}</p>
                        </div>
                    ) : loadingStudents ? (
                        <div className="grid gap-2">
                            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-[2rem_1fr_auto_8rem_6rem] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                                <span>#</span>
                                <span>{t('marks.student')}</span>
                                <span className="text-right">{t('marks.admissionNo')}</span>
                                <span className="text-right">{t('marks.marksLabel')}</span>
                                <span className="text-center">{t('marks.absent')}</span>
                            </div>
                            {students.map((student: any, index: number) => {
                                const entry = marksMap[student.id] || { obtained: '', is_absent: false };
                                return (
                                    <div
                                        key={student.id}
                                        className={cn(
                                            'grid grid-cols-[2rem_1fr_auto_8rem_6rem] gap-4 items-center px-5 py-3 border-b border-slate-50 last:border-none',
                                            entry.is_absent && 'bg-red-50/30'
                                        )}
                                    >
                                        <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                                        <span className="text-sm font-bold text-slate-900 truncate">
                                            {student.first_name} {student.last_name}
                                        </span>
                                        <span className="text-xs font-medium text-slate-400 text-right">{student.admission_no}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={entry.obtained}
                                            onChange={e => setMarksMap(prev => ({
                                                ...prev,
                                                [student.id]: { ...entry, obtained: e.target.value }
                                            }))}
                                            disabled={entry.is_absent}
                                            placeholder="0.00"
                                            className="px-3 py-1.5 bg-slate-50 rounded-xl text-sm font-bold text-right outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-40 w-full"
                                        />
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => setMarksMap(prev => ({
                                                    ...prev,
                                                    [student.id]: { obtained: '', is_absent: !entry.is_absent }
                                                }))}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                                    entry.is_absent
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'
                                                )}
                                            >
                                                {entry.is_absent ? t('marks.absent') : t('marks.mark')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MarksPage;
