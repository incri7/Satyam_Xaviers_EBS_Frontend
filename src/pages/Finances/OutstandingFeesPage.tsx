import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { financesService, type OutstandingEntry } from '../../api/services/finances.service';
import { academicsService } from '../../api/services/academics.service';
import {
    AlertCircle, CheckCircle2, Loader2, Send, TrendingDown,
    Search, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const RISK_STYLE: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low: 'bg-slate-100 text-slate-600',
};

const PAGE_SIZE = 50;
type Risk = 'High' | 'Medium' | 'Low';

const OutstandingFeesPage: React.FC = () => {
    const { t } = useTranslation();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [risk, setRisk] = useState<Risk | ''>('');
    const [classId, setClassId] = useState<number | ''>('');
    const [page, setPage] = useState(0);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Debounce the search box so typing doesn't fire a request per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(0);
        }, 350);
        return () => clearTimeout(id);
    }, [searchInput]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['finances', 'outstanding', { search, risk, classId, page }],
        queryFn: () => financesService.getOutstanding({
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            ...(search ? { search } : {}),
            ...(risk ? { risk } : {}),
            ...(classId !== '' ? { class_id: classId } : {}),
        }),
        placeholderData: keepPreviousData,
    });

    const { data: classesData } = useQuery({
        queryKey: ['academics', 'classes', 'all'],
        queryFn: () => academicsService.getClasses({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });

    const reminderMutation = useMutation({
        mutationFn: (studentIds?: number[]) => financesService.sendBulkReminders(studentIds),
        onSuccess: (res) => {
            setFeedback(res.message);
            setErrorMsg('');
            setSelectedIds([]);
            setSendingId(null);
            setTimeout(() => setFeedback(''), 5000);
        },
        onError: (err: any) => {
            setErrorMsg(err.response?.data?.detail || t('common.error'));
            setSendingId(null);
        },
    });

    const entries = data?.entries ?? [];
    const totalCount = data?.total_count ?? 0;
    const totalOutstanding = data?.total_outstanding ?? 0;
    // Collected and raised describe the whole school and do not move with the
    // filters — narrowing the arrears list does not change what was banked.
    const totalCollected = data?.total_collected ?? 0;
    const totalRaised = data?.total_raised ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const hasFilters = search !== '' || risk !== '' || classId !== '';

    const pageIds = useMemo(() => entries.map(e => e.student_id), [entries]);
    const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));

    const toggleSelected = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectPage = () => {
        setSelectedIds(prev => allOnPageSelected
            ? prev.filter(id => !pageIds.includes(id))
            : [...prev, ...pageIds.filter(id => !prev.includes(id))]);
    };

    const sendToOne = (id: number) => {
        setSendingId(id);
        reminderMutation.mutate([id]);
    };

    const clearFilters = () => {
        setSearchInput('');
        setRisk('');
        setClassId('');
        setPage(0);
    };

    const riskLabel = (r: string) =>
        r === 'High' ? t('home.accountant.riskHigh')
            : r === 'Medium' ? t('home.accountant.riskMedium')
                : r === 'Low' ? t('home.accountant.riskLow') : r;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Title + totals */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <TrendingDown className="w-6 h-6 text-red-500" />
                                {t('outstanding.title')}
                            </h1>
                            <p className="text-slate-500 text-sm font-medium mt-0.5">
                                {t('outstanding.subtitle', { count: totalCount })}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-5 py-3">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                                    {t('outstanding.collected')}
                                </p>
                                <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                                    Rs {Number(totalCollected).toLocaleString()}
                                </p>
                            </div>

                            <div className="bg-red-50 border-2 border-red-100 rounded-2xl px-5 py-3">
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                                    {hasFilters ? t('outstanding.filteredTotal') : t('home.accountant.totalOutstanding')}
                                </p>
                                <p className="text-2xl font-bold text-red-700 tabular-nums">
                                    Rs {Number(totalOutstanding).toLocaleString()}
                                </p>
                            </div>

                            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {t('outstanding.raised')}
                                </p>
                                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                                    Rs {Number(totalRaised).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={t('outstanding.searchPlaceholder')}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                            />
                        </div>
                        <select
                            value={risk}
                            onChange={(e) => { setRisk(e.target.value as Risk | ''); setPage(0); }}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                        >
                            <option value="">{t('outstanding.allRisks')}</option>
                            <option value="High">{t('home.accountant.riskHigh')}</option>
                            <option value="Medium">{t('home.accountant.riskMedium')}</option>
                            <option value="Low">{t('home.accountant.riskLow')}</option>
                        </select>
                        <select
                            value={classId}
                            onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                        >
                            <option value="">{t('outstanding.allClasses')}</option>
                            {classesData?.classes?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                {t('outstanding.clearFilters')}
                            </button>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <span className="text-sm font-semibold text-slate-500">
                                    {t('outstanding.selectedCount', { count: selectedIds.length })}
                                </span>
                            )}
                            <button
                                onClick={() => reminderMutation.mutate(selectedIds.length > 0 ? selectedIds : undefined)}
                                disabled={reminderMutation.isPending || totalCount === 0}
                                className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold whitespace-nowrap rounded-lg shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
                            >
                                {reminderMutation.isPending && sendingId === null
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Send className="w-4 h-4" />}
                                {selectedIds.length > 0
                                    ? `${t('home.accountant.sendSelected')} (${selectedIds.length})`
                                    : t('home.accountant.sendReminders')}
                            </button>
                        </div>
                    </div>

                    {/* Sending to everyone, not just this page — say so plainly. */}
                    {selectedIds.length === 0 && totalCount > entries.length && (
                        <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {t('outstanding.remindAllWarning', { count: totalCount })}
                        </p>
                    )}

                    {feedback && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            {feedback}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    {/* Table */}
                    <div className={cn(
                        'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-opacity',
                        isFetching && !isLoading && 'opacity-60'
                    )}>
                        {isLoading && (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                            </div>
                        )}

                        {!isLoading && entries.length === 0 && (
                            <div className="py-20 text-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                                <p className="font-bold text-slate-400">
                                    {hasFilters ? t('outstanding.noMatches') : t('home.accountant.allClear')}
                                </p>
                            </div>
                        )}

                        {!isLoading && entries.length > 0 && (
                            <div className="divide-y divide-slate-50">
                                <div className="hidden md:flex items-center gap-3 px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wide bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleSelectPage}
                                        className="w-4 h-4 rounded border-slate-300 shrink-0"
                                        aria-label={t('home.accountant.selectAll')}
                                    />
                                    <div className="grid grid-cols-12 gap-2 flex-1">
                                        <span className="col-span-3">{t('home.accountant.student')}</span>
                                        <span className="col-span-2">{t('outstanding.class')}</span>
                                        <span className="col-span-2 text-right">{t('home.accountant.assigned')}</span>
                                        <span className="col-span-2 text-right">{t('home.accountant.paid')}</span>
                                        <span className="col-span-2 text-right">{t('home.accountant.balance')}</span>
                                        <span className="col-span-1 text-center">{t('home.accountant.risk')}</span>
                                    </div>
                                    <span className="w-8 shrink-0" />
                                </div>

                                {entries.map((entry: OutstandingEntry) => (
                                    <div key={entry.student_id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(entry.student_id)}
                                            onChange={() => toggleSelected(entry.student_id)}
                                            className="w-4 h-4 rounded border-slate-300 shrink-0"
                                            aria-label={`${t('home.accountant.select')} ${entry.student_name}`}
                                        />
                                        <div className="grid grid-cols-12 gap-2 items-center flex-1 min-w-0">
                                            <div className="col-span-12 md:col-span-3 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{entry.student_name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{entry.admission_no}</p>
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
                                                <p className="text-sm font-medium text-slate-600 truncate">{entry.class_name ?? '—'}</p>
                                            </div>
                                            <div className="col-span-6 md:col-span-2 text-right">
                                                <p className="text-sm font-semibold text-slate-600">
                                                    Rs {Number(entry.total_assigned).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="col-span-6 md:col-span-2 text-right">
                                                <p className="text-sm font-semibold text-emerald-600">
                                                    Rs {Number(entry.total_paid).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="col-span-6 md:col-span-2 text-right">
                                                <p className="text-sm font-bold text-red-700">
                                                    Rs {Number(entry.balance).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="col-span-12 md:col-span-1 flex md:justify-center">
                                                <span className={cn(
                                                    'text-xs font-bold px-2.5 py-1 rounded-lg',
                                                    RISK_STYLE[entry.risk] ?? 'bg-slate-100 text-slate-600'
                                                )}>
                                                    {riskLabel(entry.risk)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendToOne(entry.student_id)}
                                            disabled={reminderMutation.isPending}
                                            className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-lg text-brand hover:bg-brand/10 transition-colors disabled:opacity-40"
                                            title={t('home.accountant.sendReminderTo', { name: entry.student_name })}
                                        >
                                            {reminderMutation.isPending && sendingId === entry.student_id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalCount > PAGE_SIZE && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">
                                {t('outstanding.showing', {
                                    from: page * PAGE_SIZE + 1,
                                    to: Math.min((page + 1) * PAGE_SIZE, totalCount),
                                    total: totalCount,
                                })}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    {t('common.previous')}
                                </button>
                                <span className="text-sm font-semibold text-slate-500 px-2">
                                    {page + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => (p + 1 < totalPages ? p + 1 : p))}
                                    disabled={page + 1 >= totalPages}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                >
                                    {t('common.next')}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OutstandingFeesPage;
