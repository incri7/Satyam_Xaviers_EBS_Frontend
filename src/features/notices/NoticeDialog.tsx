import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Megaphone, Pencil } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SegmentedControl, SelectField, TextAreaField, TextField } from '../../design-system';
import { noticesService } from '../../api/services/notices.service';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { StudentPicker } from '../people/StudentPicker';
import { errorText } from '../people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { cn } from '../../utils/cn';
import { isoLocal } from '../../utils/nepaliDate';
import type { Notice, NoticePriority } from '../../types/notice';
import type { Student } from '../../types/people';
import { COMMON_ROLES, OTHER_ROLES, PRIORITIES } from './format';

type Audience = 'all' | (typeof COMMON_ROLES)[number] | 'other' | 'class' | 'student';

function audienceOf(n?: Notice | null): Audience {
    if (!n || n.scope === 'all') return 'all';
    if (n.scope === 'class_section') return 'class';
    if (n.scope === 'student') return 'student';
    return (COMMON_ROLES as readonly string[]).includes(n.role ?? '') ? (n.role as Audience) : 'other';
}

/**
 * Figma H05 "Post notice". One dialog for a new notice, an edit, and
 * "post a copy" (a new notice started from an old one).
 *
 * Adapted: a notice goes to one audience, one class (optionally one section)
 * or one student, as the API holds one target. It shows on the board and in
 * the app; SMS sending is not wired to notices yet. "Send on a date" sets
 * the day it starts showing.
 * Mount with a `key` per notice so the form starts from it.
 */
