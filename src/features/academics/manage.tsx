import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layers, LogOut, Pencil, UserPlus } from 'lucide-react';

import { Banner, Button, Checkbox, Dialog, FormRow, SearchField, SelectField, Skeleton, TextAreaField, TextField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { errorText } from '../people/format';
import { useDateFormat } from '../../hooks/useDateFormat';
import { currentAcademicYear } from '../../utils/academicYear';
import { formatCount } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';
import type { Enrollment } from '../../types/academic';
import type { Student } from '../../types/people';

/** Why an enrolment ended; "active" is the current one. */
export const ENDINGS = ['promoted', 'repeating', 'graduated', 'transferred', 'left'] as const;

/** Rename a class. */
export function RenameClassDialog({ classId, name, onClose, onDone }: { classId: number; name: string; onClose: () => void; onDone: (name: string) => void }) {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [value, setValue] = useState(name);
    const save = useMutation({
        mutationFn: () => academicsService.updateClass(classId, { name: value.trim() }),
        onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['classes'] }); qc.invalidateQueries({ queryKey: ['class-detail', classId] }); onDone(c.name); },
    });
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={Pencil} title={t('academicsManage.renameClass')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} disabled={!value.trim() || value.trim() === name} onClick={() => save.mutate()}>{t('academicsManage.save')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('academicsManage.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <TextField label={t('academicsManage.className')} value={value} onChange={(e) => setValue(e.target.value)} maxLength={50} hint={t('academicsManage.classNameHint')} />
        </Dialog>
    );
}

/** Rename a section or change how many seats it has. */
export function EditSectionDialog({ section, className, onClose }: {
    section: { id: number; name: string; capacity: number | null };
    className: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [name, setName] = useState(section.name);
    const [seats, setSeats] = useState(section.capacity ? String(section.capacity) : '');
    const seatsOk = seats === '' || Number(seats) > 0;
    const save = useMutation({
        mutationFn: () => academicsService.updateSection(section.id, {
            name: name.trim() !== section.name ? name.trim() : undefined,
            capacity: seats ? Number(seats) : undefined,
        }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['class-detail'] }); qc.invalidateQueries({ queryKey: ['sections'] }); onClose(); },
    });
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={Layers}
            title={t('academicsManage.editSection', { name: `${className} ${section.name}` })} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} disabled={!name.trim() || !seatsOk} onClick={() => save.mutate()}>{t('academicsManage.save')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('academicsManage.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <FormRow>
                <TextField label={t('academicsManage.sectionName')} value={name} onChange={(e) => setName(e.target.value)} maxLength={10} />
                <TextField label={t('academicsManage.seats')} inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))}
                    hint={t('academicsManage.seatsHint')} error={!seatsOk ? t('academicsManage.seatsError') : undefined} />
            </FormRow>
        </Dialog>
    );
}

/** End an enrolment, saying why: promoted, repeating, graduated, transferred, left. */
export function EndEnrolmentDialog({ enrolment, studentName, onClose }: { enrolment: Enrollment; studentName: string; onClose: () => void }) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const qc = useQueryClient();
    const [status, setStatus] = useState<(typeof ENDINGS)[number]>('transferred');
    const [date, setDate] = useState(isoLocal(new Date()));
    const [note, setNote] = useState('');
    const save = useMutation({
        mutationFn: () => academicsService.changeEnrollmentStatus(enrolment.id, { status, ended_on: date, note: note.trim() || undefined }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); qc.invalidateQueries({ queryKey: ['class-detail'] }); qc.invalidateQueries({ queryKey: ['sections'] }); onClose(); },
    });
    return (
        <Dialog open onClose={onClose} dismissible={!save.isPending} icon={LogOut}
            title={t('academicsManage.endTitle', { name: studentName })} subtitle={t('academicsManage.endSub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={save.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button loading={save.isPending} onClick={() => save.mutate()}>{t('academicsManage.end')}</Button>
            </>}>
            {save.isError && <Banner tone="bad" title={t('academicsManage.saveFailed')}>{errorText(save.error, t('peoplePage.error.body'))}</Banner>}
            <FormRow>
                <SelectField label={t('academicsManage.why')} value={status} onChange={(e) => setStatus(e.target.value as (typeof ENDINGS)[number])}
                    options={ENDINGS.map((s) => ({ value: s, label: t(`enrolStatus.${s}`) }))} />
                <TextField type="date" label={t('academicsManage.on')} value={date} max={isoLocal(new Date())} onChange={(e) => setDate(e.target.value)} hint={date ? df.date(date) : undefined} />
            </FormRow>
            <TextAreaField label={t('academicsManage.note')} optional={t('peopleForms.optional')} rows={2} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={t('academicsManage.notePlaceholder')} />
            <p className="type-caption text-muted">{t('academicsManage.endNote')}</p>
        </Dialog>
    );
}

