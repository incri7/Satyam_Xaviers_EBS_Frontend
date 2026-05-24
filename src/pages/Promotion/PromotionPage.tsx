import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    academicCalendarService,
    type PromotionDecision,
    type PromotionEvalResponse,
    type PromotionConfirmEntry,
} from '../../api/services/academicCalendar.service';
import { academicsService } from '../../api/services/academics.service';
import { CheckCircle2, AlertTriangle, GraduationCap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const REC_LABEL: Record<string, { label: string; color: string }> = {
    PROMOTE: { label: 'Promote', color: 'text-emerald-700 bg-emerald-50' },
    HOLD_BACK: { label: 'Hold Back', color: 'text-red-700 bg-red-50' },
    REVIEW_REQUIRED: { label: 'Review Required', color: 'text-amber-700 bg-amber-50' },
    GRADUATING: { label: 'Graduating', color: 'text-violet-700 bg-violet-50' },
};

type GroupKey = 'promote' | 'hold_back' | 'review_required' | 'graduating';

const GROUP_META: { key: GroupKey; title: string; desc: string; colorClass: string }[] = [
    { key: 'promote', title: 'Promote', desc: 'Passed attendance and marks — move to next class', colorClass: 'border-emerald-100 bg-emerald-50/30' },
    { key: 'hold_back', title: 'Hold Back', desc: 'Failed both criteria — repeat current class', colorClass: 'border-red-100 bg-red-50/30' },
    { key: 'review_required', title: 'Requires Review', desc: 'Borderline — principal must decide individually', colorClass: 'border-amber-100 bg-amber-50/30' },
    { key: 'graduating', title: 'Graduating (Class 12)', desc: 'Will be marked as graduated', colorClass: 'border-violet-100 bg-violet-50/30' },
];

const PromotionPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [evalResult, setEvalResult] = useState<PromotionEvalResponse | null>(null);
    const [expanded, setExpanded] = useState<Set<GroupKey>>(new Set(['review_required']));
    const [overrides, setOverrides] = useState<Map<number, 'PROMOTE' | 'HOLD_BACK'>>(new Map());
    const [toClassMap, setToClassMap] = useState<Map<number, number>>(new Map());
    const [toYearName, setToYearName] = useState('');
    const [confirmDone, setConfirmDone] = useState(false);
    const [confirmResult, setConfirmResult] = useState<{ enrollments_created: number; graduated: number } | null>(null);

    const { data: currentYear } = useQuery({
        queryKey: ['academic-years', 'current'],
        queryFn: academicCalendarService.getCurrentYear,
        retry: false,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ page: 1, limit: 50 }),
    });

    const evalMutation = useMutation({
        mutationFn: () => academicCalendarService.evaluatePromotion(currentYear!.id),
        onSuccess: (data) => setEvalResult(data),
    });

    const confirmMutation = useMutation({
        mutationFn: (decisions: PromotionConfirmEntry[]) =>
            academicCalendarService.confirmPromotion({
                from_academic_year_id: currentYear!.id,
                to_academic_year_name: toYearName,
                decisions,
            }),
        onSuccess: (data) => {
            setConfirmDone(true);
            setConfirmResult(data);
            queryClient.invalidateQueries({ queryKey: ['academic-years'] });
        },
    });

    const toggleGroup = (key: GroupKey) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const buildDecisions = (): PromotionConfirmEntry[] => {
        if (!evalResult) return [];
        const all: PromotionDecision[] = [
            ...evalResult.promote,
            ...evalResult.hold_back,
            ...evalResult.review_required,
            ...evalResult.graduating,
        ];
        return all.map(d => {
            const override = overrides.get(d.student_id);
            const finalDecision = override ?? d.recommendation;
            const toClass = toClassMap.get(d.student_id) ?? 0;
            return {
                student_id: d.student_id,
                final_decision: finalDecision as PromotionConfirmEntry['final_decision'],
                to_class_id: toClass,
            };
        }).filter(d => d.to_class_id > 0 || d.final_decision === 'GRADUATING');
    };

    const classOptions = classes?.classes ?? [];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Year-End Promotion</h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Evaluate all students and create new-year enrollments in one workflow.
                        </p>
                    </div>

                    {confirmDone && confirmResult ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h2 className="font-bold text-slate-900 text-lg mb-1">Promotion Complete</h2>
                            <p className="text-slate-500 text-sm">
                                {confirmResult.enrollments_created} students enrolled in {toYearName} · {confirmResult.graduated} graduated
                            </p>
                        </div>
                    ) : (
                        <>
                            {!currentYear ? (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-sm text-amber-700 font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    No current academic year set. Create one first in Academic Calendar.
                                </div>
                            ) : !evalResult ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                    <h2 className="font-bold text-slate-900 mb-1">Ready to Evaluate</h2>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Current year: <strong>{currentYear.name}</strong>. Make sure all marks are entered before running.
                                    </p>
                                    <button
                                        onClick={() => evalMutation.mutate()}
                                        disabled={evalMutation.isPending}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                                    >
                                        {evalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                                        Evaluate All Students
                                    </button>
                                    {evalMutation.error && (
                                        <p className="text-sm text-red-600 font-medium mt-3">
                                            {(evalMutation.error as any).response?.data?.detail || 'Evaluation failed.'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Summary */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Promote', count: evalResult.promote.length, color: 'bg-emerald-50 text-emerald-700' },
                                            { label: 'Hold Back', count: evalResult.hold_back.length, color: 'bg-red-50 text-red-700' },
                                            { label: 'Review', count: evalResult.review_required.length, color: 'bg-amber-50 text-amber-700' },
                                            { label: 'Graduating', count: evalResult.graduating.length, color: 'bg-violet-50 text-violet-700' },
                                        ].map(item => (
                                            <div key={item.label} className={`rounded-2xl p-4 text-center ${item.color}`}>
                                                <p className="text-3xl font-black">{item.count}</p>
                                                <p className="text-xs font-bold mt-0.5">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Target year input */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        <label className="text-sm font-bold text-slate-700 block mb-2">Target Academic Year Name</label>
                                        <input
                                            type="text"
                                            value={toYearName}
                                            onChange={e => setToYearName(e.target.value)}
                                            placeholder="2027-28"
                                            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 w-48"
                                        />
                                        <p className="text-xs text-slate-400 mt-1.5">Must match an existing academic year name.</p>
                                    </div>

                                    {/* Groups */}
                                    {GROUP_META.map(({ key, title, desc, colorClass }) => {
                                        const students = evalResult[key];
                                        if (students.length === 0) return null;
                                        const open = expanded.has(key);
                                        return (
                                            <div key={key} className={`rounded-2xl border ${colorClass} overflow-hidden`}>
                                                <button
                                                    onClick={() => toggleGroup(key)}
                                                    className="w-full flex items-center justify-between px-5 py-4"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{title} — {students.length} students</p>
                                                        <p className="text-xs text-slate-500">{desc}</p>
                                                    </div>
                                                    {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                </button>
                                                {open && (
                                                    <div className="divide-y divide-white/50 bg-white">
                                                        {students.map((d: PromotionDecision) => {
                                                            const override = overrides.get(d.student_id);
                                                            const final = override ?? d.recommendation;
                                                            const rec = REC_LABEL[final] ?? REC_LABEL[d.recommendation];
                                                            return (
                                                                <div key={d.student_id} className="px-5 py-3 flex items-center gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-slate-900 truncate">{d.student_name}</p>
                                                                        <div className="flex gap-3 mt-0.5">
                                                                            <span className="text-xs text-slate-400">Attendance: {d.attendance_pct.toFixed(1)}%</span>
                                                                            <span className="text-xs text-slate-400">Marks: {d.marks_pct.toFixed(1)}%</span>
                                                                        </div>
                                                                    </div>
                                                                    {key === 'review_required' && (
                                                                        <select
                                                                            value={override ?? ''}
                                                                            onChange={e => {
                                                                                const val = e.target.value as 'PROMOTE' | 'HOLD_BACK';
                                                                                if (!val) {
                                                                                    const next = new Map(overrides);
                                                                                    next.delete(d.student_id);
                                                                                    setOverrides(next);
                                                                                } else {
                                                                                    setOverrides(new Map(overrides).set(d.student_id, val));
                                                                                }
                                                                            }}
                                                                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                                                                        >
                                                                            <option value="">— Decide —</option>
                                                                            <option value="PROMOTE">Promote</option>
                                                                            <option value="HOLD_BACK">Hold Back</option>
                                                                        </select>
                                                                    )}
                                                                    {final !== 'GRADUATING' && (
                                                                        <select
                                                                            value={toClassMap.get(d.student_id) ?? ''}
                                                                            onChange={e => setToClassMap(new Map(toClassMap).set(d.student_id, Number(e.target.value)))}
                                                                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                                                                        >
                                                                            <option value="">— To class —</option>
                                                                            {classOptions.map((c: any) => (
                                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    )}
                                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${rec.color}`}>{rec.label}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Confirm */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        {confirmMutation.error && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600 font-medium mb-3">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                {(confirmMutation.error as any).response?.data?.detail || 'Confirmation failed.'}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => confirmMutation.mutate(buildDecisions())}
                                            disabled={confirmMutation.isPending || !toYearName || buildDecisions().length === 0}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                                        >
                                            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Confirm All Decisions and Create {toYearName || '…'} Enrollments
                                        </button>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {buildDecisions().length} of {(evalResult.promote.length + evalResult.hold_back.length + evalResult.review_required.length + evalResult.graduating.length)} students have a class assigned.
                                        </p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PromotionPage;
