import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookMarked, Check, UserCheck, UserX } from 'lucide-react';

import { Avatar, Banner, Button, Checkbox, Dialog, Skeleton, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { errorText } from '../people/format';
import { cn } from '../../utils/cn';

export interface TeacherChoice {
    id: number;
    name: string;
    /** e.g. the subjects they teach. */
    sub?: string;
}

/**
 * Pick one teacher, or none. Used for a section's class teacher and for a
 * subject's teacher; the caller runs the save and passes its state in.
 */
export function PickTeacherDialog({
    open,
    onClose,
    title,
    subtitle,
    choices,
    currentId,
    noneLabel,
    emptyText,
    onPick,
    pending,
    error,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    choices: TeacherChoice[];
    currentId: number | null;
    noneLabel: string;
    emptyText: string;
    onPick: (id: number | null) => void;
    pending: boolean;
    error?: string | null;
    loading?: boolean;
}) {
    const { t } = useTranslation();
    const row = (on: boolean) =>
        cn(
            'flex w-full items-center gap-3 rounded-row border px-3.5 py-2.5 text-left outline-none transition-colors',
            'focus-visible:ring-3 focus-visible:ring-focus/60 disabled:opacity-60',
            on ? 'border-primary bg-primary-soft' : 'border-line-subtle bg-surface hover:bg-surface-2',
        );
    return (
        <Dialog
            open={open}
            onClose={onClose}
            dismissible={!pending}
            size="sm"
            icon={UserCheck}
            title={title}
            subtitle={subtitle}
            closeLabel={t('common.close')}
            footer={<Button variant="quiet" onClick={onClose} disabled={pending}>{t('classesPage.dialog.close')}</Button>}
        >
            {error && <Banner tone="bad" title={t('classesPage.dialog.failed')}>{error}</Banner>}
            <div role="radiogroup" aria-label={title} className="flex flex-col gap-1.5">
                <button type="button" role="radio" aria-checked={currentId === null} disabled={pending} onClick={() => onPick(null)} className={row(currentId === null)}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-muted"><UserX size={16} aria-hidden /></span>
                    <span className="flex-1 type-small-medium text-ink-2">{noneLabel}</span>
                    {currentId === null && <Check size={18} className="shrink-0 text-primary" aria-hidden />}
                </button>
                {loading
                    ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[54px] rounded-row" />)
                    : choices.map((c) => {
                        const on = c.id === currentId;
                        return (
                            <button key={c.id} type="button" role="radio" aria-checked={on} disabled={pending} onClick={() => onPick(c.id)} className={row(on)}>
                                <Avatar name={c.name} size={32} />
                                <span className="flex min-w-0 flex-1 flex-col gap-px">
                                    <span className="truncate type-small-semibold text-ink">{c.name}</span>
                                    {c.sub && <span className="truncate type-caption text-muted">{c.sub}</span>}
                                </span>
                                {on && <Check size={18} className="shrink-0 text-primary" aria-hidden />}
                            </button>
                        );
                    })}
                {!loading && choices.length === 0 && <p className="px-2 py-4 text-center type-small text-muted">{emptyText}</p>}
            </div>
        </Dialog>
    );
}

/**
 * Choose the subjects a class studies; saved together, not one click at a
 * time. Mount it only while open, so it starts from the current subjects.
 */
export function ManageSubjectsDialog({
    open,
    onClose,
    classId,
    className,
    currentIds,
}: {
    open: boolean;
    onClose: () => void;
    classId: number;
    className: string;
    currentIds: number[];
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [picked, setPicked] = useState<Set<number>>(() => new Set(currentIds));
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const subjects = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => academicsService.getSubjects(), enabled: open });
    // A subject the school does not have yet: made here and ticked for this class.
    const create = useMutation({
        mutationFn: () => academicsService.createSubject(newName.trim()),
        onSuccess: (s) => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setPicked((prev) => new Set(prev).add(s.id));
            setNewName('');
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const save = useMutation({
        mutationFn: () => academicsService.setClassSubjects(classId, [...picked]),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects', classId] });
            queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const toggle = (id: number) =>
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            dismissible={!save.isPending}
            size="sm"
            icon={BookMarked}
            title={t('classesPage.dialog.manageTitle', { class: className })}
            subtitle={t('classesPage.dialog.manageSub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                    <Button loading={save.isPending} onClick={() => { setError(null); save.mutate(); }}>
                        {save.isPending ? t('classesPage.dialog.saving') : t('classesPage.dialog.save')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('classesPage.dialog.failed')}>{error}</Banner>}
            <div className="flex flex-col gap-1">
                {subjects.isPending
                    ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 rounded-row" />)
                    : (subjects.data ?? []).map((s) => (
                        <div key={s.id} className={cn('rounded-row px-3.5 py-2.5 transition-colors', picked.has(s.id) ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
                            <Checkbox label={s.name} checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="w-full" />
                        </div>
                    ))}
            </div>
            <form className="flex items-end gap-2 border-t border-line-subtle pt-3" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { setError(null); create.mutate(); } }}>
                <TextField label={t('academicsManage.newSubject')} placeholder={t('academicsManage.newSubjectPlaceholder')} value={newName}
                    onChange={(e) => setNewName(e.target.value)} maxLength={100} containerClassName="flex-1" />
                <Button type="submit" variant="quiet" loading={create.isPending} disabled={!newName.trim()}>{t('academicsManage.add')}</Button>
            </form>
        </Dialog>
    );
}
