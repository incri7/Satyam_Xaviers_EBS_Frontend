import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SelectField, TextAreaField, TextField } from '../../design-system';
import { assignmentsService } from '../../api/services/assignments.service';
import { academicsService } from '../../api/services/academics.service';
import { useAuthStore } from '../../store/useAuthStore';
import { isoLocal } from '../../utils/nepaliDate';
import { errorText } from '../people/format';

import { BsDateField } from '../../components/common/BsDateField';
/**
 * Figma H06 "New assignment": what to do, for which class and subject, and
 * when it is due. Teachers pick only among the classes and subjects they
 * teach and are the assignment's teacher; admin and principal choose one.
 *
 * Adapted: the API has no full marks, attachments or "notify students"
 * option, so those Figma fields are left out.
 */
export function NewAssignmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const isTeacher = useAuthStore((s) => s.user?.role) === 'teacher';
    const [form, setForm] = useState({ title: '', description: '', class_id: '', section_id: '', subject_id: '', due_date: '', teacher_id: '' });
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));
    const today = isoLocal(new Date());

    const { data: myClassSubjects } = useQuery({ queryKey: ['class-subjects', 'my'], queryFn: () => academicsService.getMyClassSubjects(), enabled: isTeacher });
    const { data: allClasses } = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: !isTeacher });
    const { data: allSubjects } = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => academicsService.getSubjects(), enabled: !isTeacher });
    const { data: teachers } = useQuery({ queryKey: ['teacher-options'], queryFn: academicsService.getTeacherOptions, enabled: !isTeacher });

    const myClasses = useMemo(() => {
        const byId = new Map<number, string>();
        (myClassSubjects || []).forEach((cs) => byId.set(cs.class_id, cs.class_name));
        return [...byId.entries()].map(([id, name]) => ({ id, name }));
    }, [myClassSubjects]);
    const classes = isTeacher ? myClasses : allClasses?.classes ?? [];
    // A choice with only one option is made for you.
    const classId = form.class_id || (isTeacher && myClasses.length === 1 ? String(myClasses[0].id) : '');
    const { data: sections } = useQuery({
        queryKey: ['sections', Number(classId)],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: !!classId,
    });
    const subjects = isTeacher
        ? (myClassSubjects || []).filter((cs) => String(cs.class_id) === classId).map((cs) => ({ id: cs.subject_id, name: cs.subject_name }))
        : allSubjects ?? [];
    const sectionList = sections?.sections ?? [];
    const sectionId = form.section_id || (sectionList.length === 1 ? String(sectionList[0].id) : '');
    const subjectId = form.subject_id || (isTeacher && subjects.length === 1 ? String(subjects[0].id) : '');

    const mutation = useMutation({
        mutationFn: () => assignmentsService.createAssignment({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            class_id: Number(classId),
            section_id: Number(sectionId),
            subject_id: Number(subjectId),
            due_date: form.due_date,
            teacher_id: form.teacher_id ? Number(form.teacher_id) : undefined, // teachers create as themselves
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignments'] }); onCreated(); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const missing = {
        title: !form.title.trim(), class: !classId, section: !sectionId, subject: !subjectId,
        due: !form.due_date || form.due_date < today, teacher: !isTeacher && !form.teacher_id,
    };
    const submit = () => {
        setTried(true);
        setError(null);
        if (Object.values(missing).some(Boolean)) return;
        mutation.mutate();
    };
    const err = (k: keyof typeof missing, key: string) => (tried && missing[k] ? t(key) : undefined);
    const busy = mutation.isPending;

    return (
        <Dialog open onClose={onClose} dismissible={!busy} icon={ClipboardList} title={t('assignmentsPage.new.title')} subtitle={t('assignmentsPage.new.sub')} closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={ClipboardList} loading={busy} onClick={submit}>{busy ? t('assignmentsPage.new.creating') : t('assignments.createAssignment')}</Button>
                </>
            }>
            {error && <Banner tone="bad" title={t('assignmentsPage.new.failed')}>{error}</Banner>}
            {isTeacher && classes.length === 0 && myClassSubjects && <Banner tone="warn" title={t('assignments.noClassesAssigned')} />}
            <TextField label={t('assignments.titleField')} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder={t('assignments.titlePlaceholder')}
                error={err('title', 'assignmentsPage.new.titleError')} />
            <FormRow>
                <SelectField label={t('assignments.class')} value={classId} placeholder={t('peopleForms.choose')} error={err('class', 'classesPage.enrol.pickClass')}
                    onChange={(e) => set({ class_id: e.target.value, section_id: '', subject_id: '' })} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
                <SelectField label={t('assignments.section')} value={sectionId} placeholder={t('peopleForms.choose')} disabled={!classId} error={err('section', 'assignmentsPage.new.sectionError')}
                    onChange={(e) => set({ section_id: e.target.value })} options={sectionList.map((s) => ({ value: s.id, label: s.name }))} />
            </FormRow>
            <FormRow>
                <SelectField label={t('assignments.subject')} value={subjectId} placeholder={t('peopleForms.choose')} disabled={isTeacher && !classId} error={err('subject', 'assignmentsPage.new.subjectError')}
                    onChange={(e) => set({ subject_id: e.target.value })} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
                <BsDateField label={t('assignments.dueDate')} value={form.due_date} min={today} onChange={(v) => set({ due_date: v })}
                    error={err('due', 'assignmentsPage.new.dueError')} />
            </FormRow>
            {!isTeacher && (
                <SelectField label={t('assignments.teacher')} value={form.teacher_id} placeholder={t('peopleForms.choose')} error={err('teacher', 'assignmentsPage.new.teacherError')}
                    onChange={(e) => set({ teacher_id: e.target.value })}
                    options={(teachers ?? []).map((tc) => ({ value: tc.id, label: tc.subjects.length ? `${tc.name} · ${tc.subjects.map((s) => s.name).join(', ')}` : tc.name }))} />
            )}
            <TextAreaField label={t('assignmentsPage.new.instructions')} optional={t('peopleForms.optional')} rows={4} value={form.description}
                onChange={(e) => set({ description: e.target.value })} placeholder={t('assignments.descPlaceholder')} />
            <p className="type-caption text-muted">{t('assignmentsPage.new.note')}</p>
        </Dialog>
    );
}
