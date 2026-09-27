import type { TFunction } from 'i18next';

import type { AuditChange, AuditEntry, AuditScope } from '../../api/services/audit.service';

const human = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** An event's name in the reader's language, else the server's English. */
export const eventLabel = (t: TFunction, key: string, fallback?: string) =>
    t(`audit.event.${key}`, { defaultValue: fallback ?? human(key.split('.').pop() ?? key) });

export const categoryLabel = (t: TFunction, key: string, fallback?: string) =>
    t(`audit.category.${key}`, { defaultValue: fallback ?? human(key) });

export const tableLabel = (t: TFunction, table: string) => t(`audit.table.${table}`, { defaultValue: human(table) });

export const fieldLabel = (t: TFunction, field: string) => t(`audit.field.${field}`, { defaultValue: human(field) });

export const scopeLabel = (t: TFunction, scope: AuditScope) => t(`audit.scope.${scope}`);

export const roleLabel = (t: TFunction, role: string | null | undefined) =>
    role ? t(`accessPage.role.${role}`, { defaultValue: human(role) }) : '';

/** Who the entry is about, from the student names saved with it. */
export function aboutLine(t: TFunction, entry: AuditEntry): string {
    const names = Object.values(entry.params.students ?? {});
    if (!names.length) return '';
    if (names.length <= 3) return names.join(', ');
    return t('audit.andMore', { list: names.slice(0, 2).join(', '), count: names.length - 2 });
}

/** For entries that change nothing: the page refused, or the email tried. */
export function detailLine(t: TFunction, entry: AuditEntry): string {
    const p = entry.params as Record<string, unknown>;
    if (typeof p.path === 'string') return `${String(p.method ?? '')} ${p.path}`.trim();
    if (typeof p.email === 'string') {
        return typeof p.count === 'number' ? t('audit.triedTimes', { email: p.email, count: p.count }) : t('audit.triedEmail', { email: p.email });
    }
    return '';
}

/** How many records the entry touched, counting the ones not listed. */
export function recordCount(entry: AuditEntry): number {
    const more = Object.values(entry.params.more ?? {}).reduce((a, b) => a + b, 0);
    return entry.changes.length + more;
}

export type ChangeLine = { field: string; before?: unknown; after?: unknown };

/** The lines an expanded entry shows for one changed record. */
export function changeLines(c: AuditChange): ChangeLine[] {
    return Object.entries(c.fields).map(([field, v]) =>
        c.action === 'update' && Array.isArray(v) && v.length === 2
            ? { field, before: v[0], after: v[1] }
            : c.action === 'delete' ? { field, before: v } : { field, after: v });
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;
/** Housekeeping columns that say nothing a reader needs. */
export const QUIET_FIELDS = new Set(['id', 'created_at', 'updated_at']);

export function formatValue(t: TFunction, value: unknown, date: (iso: string) => string): string {
    if (value === null || value === undefined || value === '') return t('audit.none');
    if (value === true) return t('audit.yes');
    if (value === false) return t('audit.no');
    if (typeof value === 'string' && ISO_DAY.test(value)) return value.length > 10 ? `${date(value.slice(0, 10))} ${value.slice(11, 16)}` : date(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/** Date range presets the log offers; custom is picked with two dates. */
export const PERIODS = ['today', 'week', 'month', 'quarter', 'custom'] as const;
export type Period = (typeof PERIODS)[number];
const DAYS: Record<Exclude<Period, 'custom'>, number> = { today: 0, week: 6, month: 29, quarter: 89 };

export function periodRange(period: Exclude<Period, 'custom'>, today: string): { start: string; end: string } {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - DAYS[period]);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, end: today };
}
