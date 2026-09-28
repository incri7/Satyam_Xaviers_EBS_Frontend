import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert } from 'lucide-react';

import { Card, CardHeader, Skeleton } from '../../design-system';
import { schoolService, type SetupGap } from '../../api/services/school.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

/** Where each gap is fixed. */
const WHERE: Record<string, string> = {
    calendar: '/academic-calendar',
    classes_without_sections: '/academics',
    classes_without_subjects: '/academics',
    sections_without_teacher: '/academics',
    subjects_without_teacher: '/academics',
    students_not_enrolled: '/academics',
    enrolled_without_sections: '/academics',
    students_without_fees: '/finances',
    fees_not_charged_to_all: '/finances',
    no_exams: '/exams',
    school_phone: '/settings/school',
};

/**
 * What is not set up yet, most serious first: a class nobody can take
 * attendance for, a student who is never charged, a year with no exams.
 * Each line opens the page where it is fixed. Hidden once everything is done.
 */
export function SetupChecklistCard() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const q = useQuery({ queryKey: ['setup-check'], queryFn: schoolService.getSetupCheck, staleTime: 5 * 60 * 1000, retry: false });
    if (q.isError) return null;
    if (q.isPending) return <Skeleton className="h-[120px] rounded-card" />;
    const gaps = q.data;
    if (gaps.length === 0) {
        return (
            <p className="flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 type-small text-ink-2">
                <CheckCircle2 size={18} className="text-ok" aria-hidden />{t('setupCheck.allDone')}
            </p>
        );
    }
    return (
        <Card className="gap-1.5">
            <CardHeader title={t('setupCheck.title')} subtitle={t('setupCheck.sub', { count: gaps.length, n: formatCount(gaps.length, lang) })} />
            <ul className="flex flex-col divide-y divide-line-subtle">
                {gaps.map((g: SetupGap) => {
                    const block = g.severity === 'block';
                    const Icon = block ? CircleAlert : AlertTriangle;
                    return (
                        <li key={g.key}>
                            <button type="button" onClick={() => navigate(WHERE[g.key] ?? '/dashboard')}
                                className="flex w-full items-center gap-3 py-2.5 text-left outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                                <Icon size={18} className={cn('shrink-0', block ? 'text-bad' : 'text-warn')} aria-hidden />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="type-small-semibold text-ink">{t(`setupCheck.gap.${g.key}`, { count: g.count, n: formatCount(g.count, lang) })}</span>
                                    {g.examples.length > 0 && (
                                        <span className="truncate type-caption text-muted">
                                            {g.examples.join(', ')}{g.count > g.examples.length ? `, ${t('setupCheck.more', { n: formatCount(g.count - g.examples.length, lang) })}` : ''}
                                        </span>
                                    )}
                                </span>
                                <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
