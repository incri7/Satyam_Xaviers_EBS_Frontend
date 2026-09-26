import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, Person, SelectField, ToggleRow } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { academicYearLabel, academicYearOptions } from '../../utils/academicYear';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { Enrollment } from '../../types/academic';
import { errorText } from '../../features/people/format';

interface EditEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrollmentData: Enrollment | null;
}

/**
 * Move an enrolment to another class, section or year, or mark it inactive.
 * The student stays fixed: enrolling someone else is a new enrolment.
 * Mount with a `key` per enrolment so the form starts from that record.
 */
export function EditEnrollmentModal({ isOpen, onClose, enrollmentData: e }: EditEnrollmentModalProps) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const [classId, setClassId] = useState(e ? String(e.class_id) : '');
    const [sectionId, setSectionId] = useState(e?.section_id ? String(e.section_id) : '');
    const [year, setYear] = useState(e?.academic_year ?? '');
    const [active, setActive] = useState(e?.is_active ?? true);
    const [error, setError] = useState<string | null>(null);

    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: isOpen });
    const sections = useQuery({
        queryKey: ['sections', Number(classId)],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: isOpen && !!classId,
    });

    const mutation = useMutation({
        mutationFn: () =>
            academicsService.updateEnrollment(e!.id, {
                class_id: Number(classId),
                section_id: sectionId ? Number(sectionId) : undefined,
                academic_year: year,
                is_active: active,
            }),
        onSuccess: () => {
            ['enrollments', 'sections', 'class-detail'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            onClose();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    if (!e) return null;
    const name = e.student ? [e.student.first_name, e.student.middle_name, e.student.last_name].filter(Boolean).join(' ') : `#${e.student_id}`;
    const years = academicYearOptions(3);
    const busy = mutation.isPending;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            dismissible={!busy}
            size="sm"
            icon={Pencil}
            title={t('classesPage.editEnrol.title')}
            subtitle={name}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={onClose} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button loading={busy} onClick={() => { setError(null); mutation.mutate(); }}>
                        {busy ? t('classesPage.editEnrol.saving') : t('classesPage.editEnrol.save')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('classesPage.editEnrol.failed')}>{error}</Banner>}
            <div className="rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                <Person name={name} sub={e.student?.admission_no} />
            </div>
            <FormRow>
                <SelectField label={t('classesPage.enrol.class')} value={classId} onChange={(ev) => { setClassId(ev.target.value); setSectionId(''); }}
                    options={(classes.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
                <SelectField label={t('classesPage.enrol.section')} value={sectionId} placeholder={t('classesPage.enrol.sectionNone')} onChange={(ev) => setSectionId(ev.target.value)}
                    options={(sections.data?.sections ?? []).map((s) => ({ value: s.id, label: s.name }))} />
            </FormRow>
            <SelectField label={t('classesPage.enrol.year')} value={year} onChange={(ev) => setYear(ev.target.value)}
                options={(years.includes(year) ? years : [year, ...years]).map((y) => ({ value: y, label: academicYearLabel(y, lang) }))} />
            <ToggleRow title={t('classesPage.editEnrol.active')} checked={active} onChange={setActive}>{t('classesPage.editEnrol.activeBody')}</ToggleRow>
        </Dialog>
    );
}
