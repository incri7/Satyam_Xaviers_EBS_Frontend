import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileBarChart2, Megaphone, Umbrella, UserPlus, type LucideIcon } from 'lucide-react';

import { CountPill, IconTile, type IconTileTone } from '../../design-system';
import { CreateNoticeModal } from '../../components/communication/CreateNoticeModal';
import { PermissionGate } from '../../components/PermissionGate';
import { usePendingLeaveCount } from '../shell/usePendingLeaveCount';
import { useAuthStore } from '../../store/useAuthStore';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';
import { cn } from '../../utils/cn';

/** Roles that decide leave and post notices (RoleRoute / CommunicationPage). */
const MANAGERS = ['admin', 'principal'];

/**
 * Figma B01 "Quick actions". Each action is hidden, never disabled, when the
 * person cannot use it.
 */
export function QuickActions() {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const role = useAuthStore((s) => s.user?.role ?? '');
    const queryClient = useQueryClient();
    const { count: pending } = usePendingLeaveCount();
    const [noticeOpen, setNoticeOpen] = useState(false);
    const isManager = MANAGERS.includes(role);

    return (
        <section aria-labelledby="quick-actions-title" className="flex flex-col gap-2.5">
            <h2 id="quick-actions-title" className="type-title text-ink">{t('adminDashboard.quick.title')}</h2>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:gap-3.5">
                {isManager && (
                    <Action
                        to="/leave-approvals"
                        icon={Umbrella}
                        tone="brand"
                        title={t('adminDashboard.quick.reviewLeave')}
                        count={<CountPill count={pending} label={t('shell.leaveWaiting', { count: pending, n: formatCount(pending, lang) })} />}
                        sub={pending > 0
                            ? t('adminDashboard.quick.leaveWaiting', { count: pending, n: formatCount(pending, lang) })
                            : t('adminDashboard.quick.leaveNone')}
                    />
                )}
                {isManager && (
                    <Action
                        onClick={() => setNoticeOpen(true)}
                        icon={Megaphone}
                        tone="info"
                        title={t('adminDashboard.quick.postNotice')}
                        sub={t('adminDashboard.quick.postNoticeSub')}
                    />
                )}
                <PermissionGate permissions={[{ resource: 'finances', action: 'read' }]}>
                    <Action
                        to="/finances/outstanding"
                        icon={FileBarChart2}
                        tone="ok"
                        title={t('adminDashboard.quick.feeReports')}
                        sub={t('adminDashboard.quick.feeReportsSub')}
                    />
                </PermissionGate>
                <PermissionGate permissions={[{ resource: 'students', action: 'create' }]}>
                    <Action
                        to="/people"
                        onNavigate={() => { try { localStorage.setItem('people_active_tab', 'students'); } catch { /* default tab */ } }}
                        icon={UserPlus}
                        tone="warn"
                        title={t('adminDashboard.quick.addStudents')}
                        sub={t('adminDashboard.quick.addStudentsSub')}
                    />
                </PermissionGate>
            </div>

            <CreateNoticeModal
                isOpen={noticeOpen}
                onClose={() => setNoticeOpen(false)}
                onCreated={() => {
                    setNoticeOpen(false);
                    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-notices'] });
                }}
            />
        </section>
    );
}

interface ActionProps {
    icon: LucideIcon;
    tone: IconTileTone;
    title: string;
    sub: string;
    count?: ReactNode;
    to?: string;
    onNavigate?: () => void;
    onClick?: () => void;
}

/**
 * Figma "Action/…". Laptop: a row (tile, title and context, chevron).
 * Phone: a small tile card, the icon above the words.
 */
function Action({ icon, tone, title, sub, count, to, onNavigate, onClick }: ActionProps) {
    const body = (
        <>
            <IconTile icon={icon} tone={tone} size={36} className="lg:hidden" />
            <IconTile icon={icon} tone={tone} size={40} className="hidden lg:inline-grid" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate type-body-semibold text-ink">{title}</span>
                    {count}
                </span>
                <span className="type-caption text-muted lg:truncate">{sub}</span>
            </span>
            <ChevronRight size={18} className="hidden shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 lg:block" aria-hidden />
        </>
    );
    const className = cn(
        'group flex min-w-0 flex-col items-start gap-2.5 rounded-card border border-line bg-surface p-3.5 text-left shadow-e1 outline-none',
        'transition-[box-shadow,border-color] duration-200 ease-sx hover:border-primary-soft-line hover:shadow-e2 focus-visible:ring-3 focus-visible:ring-focus/60',
        'lg:min-h-[70px] lg:flex-row lg:items-center lg:gap-3 lg:px-4',
    );

    return to ? (
        <Link to={to} onClick={onNavigate} className={className}>{body}</Link>
    ) : (
        <button type="button" onClick={onClick} className={className}>{body}</button>
    );
}
