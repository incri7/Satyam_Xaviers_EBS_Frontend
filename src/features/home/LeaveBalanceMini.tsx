import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Umbrella } from 'lucide-react';

import { Button, Card, CardHeader, Meter, Skeleton } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { InlineError } from './parts';
import { useMyLeaveBalance } from './queries';

const KINDS = ['casual', 'sick', 'earned'] as const;

/** Figma C01 "Leave balance": days left of each kind this Nepali year. */
export function LeaveBalanceMini() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const navigate = useNavigate();
    const q = useMyLeaveBalance();
    const b = q.data;
    return (
        <Card className="gap-3">
            <CardHeader title={b ? t('home.leave.title', { year: formatCount(b.year, lang) }) : t('home.leave.titleBare')} subtitle={t('home.leave.sub')}
                action={<Button variant="quiet" size="sm" leftIcon={Umbrella} onClick={() => navigate('/leave')}>{t('home.leave.ask')}</Button>} />
            {q.isError ? <InlineError title={t('home.leave.error')} onRetry={() => void q.refetch()} /> : (
                <div className="grid grid-cols-3 gap-2.5">
                    {KINDS.map((k) => {
                        const left = b?.[`${k}_remaining`] ?? 0;
                        const total = b?.[`${k}_total`] ?? 0;
                        return (
                            <div key={k} className="flex min-w-0 flex-col gap-1 rounded-row border border-line-subtle bg-surface-2 p-3">
                                {!b ? <><Skeleton className="h-6 w-9" /><Skeleton className="h-2.5 w-16" /></> : (
                                    <>
                                        <span className="type-figure-m text-ink">{formatCount(left, lang)}</span>
                                        <span className="type-caption text-muted">{t(`home.leave.of.${k}`, { n: formatCount(total, lang) })}</span>
                                        <Meter value={total ? left / total : 0} tone="info" height={4} label={t(`home.leave.of.${k}`, { n: formatCount(total, lang) })} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
