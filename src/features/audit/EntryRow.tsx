import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, EyeOff, History, Monitor } from 'lucide-react';

import { Avatar, Badge } from '../../design-system';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { AuditEntry } from '../../api/services/audit.service';
import { cn } from '../../utils/cn';
import { deviceName } from '../account/device';
import { QUIET_FIELDS, changeLines, eventLabel, fieldLabel, formatValue, recordCount, roleLabel, tableLabel } from './format';

/**
 * One entry of the activity log: who, what, about whom, when. Opening it
 * lists every record the action touched, with the value before and after.
 */
export function EntryRow({ entry, onPerson, onStudent, onRecord }: {
    entry: AuditEntry;
    onPerson?: (id: number, name: string) => void;
    onStudent?: (id: number, name: string) => void;
    /** Open the whole history of one record. */
    onRecord?: (table: string, id: string, label: string) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const [open, setOpen] = useState(false);
    const students = Object.entries(entry.params.students ?? {});
    const shown = students.slice(0, 3);
    const count = recordCount(entry);
    const who = entry.actor_name ?? t('audit.system');
    const device = entry.user_agent ? deviceName(entry.user_agent) : null;
    const more = Object.entries(entry.params.more ?? {});
    const value = (v: unknown) => formatValue(t, v, (iso) => df.date(iso));

    return (
        <li className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
                <Avatar name={who} size={36} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-small text-ink">
                        {entry.actor_user_id && onPerson ? (
                            <button type="button" onClick={() => onPerson(entry.actor_user_id!, who)}
                                className="type-small-semibold text-ink underline-offset-2 outline-none hover:underline focus-visible:underline">{who}</button>
                        ) : <span className="type-small-semibold">{who}</span>}
                        {entry.actor_role && <span className="text-muted"> · {roleLabel(t, entry.actor_role)}</span>}
                    </p>
                    <p className="type-small-medium text-ink">
                        {eventLabel(t, entry.event, entry.label)}
                        {shown.map(([id, name], i) => (
                            <span key={id} className="text-ink-2">{i === 0 ? ' · ' : ', '}
                                {onStudent ? (
                                    <button type="button" onClick={() => onStudent(Number(id), name)}
                                        className="text-ink-2 underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:underline">{name}</button>
                                ) : name}
                            </span>
                        ))}
                        {students.length > 3 && <span className="text-ink-2"> {t('audit.andOthers', { count: students.length - 3 })}</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 type-caption text-muted">
                        <span title={df.dateTime(entry.occurred_at)}>{df.relative(entry.occurred_at)}</span>
                        {entry.ip_address && (
                            <span className="inline-flex items-center gap-1"><Monitor size={12} aria-hidden />
                                {[device?.browser, device?.os].filter(Boolean).join(' · ') || t('audit.unknownDevice')} · {entry.ip_address}
                            </span>
                        )}
                    </p>
                </div>
                {(count > 0 || !!entry.hidden_records) && (
                    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                        className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 type-caption-semibold text-primary-text outline-none hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-focus/60">
                        {t('audit.changes', { count, n: count })}
                        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
                    </button>
                )}
            </div>
            {open && (
                <div className="mt-2.5 ml-12 flex flex-col gap-2">
                    {entry.changes.map((c, i) => {
                        const lines = changeLines(c).filter((l) => !QUIET_FIELDS.has(l.field));
                        return (
                            <div key={i} className="rounded-row border border-line-subtle bg-surface-2 px-3 py-2">
                                <p className="flex flex-wrap items-center gap-2 type-caption-semibold text-ink">
                                    {tableLabel(t, c.table)}{c.id !== null && c.id !== undefined && <span className="text-muted">#{String(c.id)}</span>}
                                    <Badge tone={c.action === 'create' ? 'ok' : c.action === 'delete' ? 'bad' : 'info'}>{t(`audit.action.${c.action}`)}</Badge>
                                    {onRecord && c.id !== null && c.id !== undefined && !Array.isArray(c.id) && (
                                        <button type="button" onClick={() => onRecord(c.table, String(c.id), `${tableLabel(t, c.table)} #${String(c.id)}`)}
                                            className="ml-auto inline-flex items-center gap-1 type-caption-semibold text-primary-text outline-none hover:underline focus-visible:underline">
                                            <History size={12} aria-hidden />{t('audit.recordHistory')}
                                        </button>
                                    )}
                                </p>
                                {lines.length > 0 && (
                                    <dl className="mt-1 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5 type-caption">
                                        {lines.map((l) => (
                                            <div key={l.field} className="contents">
                                                <dt className="text-muted">{fieldLabel(t, l.field)}</dt>
                                                <dd className="min-w-0 break-words text-ink">
                                                    {'before' in l && 'after' in l ? (
                                                        <><span className="text-bad line-through decoration-bad/40">{value(l.before)}</span> → <span className="text-ok">{value(l.after)}</span></>
                                                    ) : 'before' in l ? <span className="text-bad">{value(l.before)}</span> : value(l.after)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </div>
                        );
                    })}
                    {!!entry.hidden_records && (
                        <p className="flex items-center gap-1.5 type-caption text-muted"><EyeOff size={12} aria-hidden />{t('audit.hiddenRecords', { count: entry.hidden_records, n: entry.hidden_records })}</p>
                    )}
                    {more.map(([table, n]) => (
                        <p key={table} className="type-caption text-muted">{t('audit.moreRecords', { count: n, n, table: tableLabel(t, table) })}</p>
                    ))}
                </div>
            )}
        </li>
    );
}