/** Enrol several students into one section at once, from those not enrolled anywhere. */
export function BulkEnrolDialog({ classId, sectionId, sectionLabel, onClose }: { classId: number; sectionId: number; sectionLabel: string; onClose: () => void }) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState<number[]>([]);
    const students = useQuery({
        queryKey: ['students', 'unenrolled', search],
        queryFn: () => peopleService.getStudents({ unenrolled: true, search: search || undefined, limit: 100 }),
    });
    const list = students.data?.students ?? [];
    const enrol = useMutation({
        mutationFn: () => academicsService.bulkEnroll({
            enrollments: picked.map((id) => ({ student_id: id, class_id: classId, section_id: sectionId, academic_year: currentAcademicYear(), is_active: true })),
        }),
        onSuccess: () => {
            ['enrollments', 'students', 'class-detail', 'sections', 'fee-reach'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
            onClose();
        },
    });
    const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    return (
        <Dialog open onClose={onClose} dismissible={!enrol.isPending} icon={UserPlus} size="lg"
            title={t('academicsManage.bulkTitle', { name: sectionLabel })} subtitle={t('academicsManage.bulkSub')} closeLabel={t('common.close')}
            footer={<>
                <Button variant="quiet" onClick={onClose} disabled={enrol.isPending}>{t('classesPage.dialog.cancel')}</Button>
                <Button leftIcon={UserPlus} loading={enrol.isPending} disabled={picked.length === 0} onClick={() => enrol.mutate()}>
                    {picked.length ? t('academicsManage.bulkButton', { count: picked.length, n: formatCount(picked.length, lang) }) : t('academicsManage.bulkButtonPlain')}
                </Button>
            </>}>
            {enrol.isError && <Banner tone="bad" title={t('academicsManage.bulkFailed')}>{errorText(enrol.error, t('peoplePage.error.body'))}</Banner>}
            <SearchField value={search} onChange={setSearch} placeholder={t('academicsManage.bulkSearch')} clearLabel={t('common.clear')} />
            {students.isPending ? <Skeleton className="h-40" /> : list.length === 0 ? (
                <p className="py-4 text-center type-small text-muted">{search ? t('academicsManage.bulkNoMatch') : t('academicsManage.bulkNone')}</p>
            ) : (
                <ul className="flex max-h-[360px] flex-col divide-y divide-line-subtle overflow-y-auto rounded-row border border-line">
                    {list.map((s: Student) => (
                        <li key={s.id} className="px-3 py-2">
                            <Checkbox checked={picked.includes(s.id)} onChange={() => toggle(s.id)}
                                label={<span className="flex flex-col"><span className="type-small-semibold text-ink">{[s.first_name, s.last_name].filter(Boolean).join(' ')}</span><span className="type-caption text-muted">{s.admission_no}</span></span>} />
                        </li>
                    ))}
                </ul>
            )}
            <p className="type-caption text-muted">{t('academicsManage.bulkNote')}</p>
        </Dialog>
    );
}
