import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, Users, UserCircle, GraduationCap, User } from 'lucide-react';
import type { Notice, NoticeAudienceScope, NoticePriority } from '../../types/notice';
import { cn } from '../../utils/cn';
import { useDateFormat } from '../../hooks/useDateFormat';

/**
 * Notices as a register rather than a feed.
 *
 * The card layout gave each notice a full-width block with a date tile, a
 * priority ribbon and the whole body text — fine for three notices, unreadable
 * at forty-eight, where finding one means scrolling past every other. A row
 * prints each label once and lets the eye run down a column.
 *
 * The body is truncated to a single line here on purpose: the table is for
 * finding a notice, and the card view remains for reading one.
 */

const PRIORITY_STYLE: Record<NoticePriority, string> = {
    low: 'bg-emerald-50 text-emerald-600',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-600',
};

const SCOPE_ICON: Record<NoticeAudienceScope, React.ElementType> = {
    all: Users,
    role: UserCircle,
    class_section: GraduationCap,
    student: User,
};

export const NoticeTable: React.FC<{
    notices: Notice[];
    canManage: boolean;
    onEdit: (n: Notice) => void;
    onDelete: (n: Notice) => void;
    classNames: Record<number, string>;
    sectionNames: Record<number, string>;
    studentNames: Record<number, string>;
}> = ({ notices, canManage, onEdit, onDelete, classNames, sectionNames, studentNames }) => {
    const { t } = useTranslation();
    const df = useDateFormat();

    const priorityLabel: Record<string, string> = {
        low: t('communication.priorityLow'),
        medium: t('communication.priorityMedium'),
        high: t('communication.priorityHigh'),
    };

    const audience = (n: Notice) => {
        if (n.scope === 'all') return t('communication.everyone');
        if (n.scope === 'role') return n.role || t('communication.role');
        if (n.scope === 'class_section') {
            const c = n.class_id ? classNames[n.class_id] : undefined;
            const sec = n.section_id ? sectionNames[n.section_id] : undefined;
            return c ? `${c}${sec ? ' ' + sec : ''}` : t('communication.classSection');
        }
        return (n.student_id ? studentNames[n.student_id] : undefined) || t('communication.student');
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {[
                                t('communication.notice'),
                                t('communication.audience'),
                                t('communication.priorityLabel'),
                                t('communication.posted'),
                                t('communication.validThruShort'),
                            ].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                            {canManage && <th className="w-24" aria-hidden="true" />}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {notices.map((n) => {
                            const Icon = SCOPE_ICON[n.scope] ?? Users;
                            return (
                                <tr key={n.id} className="hover:bg-slate-50/70 transition-colors align-top">
                                    <td className="px-4 py-3 max-w-[340px]">
                                        <p className="font-bold text-slate-900 truncate">{n.title}</p>
                                        {n.body && (
                                            <p className="text-xs font-medium text-slate-400 truncate">{n.body}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                            <Icon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                            {audience(n)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg whitespace-nowrap',
                                            PRIORITY_STYLE[n.priority],
                                        )}>
                                            {priorityLabel[n.priority] ?? n.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">
                                        {df.date(n.created_at)}
                                        <span className="block text-[11px] text-slate-400">
                                            {n.posted_by_name || `#${n.posted_by_user_id}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                        {n.valid_to ? (
                                            <span className="text-slate-600">{df.date(n.valid_to)}</span>
                                        ) : (
                                            <span className="text-slate-300">{t('communication.noExpiry')}</span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => onEdit(n)}
                                                aria-label={t('common.edit')}
                                                className="p-2 text-slate-400 hover:text-brand hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(n)}
                                                aria-label={t('common.delete')}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NoticeTable;
