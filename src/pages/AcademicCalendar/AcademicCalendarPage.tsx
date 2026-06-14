import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import {
    academicCalendarService,
    type AcademicYear,
    type HolidayEntry,
    type TermSetup,
} from '../../api/services/academicCalendar.service';
import { Calendar, Plus, CheckCircle2, AlertTriangle, Loader2, ChevronRight, Trash2 } from 'lucide-react';

const NEPAL_HOLIDAYS_2026_27: HolidayEntry[] = [
    { date: '2026-10-02', label: 'Dashain (Day 1)' },
    { date: '2026-10-03', label: 'Dashain (Day 2)' },
    { date: '2026-10-04', label: 'Dashain (Day 3)' },
    { date: '2026-10-05', label: 'Dashain (Day 4)' },
    { date: '2026-10-06', label: 'Dashain (Day 5)' },
    { date: '2026-10-07', label: 'Dashain (Day 6)' },
    { date: '2026-10-08', label: 'Dashain (Day 7)' },
    { date: '2026-10-09', label: 'Dashain (Day 8)' },
    { date: '2026-10-10', label: 'Dashain (Day 9)' },
    { date: '2026-10-11', label: 'Dashain (Day 10)' },
    { date: '2026-10-20', label: 'Tihar (Day 1)' },
    { date: '2026-10-21', label: 'Tihar (Day 2)' },
    { date: '2026-10-22', label: 'Tihar / Laxmi Puja' },
    { date: '2026-10-23', label: 'Tihar / Govardhan Puja' },
    { date: '2026-10-24', label: 'Bhai Tika' },
    { date: '2026-12-25', label: 'Christmas Day' },
    { date: '2027-01-11', label: 'Prithvi Jayanti' },
    { date: '2027-02-19', label: 'Democracy Day' },
    { date: '2027-03-08', label: 'International Womens Day' },
    { date: '2027-05-28', label: 'Republic Day' },
];

type Step = 1 | 2 | 3 | 4 | 5;

const AcademicCalendarPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [step, setStep] = useState<Step>(1);

    const [yearName, setYearName] = useState('');
    const [bsYear, setBsYear] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [setCurrent, setSetCurrent] = useState(true);
    const [createdYear, setCreatedYear] = useState<AcademicYear | null>(null);

    const [holidays, setHolidays] = useState<HolidayEntry[]>(NEPAL_HOLIDAYS_2026_27);
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayLabel, setNewHolidayLabel] = useState('');

    const [terms, setTerms] = useState<TermSetup[]>([
        { term_number: 1, name: 'First Term', start_date: '', end_date: '' },
        { term_number: 2, name: 'Second Term', start_date: '', end_date: '' },
    ]);

    const [summary, setSummary] = useState<{ working_days: number; holidays: number; weekends: number; total_days: number } | null>(null);
    const [setupError, setSetupError] = useState('');

    const { data: existingYears } = useQuery({
        queryKey: ['academic-years'],
        queryFn: academicCalendarService.listYears,
    });

    const createYearMutation = useMutation({
        mutationFn: academicCalendarService.createYear,
        onSuccess: (year) => {
            setCreatedYear(year);
            queryClient.invalidateQueries({ queryKey: ['academic-years'] });
            setStep(2);
        },
    });

    const setupMutation = useMutation({
        mutationFn: ({ yearId, body }: { yearId: number; body: Parameters<typeof academicCalendarService.setupDays>[1] }) =>
            academicCalendarService.setupDays(yearId, body),
        onSuccess: (data) => {
            setSummary(data);
            queryClient.invalidateQueries({ queryKey: ['academic-years'] });
            setStep(5);
        },
        onError: (err: any) => setSetupError(err.response?.data?.detail || t('academicCalendar.failedCreate')),
    });

    const handleCreateYear = (e: React.FormEvent) => {
        e.preventDefault();
        if (!yearName || !startDate || !endDate) return;
        createYearMutation.mutate({ name: yearName, bs_year: bsYear || undefined, start_date: startDate, end_date: endDate, is_current: setCurrent });
    };

    const handleAddHoliday = () => {
        if (!newHolidayDate || !newHolidayLabel) return;
        setHolidays(prev => [...prev, { date: newHolidayDate, label: newHolidayLabel }]);
        setNewHolidayDate('');
        setNewHolidayLabel('');
    };

    const handleConfirmSetup = () => {
        if (!createdYear) return;
        setSetupError('');
        setupMutation.mutate({
            yearId: createdYear.id,
            body: {
                weekend_days: [5, 6],
                holidays: holidays.filter(h => h.date >= (createdYear.start_date || '') && h.date <= (createdYear.end_date || '')),
                terms: terms.filter(t => t.start_date && t.end_date),
            },
        });
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('academicCalendar.title')}</h1>
                        <p className="text-slate-500 text-sm mt-0.5">{t('academicCalendar.subtitle')}</p>
                    </div>

                    {existingYears && existingYears.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h2 className="text-sm font-bold text-slate-700 mb-3">{t('academicCalendar.existingYears')}</h2>
                            <div className="space-y-2">
                                {existingYears.map(y => (
                                    <div key={y.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <span className="font-bold text-slate-900 text-sm">{y.name}</span>
                                            {y.bs_year && <span className="text-xs text-slate-400 ml-2">({y.bs_year} BS)</span>}
                                            {y.is_current && (
                                                <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{t('academicCalendar.current')}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {y.working_days_count
                                                ? `${y.working_days_count} ${t('academicCalendar.workingDays')}`
                                                : t('academicCalendar.notSetUp')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                            <React.Fragment key={s}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step === s ? 'bg-brand text-white' :
                                    step > s ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-slate-100 text-slate-400'
                                }`}>
                                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                                </div>
                                {s < 5 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="w-5 h-5 text-brand" />
                                <h2 className="font-bold text-slate-900">{t('academicCalendar.step1Title')}</h2>
                            </div>
                            <form onSubmit={handleCreateYear} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">{t('academicCalendar.yearName')} *</label>
                                        <input
                                            type="text"
                                            value={yearName}
                                            onChange={e => setYearName(e.target.value)}
                                            placeholder="2026-27"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">{t('academicCalendar.bsYear')}</label>
                                        <input
                                            type="text"
                                            value={bsYear}
                                            onChange={e => setBsYear(e.target.value)}
                                            placeholder="2083-84"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">{t('academicCalendar.startDate')} *</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">{t('academicCalendar.endDate')} *</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            required
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={setCurrent}
                                        onChange={e => setSetCurrent(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{t('academicCalendar.setAsCurrent')}</span>
                                </label>
                                {createYearMutation.error && (
                                    <p className="text-sm text-red-600 font-medium">
                                        {(createYearMutation.error as any).response?.data?.detail || t('academicCalendar.failedCreate')}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={createYearMutation.isPending}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                                >
                                    {createYearMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                    {t('academicCalendar.createYear')}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="font-bold text-slate-900 mb-2">{t('academicCalendar.step2Title')}</h2>
                            <p className="text-sm text-slate-500 mb-4">{t('academicCalendar.step2Desc')}</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                                    <span key={d} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg">✓ {d}</span>
                                ))}
                                {['Sat', 'Sun'].map(d => (
                                    <span key={d} className="px-3 py-1.5 bg-slate-100 text-slate-500 font-medium text-sm rounded-lg">Off {d}</span>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep(3)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                                {t('academicCalendar.looksGood')}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="font-bold text-slate-900 mb-1">{t('academicCalendar.step3Title')}</h2>
                            <p className="text-sm text-slate-500 mb-4">{t('academicCalendar.step3Desc')}</p>

                            <div className="space-y-1.5 max-h-64 overflow-y-auto mb-4">
                                {holidays.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                                        <span className="text-sm font-medium text-slate-700">{h.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">{h.date}</span>
                                            <button onClick={() => setHolidays(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="date"
                                    value={newHolidayDate}
                                    onChange={e => setNewHolidayDate(e.target.value)}
                                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <input
                                    type="text"
                                    value={newHolidayLabel}
                                    onChange={e => setNewHolidayLabel(e.target.value)}
                                    placeholder={t('academicCalendar.holidayName')}
                                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <button
                                    onClick={handleAddHoliday}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>

                            <button
                                onClick={() => setStep(4)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                                {t('academicCalendar.nextTerms')}
                            </button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="font-bold text-slate-900 mb-4">{t('academicCalendar.step4Title')}</h2>
                            <div className="space-y-4 mb-4">
                                {terms.map((term, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">{term.name}</label>
                                            <input
                                                type="text"
                                                value={term.name}
                                                onChange={e => setTerms(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">{t('academicCalendar.termStart')}</label>
                                            <input
                                                type="date"
                                                value={term.start_date}
                                                onChange={e => setTerms(prev => prev.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">{t('academicCalendar.termEnd')}</label>
                                            <input
                                                type="date"
                                                value={term.end_date}
                                                onChange={e => setTerms(prev => prev.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {setupError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium mb-3">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {setupError}
                                </div>
                            )}
                            <button
                                onClick={handleConfirmSetup}
                                disabled={setupMutation.isPending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                            >
                                {setupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {t('academicCalendar.confirmActivate')}
                            </button>
                        </div>
                    )}

                    {step === 5 && summary && (
                        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                <h2 className="font-bold text-slate-900">{t('academicCalendar.step5Title')}</h2>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">
                                <strong>{createdYear?.name}</strong> {t('academicCalendar.step5Desc')}
                            </p>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { labelKey: 'academicCalendar.totalDays', value: summary.total_days, color: 'bg-slate-50 text-slate-700' },
                                    { labelKey: 'academicCalendar.workingDaysLabel', value: summary.working_days, color: 'bg-emerald-50 text-emerald-700' },
                                    { labelKey: 'academicCalendar.holidays', value: summary.holidays, color: 'bg-amber-50 text-amber-700' },
                                    { labelKey: 'academicCalendar.weekends', value: summary.weekends, color: 'bg-slate-50 text-slate-600' },
                                ].map(item => (
                                    <div key={item.labelKey} className={`rounded-xl p-3 text-center ${item.color}`}>
                                        <p className="text-2xl font-black">{item.value}</p>
                                        <p className="text-xs font-medium mt-0.5">{t(item.labelKey)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AcademicCalendarPage;
