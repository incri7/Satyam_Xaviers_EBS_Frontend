import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';

import { Banner, Button, Dialog, TextAreaField } from '../../design-system';
import { auditService } from '../../api/services/audit.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { errorText } from '../people/format';

import { BsDateField } from '../../components/common/BsDateField';
/**
 * Activity older than three months opens on request: the person says which
 * dates and why, and admin approves or declines. An approved range stays
 * open to them for two weeks.
 */
export function RequestOlderDialog({ bucketId, bucketName, start, end, windowStart, onClose, onDone }: {
    bucketId: number;
    bucketName: string;
    start: string;
    end: string;
    windowStart: string;
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const queryClient = useQueryClient();
    const [from, setFrom] = useState(start);
    const [to, setTo] = useState(end);
    const [reason, setReason] = useState('');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const datesError = !from || !to || to < from ? t('audit.request.datesInvalid')
        : from >= windowStart ? t('audit.request.notNeeded') : null;
    const reasonError = reason.trim().length < 5 ? t('audit.request.needReason') : null;

    const mutation = useMutation({
        mutationFn: () => auditService.requestOlder({ bucket_id: bucketId, start_date: from, end_date: to, reason: reason.trim() }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit', 'requests'] }); onDone(); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        setTried(true);
        setError(null);
        if (datesError || reasonError) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="sm" icon={History} iconTone="brand"
            title={t('audit.request.title')} subtitle={t('audit.request.sub', { bucket: bucketName, date: df.date(windowStart) })}
            closeLabel={t('common.close')} onSubmit={submit}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                <Button type="submit" loading={busy}>{t('audit.request.send')}</Button>
            </>}>
            {error && <Banner tone="bad" title={t('audit.request.failed')}>{error}</Banner>}
            <div className="grid gap-3 sm:grid-cols-2">
                <BsDateField label={t('audit.from')} value={from} max={windowStart} onChange={(v) => setFrom(v)}
                    error={tried && datesError ? datesError : undefined} />
                <BsDateField label={t('audit.to')} value={to} min={from} onChange={(v) => setTo(v)}
                    />
            </div>
            <TextAreaField label={t('audit.request.reason')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={t('audit.request.reasonHint')} error={tried && reasonError ? reasonError : undefined} />
        </Dialog>
    );
}
