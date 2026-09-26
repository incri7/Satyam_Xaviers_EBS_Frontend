import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layers, ShieldAlert } from 'lucide-react';

import { Badge, Banner, Button, Checkbox, Dialog, SearchField, TextAreaField, TextField } from '../../design-system';
import { auditService, type AuditBucket, type AuditCatalogue } from '../../api/services/audit.service';
import { errorText } from '../people/format';
import { categoryLabel, eventLabel } from './format';

/** Create or edit a bucket: its name, and the events it gathers, by category. */
export function BucketDialog({ bucket, catalogue, onClose, onDone }: {
    bucket: AuditBucket | null;
    catalogue: AuditCatalogue;
    onClose: () => void;
    onDone: (b: AuditBucket) => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState(bucket?.name ?? '');
    const [description, setDescription] = useState(bucket?.description ?? '');
    const [events, setEvents] = useState<Set<string>>(() => new Set(bucket?.events ?? []));
    const [search, setSearch] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const groups = useMemo(() => {
        const q = search.trim().toLowerCase();
        return catalogue.categories.map((c) => ({
            ...c,
            events: catalogue.events.filter((e) => e.category === c.key
                && (!q || eventLabel(t, e.key, e.label).toLowerCase().includes(q) || e.key.includes(q))),
        })).filter((g) => g.events.length);
    }, [catalogue, search, t]);

    const toggle = (keys: string[], on: boolean) => setEvents((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
        return next;
    });

    const nameError = name.trim().length < 2 ? t('audit.bucketEdit.needName') : null;
    const eventsError = events.size === 0 ? t('audit.bucketEdit.needEvents') : null;
    const mutation = useMutation({
        mutationFn: () => {
            const body = { name: name.trim(), description: description.trim() || null, events: [...events] };
            return bucket ? auditService.updateBucket(bucket.id, body) : auditService.createBucket(body);
        },
        onSuccess: (b) => { queryClient.invalidateQueries({ queryKey: ['audit'] }); onDone(b); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        setTried(true);
        setError(null);
        if (nameError || eventsError) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="lg" icon={Layers} iconTone="brand"
            title={bucket ? t('audit.bucketEdit.editTitle') : t('audit.bucketEdit.newTitle')} subtitle={t('audit.bucketEdit.sub')}
            closeLabel={t('common.close')} onSubmit={submit}
            footer={<>
                <span className="mr-auto type-small text-muted">{t('audit.eventCount', { count: events.size, n: events.size })}</span>
                <Button variant="quiet" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                <Button type="submit" loading={busy}>{t('audit.bucketEdit.save')}</Button>
            </>}>
            {error && <Banner tone="bad" title={t('audit.bucketEdit.failed')}>{error}</Banner>}
            <div className="grid gap-3 sm:grid-cols-2">
                <TextField label={t('audit.bucketEdit.name')} value={name} maxLength={100} onChange={(e) => setName(e.target.value)}
                    placeholder={t('audit.bucketEdit.namePlaceholder')} error={tried && nameError ? nameError : undefined} />
                <TextAreaField label={t('audit.bucketEdit.description')} rows={1} value={description} maxLength={500}
                    onChange={(e) => setDescription(e.target.value)} optional={t('peopleForms.optional')} />
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="type-small-semibold text-ink">{t('audit.bucketEdit.events')}</p>
                    <SearchField value={search} onChange={setSearch} placeholder={t('audit.bucketEdit.search')} clearLabel={t('common.clear')} containerClassName="sm:w-[240px]" />
                </div>
                {tried && eventsError && <p className="type-caption text-bad">{eventsError}</p>}
                <div className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto rounded-row border border-line-subtle p-3">
                    {groups.map((g) => {
                        const keys = g.events.map((e) => e.key);
                        const all = keys.every((k) => events.has(k));
                        return (
                            <fieldset key={g.key} className="flex flex-col gap-1.5">
                                <legend className="mb-1 flex w-full items-center justify-between gap-2">
                                    <span className="type-caption-semibold uppercase tracking-wide text-muted">{categoryLabel(t, g.key, g.label)}</span>
                                    <button type="button" onClick={() => toggle(keys, !all)} className="type-caption-semibold text-primary-text hover:underline">
                                        {all ? t('audit.bucketEdit.none') : t('audit.bucketEdit.all')}
                                    </button>
                                </legend>
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                    {g.events.map((e) => (
                                        <Checkbox key={e.key} checked={events.has(e.key)} onChange={(ev) => toggle([e.key], ev.target.checked)}
                                            label={<span className="flex flex-wrap items-center gap-1.5">
                                                {eventLabel(t, e.key, e.label)}
                                                {e.sensitivity === 'admin' && <Badge tone="warn"><ShieldAlert size={11} aria-hidden />{t('audit.adminOnly')}</Badge>}
                                            </span>} />
                                    ))}
                                </div>
                            </fieldset>
                        );
                    })}
                </div>
                <p className="type-caption text-muted">{t('audit.bucketEdit.adminOnlyNote')}</p>
            </div>
        </Dialog>
    );
}