export function NoticeDialog({ mode, notice, onClose, onSaved }: {
    mode: 'create' | 'edit';
    /** The notice being edited, or the one a copy starts from. */
    notice?: Notice | null;
    onClose: () => void;
    onSaved: (saved: Notice) => void;
}) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const today = isoLocal(new Date());
    const [title, setTitle] = useState(notice?.title ?? '');
    const [body, setBody] = useState(notice?.body ?? '');
    const [audience, setAudience] = useState<Audience>(audienceOf(notice));
    const [otherRole, setOtherRole] = useState(audienceOf(notice) === 'other' ? notice?.role ?? '' : '');
    const [classId, setClassId] = useState(notice?.class_id ? String(notice.class_id) : '');
    const [sectionId, setSectionId] = useState(notice?.section_id ? String(notice.section_id) : '');
    // undefined: still the notice's own student (loaded below); null: none picked.
    const [student, setStudent] = useState<Student | null | undefined>(undefined);
    const [priority, setPriority] = useState<NoticePriority>(notice?.priority ?? 'medium');
    const startsLater = mode === 'edit' && !!notice?.valid_from && notice.valid_from.slice(0, 10) > today;
    const [later, setLater] = useState(startsLater);
    const [from, setFrom] = useState(startsLater ? notice!.valid_from!.slice(0, 10) : '');
    const [until, setUntil] = useState(mode === 'edit' && notice?.valid_to ? notice.valid_to.slice(0, 10) : '');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), staleTime: 5 * 60 * 1000 });
    const sections = useQuery({
        queryKey: ['sections', Number(classId)],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: audience === 'class' && !!classId,
    });
    // An edited or copied notice for one student starts with that student picked.
    const initialStudent = useQuery({
        queryKey: ['students', 'one', notice?.student_id],
        queryFn: () => peopleService.getStudent(notice!.student_id!),
        enabled: !!notice?.student_id && audience === 'student',
        staleTime: Infinity,
    });
    const picked = student === undefined ? initialStudent.data ?? null : student;

    const role = audience === 'other' ? otherRole : (COMMON_ROLES as readonly string[]).includes(audience) ? audience : null;
    const scope = audience === 'all' ? 'all' : audience === 'class' ? 'class_section' : audience === 'student' ? 'student' : 'role';
    const targetOk = scope === 'all' || (scope === 'role' && !!role) || (scope === 'class_section' && !!classId) || (scope === 'student' && !!picked);
    const datesOk = (!later || (!!from && from > today)) && (!until || until >= (later && from ? from : today));

    const mutation = useMutation({
        mutationFn: () => {
            const target = {
                scope,
                role: scope === 'role' ? role : null,
                class_id: scope === 'class_section' ? Number(classId) : null,
                section_id: scope === 'class_section' && sectionId ? Number(sectionId) : null,
                student_id: scope === 'student' ? picked!.id : null,
            } as const;
            const fields = { title: title.trim(), body: body.trim(), priority, valid_from: later ? from : null, valid_to: until || null };
            if (mode === 'edit' && notice) return noticesService.updateNotice(notice.id, { ...fields, ...target });
            return noticesService.createNotice({
                ...fields,
                scope: target.scope,
                role: target.role ?? undefined,
                class_id: target.class_id ?? undefined,
                section_id: target.section_id ?? undefined,
                student_id: target.student_id ?? undefined,
                valid_from: fields.valid_from ?? undefined,
                valid_to: fields.valid_to ?? undefined,
            });
        },
        onSuccess: onSaved,
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!title.trim() || !body.trim() || !targetOk || !datesOk) return;
        mutation.mutate();
    };
    const busy = mutation.isPending;

    const chips: { value: Audience; label: string }[] = [
        { value: 'all', label: t('noticesPage.audience.all') },
        ...COMMON_ROLES.map((r) => ({ value: r as Audience, label: t(`noticesPage.role.${r}`) })),
        { value: 'class', label: t('noticesPage.audience.aClass') },
        { value: 'student', label: t('noticesPage.audience.oneStudent') },
        { value: 'other', label: t('noticesPage.audience.otherRole') },
    ];

    return (
        <Dialog
            open
            onClose={onClose}
            dismissible={!busy}
            size="lg"
            icon={mode === 'edit' ? Pencil : Megaphone}
            title={mode === 'edit' ? t('noticesPage.dialog.editTitle') : t('noticesPage.dialog.title')}
            subtitle={t('noticesPage.dialog.sub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={mode === 'edit' ? undefined : Megaphone} loading={busy} onClick={submit}>
                        {busy ? t('noticesPage.dialog.saving') : mode === 'edit' ? t('classesPage.editEnrol.save') : later ? t('noticesPage.dialog.schedule') : t('noticesPage.dialog.post')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('noticesPage.dialog.failed')}>{error}</Banner>}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-4">
                    <TextField label={t('noticesPage.dialog.titleLabel')} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('noticesPage.dialog.titleHint')} error={tried && !title.trim() ? t('noticesPage.dialog.titleError') : undefined} />
                    <TextAreaField label={t('noticesPage.dialog.message')} rows={5} value={body} onChange={(e) => setBody(e.target.value)}
                        placeholder={t('noticesPage.dialog.messageHint')} error={tried && !body.trim() ? t('noticesPage.dialog.messageError') : undefined} />

                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 type-small-semibold text-ink">{t('noticesPage.dialog.who')}</legend>
                        <div className="flex flex-wrap gap-2">
                            {chips.map((c) => (
                                <button key={c.value} type="button" aria-pressed={audience === c.value} onClick={() => setAudience(c.value)}
                                    className={cn(
                                        'h-9 rounded-full border px-3.5 type-small-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                        audience === c.value ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                                    )}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    {audience === 'other' && (
                        <SelectField label={t('noticesPage.dialog.whichRole')} value={otherRole} placeholder={t('peopleForms.choose')} onChange={(e) => setOtherRole(e.target.value)}
                            error={tried && !otherRole ? t('noticesPage.dialog.roleError') : undefined}
                            options={OTHER_ROLES.map((r) => ({ value: r, label: t(`noticesPage.role.${r}`) }))} />
                    )}
                    {audience === 'class' && (
                        <FormRow>
                            <SelectField label={t('classesPage.enrol.class')} value={classId} placeholder={t('peopleForms.choose')} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                                error={tried && !classId ? t('classesPage.enrol.pickClass') : undefined}
                                options={(classes.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
                            <SelectField label={t('classesPage.enrol.section')} value={sectionId} placeholder={t('noticesPage.dialog.wholeClass')} disabled={!classId}
                                onChange={(e) => setSectionId(e.target.value)} options={(sections.data?.sections ?? []).map((s) => ({ value: s.id, label: s.name }))} />
                        </FormRow>
                    )}
                    {audience === 'student' && (
                        <StudentPicker label={t('noticesPage.audience.oneStudent')} value={picked} onChange={setStudent}
                            error={tried && !picked ? t('classesPage.enrol.pickStudent') : undefined} />
                    )}

                    <div className="flex flex-col gap-2">
                        <p className="type-small-semibold text-ink">{t('noticesPage.dialog.priority')}</p>
                        <SegmentedControl options={PRIORITIES.map((p) => ({ value: p, label: t(`noticesPage.priority.${p}`) }))} value={priority} onChange={setPriority}
                            aria-label={t('noticesPage.dialog.priority')} className="flex w-full [&>*]:flex-1" />
                        <p className="type-caption text-muted">{t(`noticesPage.dialog.priorityHint.${priority}`)}</p>
                    </div>

                    <FormRow>
                        <div className="flex flex-col gap-2">
                            <p className="type-small-semibold text-ink">{t('noticesPage.dialog.send')}</p>
                            <SegmentedControl options={[{ value: 'now', label: t('noticesPage.dialog.now') }, { value: 'later', label: t('noticesPage.dialog.later') }]}
                                value={later ? 'later' : 'now'} onChange={(v) => setLater(v === 'later')} aria-label={t('noticesPage.dialog.send')} className="flex w-full [&>*]:flex-1" />
                        </div>
                        <TextField label={t('noticesPage.dialog.until')} optional={t('peopleForms.optional')} type="date" value={until} min={later && from ? from : today}
                            onChange={(e) => setUntil(e.target.value)} hint={until ? df.date(until) : t('noticesPage.dialog.noEnd')}
                            error={tried && until && until < (later && from ? from : today) ? t('noticesPage.dialog.untilError') : undefined} />
                    </FormRow>
                    {later && (
                        <TextField label={t('noticesPage.dialog.startsOn')} type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value)}
                            hint={from ? df.date(from) : undefined} error={tried && (!from || from <= today) ? t('noticesPage.dialog.fromError') : undefined} />
                    )}
                </div>

                <aside className="flex flex-col gap-2" aria-label={t('noticesPage.dialog.preview')}>
                    <p className="type-small-semibold text-ink">{t('noticesPage.dialog.preview')}</p>
                    <div className="rounded-[22px] bg-inverse p-3">
                        <div className="flex flex-col gap-1 rounded-[14px] bg-surface/95 p-3 shadow-e2">
                            <p className="flex items-center justify-between gap-2 type-micro text-muted">
                                <span className="truncate">{t('noticesPage.dialog.school')}</span>
                                <span>{t('noticesPage.dialog.justNow')}</span>
                            </p>
                            <p className="line-clamp-2 type-small-semibold text-ink">
                                {priority === 'high' && <span className="text-bad">{t('noticesPage.priority.high')}: </span>}
                                {title.trim() || t('noticesPage.dialog.titleHint')}
                            </p>
                            <p className="line-clamp-4 whitespace-pre-line type-caption text-ink-2">{body.trim() || t('noticesPage.dialog.messageHint')}</p>
                        </div>
                    </div>
                    <p className="type-caption text-muted">{t('noticesPage.dialog.previewNote')}</p>
                </aside>
            </div>
        </Dialog>
    );
}
