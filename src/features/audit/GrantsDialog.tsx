import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserCheck } from 'lucide-react';

import { Banner, Button, Dialog, IconButton, SearchField, SegmentedControl, SelectField } from '../../design-system';
import { auditService, type AuditBucket, type AuditGrant, type AuditScope } from '../../api/services/audit.service';
import { peopleService } from '../../api/services/people.service';
import { errorText } from '../people/format';
import { roleLabel, scopeLabel } from './format';

const ROLES = ['principal', 'coordinator', 'accountant', 'teacher', 'staff', 'parent', 'student'];
const SELF_ONLY = new Set(['parent', 'student']);
const SCOPES: AuditScope[] = ['own_actions', 'own_classes', 'all'];

interface Row extends AuditGrant {
    kind: 'role' | 'person';
    userRole?: string | null;
}

interface UserHit { id: number; email?: string | null; phone?: string | null; role: string; display_name?: string | null }

/**
 * Who may see a bucket: whole roles, or chosen people, each with how widely.
 * Parents and students can only be shown what they did themselves.
 */
export function GrantsDialog({ bucket, onClose, onDone }: { bucket: AuditBucket; onClose: () => void; onDone: () => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [rows, setRows] = useState<Row[]>(() => (bucket.grants ?? []).map((g) => ({ ...g, kind: g.user_id ? 'person' : 'role' })));
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    const users = useQuery({
        queryKey: ['audit', 'grant-users', search],
        queryFn: () => peopleService.getUsers({ search, limit: 8, is_active: true }),
        enabled: search.trim().length >= 2,
    });
    const hits: UserHit[] = (users.data?.users ?? users.data?.items ?? []) as UserHit[];

    const selfOnly = (r: Row) => SELF_ONLY.has((r.kind === 'role' ? r.role : r.userRole) ?? '');
    const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, ...patch };
        return selfOnly(next) ? { ...next, scope: 'own_actions' } : next;
    }));
    const addRole = () => setRows((rs) => [...rs, { kind: 'role', role: 'teacher', user_id: null, scope: 'own_actions' }]);
    const addPerson = (u: UserHit) => {
        setRows((rs) => rs.some((r) => r.user_id === u.id) ? rs
            : [...rs, { kind: 'person', role: null, user_id: u.id, user_name: u.display_name ?? u.email ?? u.phone ?? `#${u.id}`, userRole: u.role, scope: 'own_actions' }]);
        setSearch('');
    };

    const mutation = useMutation({
        mutationFn: () => auditService.setGrants(bucket.id, rows.map((r) => ({
            role: r.kind === 'role' ? r.role : null, user_id: r.kind === 'person' ? r.user_id : null, scope: r.scope,
        }))),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit'] }); onDone(); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="md" icon={UserCheck} iconTone="brand"
            title={t('audit.grants.title', { bucket: bucket.name })} subtitle={t('audit.grants.sub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                <Button loading={busy} onClick={() => { setError(null); mutation.mutate(); }}>{t('audit.grants.save')}</Button>
            </>}>
            {error && <Banner tone="bad" title={t('audit.grants.failed')}>{error}</Banner>}
            {rows.length === 0 && <p className="type-small text-muted">{t('audit.grants.none')}</p>}
            <ul className="flex flex-col gap-2.5">
                {rows.map((r, i) => (
                    <li key={i} className="flex flex-col gap-2 rounded-row border border-line-subtle p-3">
                        <div className="flex items-end gap-2">
                            {r.kind === 'role' ? (
                                <SelectField label={t('audit.grants.role')} value={r.role ?? ''} containerClassName="flex-1"
                                    onChange={(e) => update(i, { role: e.target.value })}
                                    options={ROLES.map((x) => ({ value: x, label: t('audit.grants.everyone', { role: roleLabel(t, x) }) }))} />
                            ) : (
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="type-caption text-muted">{t('audit.grants.person')}</span>
                                    <span className="truncate type-body-semibold text-ink">{r.user_name}</span>
                                    {r.userRole && <span className="type-caption text-muted">{roleLabel(t, r.userRole)}</span>}
                                </div>
                            )}
                            <IconButton icon={Trash2} label={t('audit.grants.remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} />
                        </div>
                        <SegmentedControl size="sm" value={r.scope} aria-label={t('audit.grants.scope')} onChange={(s) => update(i, { scope: s })}
                            options={SCOPES.filter((s) => !selfOnly(r) || s === 'own_actions').map((s) => ({ value: s, label: scopeLabel(t, s) }))} />
                        {selfOnly(r) && <p className="type-caption text-muted">{t('audit.grants.selfOnly')}</p>}
                    </li>
                ))}
            </ul>
            <div className="flex flex-col gap-2 border-t border-line-subtle pt-3">
                <Button variant="quiet" size="sm" leftIcon={Plus} className="w-fit" onClick={addRole}>{t('audit.grants.addRole')}</Button>
                <SearchField value={search} onChange={setSearch} placeholder={t('audit.grants.findPerson')} clearLabel={t('common.clear')} />
                {hits.length > 0 && (
                    <ul className="flex flex-col rounded-row border border-line-subtle">
                        {hits.map((u) => (
                            <li key={u.id}>
                                <button type="button" onClick={() => addPerson(u)}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left outline-none hover:bg-surface-2 focus-visible:bg-surface-2">
                                    <span className="truncate type-small-medium text-ink">{u.display_name ?? u.email ?? u.phone}</span>
                                    <span className="shrink-0 type-caption text-muted">{roleLabel(t, u.role)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Dialog>
    );
}
