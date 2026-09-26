import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Megaphone, Plus } from 'lucide-react';

import { Badge, Button, Card, CardHeader, IconTile, Skeleton } from '../../design-system';
import { CreateNoticeModal } from '../../components/communication/CreateNoticeModal';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAuthStore } from '../../store/useAuthStore';
import type { Notice } from '../../types/notice';
import { formatCount } from '../../utils/money';
import { ChartError } from './CardStates';
import { useClasses, useRecentNotices } from './queries';

const LIMIT = 5;

/** Figma B01 "Recent notices": the latest five, who each went to, and when. */
export function RecentNoticesCard() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const titleId = useId();
    const role = useAuthStore((s) => s.user?.role ?? '');
    const canPost = role === 'admin' || role === 'principal';
    const [posting, setPosting] = useState(false);
    const notices = useRecentNotices();
    const classes = useClasses();
    const classNames = new Map((classes.data ?? []).map((c) => [c.id, c.name]));

    const list = (notices.data ?? []).slice(0, LIMIT);
    const empty = notices.isSuccess && list.length === 0;

    const audienceOf = (n: Notice): string => {
        switch (n.scope) {
            case 'all': return t('adminDashboard.notices.everyone');
            case 'role': return n.role ? t(`shell.audience.${n.role}`, { defaultValue: n.role }) : t('adminDashboard.notices.everyone');
            case 'class_section': return (n.class_id && classNames.get(n.class_id)) || t('adminDashboard.notices.oneClass');
            case 'student': return t('adminDashboard.notices.oneStudent');
            default: return t('adminDashboard.notices.everyone');
        }
    };

    return (
        <Card aria-labelledby={titleId} className="gap-1">
            <CardHeader
                titleId={titleId}
                title={t('adminDashboard.notices.title')}
                subtitle={
                    notices.isPending ? t('adminDashboard.loading')
                        : notices.isError ? t('adminDashboard.cardError')
                            : empty ? t('adminDashboard.notices.emptySubtitle')
                                : t('adminDashboard.notices.latest', { count: list.length, n: formatCount(list.length, df.lang) })
                }
                action={
                    notices.isSuccess && !empty && (
                        <Button variant="ghost" size="sm" rightIcon={ArrowRight} onClick={() => navigate('/communication')} className="hidden sm:inline-flex">
                            {t('adminDashboard.notices.all')}
                        </Button>
                    )
                }
            />

            {notices.isPending ? (
                <ul aria-hidden className="mt-2 flex flex-col">
                    {Array.from({ length: 4 }, (_, i) => (
                        <li key={i} className="flex items-center gap-3 border-b border-line-subtle py-[9px] last:border-0">
                            <Skeleton className="size-[34px] shrink-0 rounded-[11px]" />
                            <div className="flex flex-1 flex-col gap-1.5">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-2.5 w-1/3" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : notices.isError ? (
                <ChartError onRetry={() => void notices.refetch()} className="mt-2" />
            ) : empty ? (
                <div className="flex flex-col items-center gap-2 px-2 py-5 text-center">
                    <EmptyIllustration />
                    <p className="mt-1 type-title text-ink">{t('adminDashboard.notices.emptyTitle')}</p>
                    <p className="max-w-[320px] type-small text-muted">{t('adminDashboard.notices.emptyBody')}</p>
                    {canPost && (
                        <Button size="sm" leftIcon={Plus} onClick={() => setPosting(true)} className="mt-1">
                            {t('adminDashboard.quick.postNotice')}
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <ul className="flex flex-col">
                        {list.map((n) => {
                            const urgent = n.priority === 'high';
                            return (
                                <li key={n.id} className="border-b border-line-subtle last:border-0">
                                    <Link
                                        to="/communication"
                                        className="group -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-[9px] outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60"
                                    >
                                        <IconTile icon={Megaphone} tone={urgent ? 'bad' : 'brand'} size={34} />
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate type-small-semibold text-ink group-hover:text-primary-text">{n.title}</span>
                                            <span className="truncate type-caption text-muted">
                                                {t('adminDashboard.notices.meta', { audience: audienceOf(n), time: df.relative(n.created_at) })}
                                            </span>
                                        </span>
                                        {urgent && <Badge tone="bad" dot>{t('adminDashboard.notices.urgent')}</Badge>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <Button variant="quiet" fullWidth rightIcon={ArrowRight} onClick={() => navigate('/communication')} className="mt-2 sm:hidden">
                        {t('adminDashboard.notices.all')}
                    </Button>
                </>
            )}

            {canPost && (
                <CreateNoticeModal
                    isOpen={posting}
                    onClose={() => setPosting(false)}
                    onCreated={() => {
                        setPosting(false);
                        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-notices'] });
                    }}
                />
            )}
        </Card>
    );
}

/** Figma "Illustration/list": a card with three lines and a plus. */
function EmptyIllustration() {
    return (
        <span aria-hidden className="relative grid h-[72px] w-[90px] place-items-center">
            <span className="flex h-[50px] w-[47px] flex-col justify-center gap-1.5 rounded-[12px] border border-primary-soft-line bg-primary-soft px-2.5">
                <span className="h-[5px] w-[26px] rounded-full bg-sx-blue-200" />
                <span className="h-[5px] w-5 rounded-full bg-primary-soft-line" />
                <span className="h-[5px] w-[23px] rounded-full bg-primary-soft-line" />
            </span>
            <span className="absolute right-3 bottom-2 grid size-6 place-items-center rounded-full bg-primary text-white shadow-glow-primary">
                <Plus size={12} strokeWidth={3} />
            </span>
        </span>
    );
}
