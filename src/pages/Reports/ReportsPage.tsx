import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { academicCalendarService, type AttendanceStudentRow } from '../../api/services/academicCalendar.service';
import { academicsService } from '../../api/services/academics.service';
import { BarChart2, Users, TrendingDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type ReportTab = 'attendance' | 'fees';

const ReportsPage: React.FC = () => {
    const [tab, setTab] = useState<ReportTab>('attendance');
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

    const { data: currentYear } = useQuery({
        queryKey: ['academic-years', 'current'],
        queryFn: academicCalendarService.getCurrentYear,
        retry: false,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: () => academicsService.getClasses({ page: 1, limit: 50 }),
    });

    const { data: schoolAttendance, isLoading: loadingSchool } = useQuery({
        queryKey: ['reports', 'attendance', 'school', currentYear?.id],
        queryFn: () => academicCalendarService.reportAttendanceSchool(currentYear!.id),
        enabled: !!currentYear && tab === 'attendance' && !selectedClassId,
    });

    const { data: classAttendance, isLoading: loadingClass } = useQuery({
        queryKey: ['reports', 'attendance', 'class', selectedClassId, currentYear?.id],
        queryFn: () => academicCalendarService.reportAttendanceClass(selectedClassId!, currentYear!.id),
        enabled: !!currentYear && !!selectedClassId && tab === 'attendance',
    });


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                        {currentYear ? (
                            <p className="text-slate-500 text-sm mt-0.5">Academic Year: {currentYear.name} · {currentYear.working_days_count ?? '—'} working days</p>
                        ) : (
                            <p className="text-amber-600 text-sm mt-0.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                No current academic year set — attendance % will not be available.
                            </p>
                        )}
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
                        {([
                            { key: 'attendance', label: 'Attendance', icon: Users },
                            { key: 'fees', label: 'Fees', icon: TrendingDown },
                        ] as { key: ReportTab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                                    tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Attendance tab */}
                    {tab === 'attendance' && (
                        <div className="space-y-4">
                            {/* Class selector */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={() => setSelectedClassId(null)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-sm font-bold transition-all',
                                        !selectedClassId ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    All Classes
                                </button>
                                {classes?.classes?.map((c: any) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedClassId(c.id)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-xl text-sm font-bold transition-all',
                                            selectedClassId === c.id ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>

                            {!currentYear && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-sm text-amber-700 font-medium">
                                    Set up an academic calendar first to see attendance reports with correct working-day calculations.
                                </div>
                            )}

                            {/* School-wide view */}
                            {currentYear && !selectedClassId && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4 text-brand" />
                                        <h2 className="font-bold text-slate-900 text-sm">School-Wide Attendance</h2>
                                    </div>
                                    {loadingSchool ? (
                                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            <div className="grid grid-cols-4 gap-2 px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide bg-slate-50">
                                                <span className="col-span-2">Class</span>
                                                <span className="text-right">Students</span>
                                                <span className="text-right">Avg Attendance</span>
                                            </div>
                                            {schoolAttendance?.map(row => (
                                                <button
                                                    key={row.class_id}
                                                    onClick={() => setSelectedClassId(row.class_id)}
                                                    className="w-full grid grid-cols-4 gap-2 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors text-left"
                                                >
                                                    <span className="col-span-2 font-bold text-slate-900 text-sm flex items-center gap-2">
                                                        {row.class_name}
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                                    </span>
                                                    <span className="text-right text-sm text-slate-600 font-medium">{row.total_students}</span>
                                                    <span className={cn(
                                                        'text-right text-sm font-bold',
                                                        row.avg_attendance_pct == null ? 'text-slate-300' :
                                                        row.avg_attendance_pct < 75 ? 'text-red-600' :
                                                        row.avg_attendance_pct < 85 ? 'text-amber-600' :
                                                        'text-emerald-600'
                                                    )}>
                                                        {row.avg_attendance_pct != null ? `${row.avg_attendance_pct}%` : '—'}
                                                    </span>
                                                </button>
                                            ))}
                                            {(!schoolAttendance || schoolAttendance.length === 0) && (
                                                <div className="py-12 text-center text-slate-400 text-sm font-medium">No attendance data yet</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Per-class detail */}
                            {currentYear && selectedClassId && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4 text-brand" />
                                        <h2 className="font-bold text-slate-900 text-sm">
                                            {classes?.classes?.find((c: any) => c.id === selectedClassId)?.name ?? 'Class'} — Student Attendance
                                        </h2>
                                    </div>
                                    {loadingClass ? (
                                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide bg-slate-50">
                                                <span className="col-span-5">Student</span>
                                                <span className="col-span-2 text-right">Present</span>
                                                <span className="col-span-2 text-right">Working Days</span>
                                                <span className="col-span-3 text-right">Attendance %</span>
                                            </div>
                                            {classAttendance?.map((row: AttendanceStudentRow) => (
                                                <div key={row.student_id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <p className="font-bold text-slate-900 text-sm">{row.student_name}</p>
                                                        <p className="text-xs text-slate-400">{row.admission_no}</p>
                                                    </div>
                                                    <span className="col-span-4 md:col-span-2 text-right text-sm font-medium text-slate-700">{row.days_present}</span>
                                                    <span className="col-span-4 md:col-span-2 text-right text-sm font-medium text-slate-500">{row.working_days}</span>
                                                    <span className={cn(
                                                        'col-span-4 md:col-span-3 text-right text-sm font-bold',
                                                        row.attendance_pct == null ? 'text-slate-300' :
                                                        row.attendance_pct < 75 ? 'text-red-600' :
                                                        row.attendance_pct < 85 ? 'text-amber-600' :
                                                        'text-emerald-600'
                                                    )}>
                                                        {row.attendance_pct != null ? `${row.attendance_pct}%` : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                            {(!classAttendance || classAttendance.length === 0) && (
                                                <div className="py-12 text-center text-slate-400 text-sm font-medium">No attendance data for this class</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fees tab */}
                    {tab === 'fees' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                            <TrendingDown className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-400 text-sm">Fee reports are available from the Finances page.</p>
                            <p className="text-xs text-slate-400 mt-1">Outstanding balances and monthly collection reports live in Finances → Reports.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportsPage;
