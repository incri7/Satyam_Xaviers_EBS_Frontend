import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Trash2 } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, SelectField, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { timetableService, type TimetableSlot } from '../../api/services/timetable.service';
import { errorText } from '../people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatCount } from '../../utils/money';

/**
 * Figma H11 "Timetable slot": which subject and teacher own one period of
 * one section's week, and when it runs. The server refuses a teacher who
 * already has a class in that period, and says so.
 *
 * Adapted: slots repeat every week (no one-off swaps) and there is no room.
 */
export function SlotDialog({ classId, sectionId, sectionLabel, day, dayName, period, existing, onClose, onSaved }: {
    classId: number;
    sectionId: number;
    sectionLabel: string;
    day: number;
    dayName: string;
    period: number;
    existing: TimetableSlot | null;
    onClose: () => void;
    onSaved: (message: string) => void;
}) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const [subjectId, setSubjectId] = useState(existing ? String(existing.subject_id) : '');
    const [teacherId, setTeacherId] = useState(existing?.teacher_id ? String(existing.teacher_id) : '');
    const [start, setStart] = useState(existing?.start_time?.slice(0, 5) ?? '');
    const [end, setEnd] = useState(existing?.end_time?.slice(0, 5) ?? '');
    const [tried, setTried] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: classSubjects } = useQuery({ queryKey: ['class-subjects', classId], queryFn: () => academicsService.getClassSubjects(classId) });
    const { data: teachers } = useQuery({ queryKey: ['teacher-options'], queryFn: academicsService.getTeacherOptions });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['timetable'] });
    const payload = { subject_id: Number(subjectId), teacher_id: teacherId ? Number(teacherId) : undefined, start_time: start || undefined, end_time: end || undefined };
    const save = useMutation({
        mutationFn: () => (existing
            ? timetableService.updateSlot(existing.id, payload)
            : timetableService.createSlot({ class_id: classId, section_id: sectionId, day_of_week: day, period_number: period, ...payload })),
        onSuccess: () => { invalidate(); onSaved(t('timetablePage.slot.saved', { day: dayName, period: formatCount(period, lang) })); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const clear = useMutation({
        mutationFn: () => timetableService.deleteSlot(existing!.id),
        onSuccess: () => { invalidate(); onSaved(t('timetablePage.slot.cleared', { day: dayName, period: formatCount(period, lang) })); },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });
    const busy = save.isPending || clear.isPending;
    const timesOk = !start || !end || start < end;

    const pickSubject = (id: string) => {
        setSubjectId(id);
        // The class's own teacher for the subject is nearly always the one wanted.
        const cs = (classSubjects ?? []).find((c) => String(c.subject_id) === id);
        if (cs?.teacher_id) setTeacherId(String(cs.teacher_id));
    };
    const subjectName = (classSubjects ?? []).find((c) => String(c.subject_id) === subjectId)?.subject_name;
    // Teachers of the chosen subject first, then everyone else.
    const teacherList = [...(teachers ?? [])].sort((a, b) =>
        Number(b.subjects.some((s) => s.name === subjectName)) - Number(a.subjects.some((s) => s.name === subjectName)) || a.name.localeCompare(b.name));

    const submit = () => {
        setTried(true);
        setError(null);
        if (!subjectId || !timesOk) return;
        save.mutate();
    };

    return (
        <Dialog open onClose={onClose} dismissible={!busy} size="sm" icon={CalendarClock}
            title={t('timetablePage.slot.title', { day: dayName, period: formatCount(period, lang) })} subtitle={sectionLabel} closeLabel={t('common.close')}
            footer={
                <>
                    {existing && <Button variant="ghost" leftIcon={Trash2} disabled={busy} loading={clear.isPending} onClick={() => clear.mutate()} className="text-bad sm:mr-auto">{t('timetablePage.slot.clear')}</Button>}
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button loading={save.isPending} disabled={busy} onClick={submit}>{t('timetablePage.slot.save')}</Button>
                </>
            }>
            {error && <Banner tone="bad" title={t('timetablePage.slot.failed')}>{error}</Banner>}
            <SelectField label={t('marks.subject')} value={subjectId} placeholder={t('peopleForms.choose')} onChange={(e) => pickSubject(e.target.value)}
                error={tried && !subjectId ? t('assignmentsPage.new.subjectError') : undefined}
                hint={classSubjects && classSubjects.length === 0 ? t('timetablePage.slot.noSubjects') : undefined}
                options={(classSubjects ?? []).map((c) => ({ value: c.subject_id, label: c.subject_name }))} />
            <SelectField label={t('assignments.teacher')} value={teacherId} placeholder={t('timetablePage.slot.noTeacher')} onChange={(e) => setTeacherId(e.target.value)}
                hint={t('timetablePage.slot.teacherHint')}
                options={teacherList.map((tc) => ({ value: tc.id, label: tc.subjects.length ? `${tc.name} · ${tc.subjects.map((s) => s.name).join(', ')}` : tc.name }))} />
            <FormRow>
                <TextField label={t('timetablePage.slot.start')} optional={t('peopleForms.optional')} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                <TextField label={t('timetablePage.slot.end')} optional={t('peopleForms.optional')} type="time" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)}
                    error={tried && !timesOk ? t('timetablePage.slot.timeError') : undefined} />
            </FormRow>
            <p className="type-caption text-muted">{t('timetablePage.slot.weekly')}</p>
        </Dialog>
    );
}
