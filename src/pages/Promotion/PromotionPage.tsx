import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

type GroupKey = 'promote' | 'hold_back' | 'review_required' | 'graduating';

const PromotionPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [evalResult, setEvalResult] = useState<PromotionEvalResponse | null>(null);
    const [expanded, setExpanded] = useState<Set<GroupKey>>(new Set(['review_required']));
    const [overrides, setOverrides] = useState<Map<number, 'PROMOTE' | 'HOLD_BACK'>>(new Map());
    const [toClassMap, setToClassMap] = useState<Map<number, number>>(new Map());
    const [toYearName, setToYearName] = useState('');
    const [confirmDone, setConfirmDone] = useState(false);
    const [confirmResult, setConfirmResult] = useState<{ enrollments_created: number; graduated: number } | null>(null);

    const REC_LABEL: Record<string, { label: string; color: string }> = {
        PROMOTE: { label: t('promotion.promote'), color: 'text-emerald-700 bg-emerald-50' },
        HOLD_BACK: { label: t('promotion.holdBack'), color: 'text-red-700 bg-red-50' },
        REVIEW_REQUIRED: { label: t('promotion.requiresReview'), color: 'text-amber-700 bg-amber-50' },
        GRADUATING: { label: t('promotion.graduating'), color: 'text-violet-700 bg-violet-50' },
    };

    const GROUP_META: { key: GroupKey; titleKey: string; descKey: string; colorClass: string }[] = [
        { key: 'promote', titleKey: 'promotion.promote', descKey: 'promotion.groupPromoteDesc', colorClass: 'border-emerald-100 bg-emerald-50/30' },
        { key: 'hold_back', titleKey: 'promotion.holdBack', descKey: 'promotion.groupHoldDesc', colorClass: 'border-red-100 bg-red-50/30' },
        { key: 'review_required', titleKey: 'promotion.requiresReview', descKey: 'promotion.groupReviewDesc', colorClass: 'border-amber-100 bg-amber-50/30' },
        { key: 'graduating', titleKey: 'promotion.graduatingClass', descKey: 'promotion.groupGradDesc', colorClass: 'border-violet-100 bg-violet-50/30' },
    ];

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
                        <h1 className="text-2xl font-bold text-slate-900">{t('promotion.title')}</h1>
                        <p className="text-slate-500 text-sm mt-0.5">{t('promotion.subtitle')}</p>
                    </div>

                    {confirmDone && confirmResult ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h2 className="font-bold text-slate-900 text-lg mb-1">{t('promotion.complete')}</h2>
                            <p className="text-slate-500 text-sm">
                                {confirmResult.enrollments_created} {t('promotion.enrolledIn')} {toYearName} · {confirmResult.graduated} {t('promotion.graduated')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {!currentYear ? (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-sm text-amber-700 font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {t('promotion.noYear')}
                                </div>
                            ) : !evalResult ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                    <h2 className="font-bold text-slate-900 mb-1">{t('promotion.readyTitle')}</h2>
                                    <p className="text-sm text-slate-500 mb-4">
                                        {t('promotion.readyDesc')} <strong>{currentYear.name}</strong>. {t('promotion.readyNote')}
                                    </p>
                                    <button
                                        onClick={() => evalMutation.mutate()}
                                        disabled={evalMutation.isPending}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                                    >
                                        {evalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                                        {t('promotion.evaluate')}
                                    </button>
                                    {evalMutation.error && (
                                        <p className="text-sm text-red-600 font-medium mt-3">
                                            {(evalMutation.error as any).response?.data?.detail || t('promotion.evalFailed')}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { labelKey: 'promotion.promote', count: evalResult.promote.length, color: 'bg-emerald-50 text-emerald-700' },
                                            { labelKey: 'promotion.holdBack', count: evalResult.hold_back.length, color: 'bg-red-50 text-red-700' },
                                            { labelKey: 'promotion.review', count: evalResult.review_required.length, color: 'bg-amber-50 text-amber-700' },
                                            { labelKey: 'promotion.graduating', count: evalResult.graduating.length, color: 'bg-violet-50 text-violet-700' },
                                        ].map(item => (
                                            <div key={item.labelKey} className={`rounded-2xl p-4 text-center ${item.color}`}>
                                                <p className="text-3xl font-black">{item.count}</p>
                                                <p className="text-xs font-bold mt-0.5">{t(item.labelKey)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        <label className="text-sm font-bold text-slate-700 block mb-2">{t('promotion.targetYear')}</label>
                                        <input
                                            type="text"
                                            value={toYearName}
                                            onChange={e => setToYearName(e.target.value)}
                                            placeholder="2027-28"
                                            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 w-48"
                                        />
                                        <p className="text-xs text-slate-400 mt-1.5">{t('promotion.targetYearNote')}</p>
                                    </div>

                                    {GROUP_META.map(({ key, titleKey, descKey, colorClass }) => {
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
                                                        <p className="font-bold text-slate-900 text-sm">{t(titleKey)} — {students.length} {t('promotion.students')}</p>
                                                        <p className="text-xs text-slate-500">{t(descKey)}</p>
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
                                                                            <span className="text-xs text-slate-400">{t('promotion.attendanceLabel')} {d.attendance_pct.toFixed(1)}%</span>
                                                                            <span className="text-xs text-slate-400">{t('promotion.marksLabel')} {d.marks_pct.toFixed(1)}%</span>
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
                                                                            <option value="">{t('promotion.decide')}</option>
                                                                            <option value="PROMOTE">{t('promotion.promote')}</option>
                                                                            <option value="HOLD_BACK">{t('promotion.holdBack')}</option>
                                                                        </select>
                                                                    )}
                                                                    {final !== 'GRADUATING' && (
                                                                        <select
                                                                            value={toClassMap.get(d.student_id) ?? ''}
                                                                            onChange={e => setToClassMap(new Map(toClassMap).set(d.student_id, Number(e.target.value)))}
                                                                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                                                                        >
                                                                            <option value="">{t('promotion.toClass')}</option>
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

                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                        {confirmMutation.error && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600 font-medium mb-3">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                {(confirmMutation.error as any).response?.data?.detail || t('promotion.confirmFailed')}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => confirmMutation.mutate(buildDecisions())}
                                            disabled={confirmMutation.isPending || !toYearName || buildDecisions().length === 0}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                                        >
                                            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {t('promotion.confirmBtn')} {toYearName || '…'} {t('promotion.confirmEnrollments')}
                                        </button>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {buildDecisions().length} {t('promotion.studentsAssigned')} {(evalResult.promote.length + evalResult.hold_back.length + evalResult.review_required.length + evalResult.graduating.length)} {t('promotion.studentsHaveClass')}
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
