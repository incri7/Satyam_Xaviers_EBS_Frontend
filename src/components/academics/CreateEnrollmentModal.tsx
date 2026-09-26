import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Search, UserCheck } from 'lucide-react';

import { Banner, Button, Dialog, FormRow, Person, SearchField, SelectField } from '../../design-system';
import { academicsService } from '../../api/services/academics.service';
import { peopleService } from '../../api/services/people.service';
import { academicYearLabel, academicYearOptions, currentAcademicYear } from '../../utils/academicYear';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { Student } from '../../types/people';
import type { Section } from '../../types/academic';
import { errorText, fullName } from '../../features/people/format';
import { cn } from '../../utils/cn';

interface CreateEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Opened from a class or section page: start there. */
    classId?: number;
    sectionId?: number;
}

/**
 * Figma H10 "Enroll student": who, which year, which class, which section,
 * with each section's seats shown so a full one is visible before choosing.
 * Figma's roll number is left out: enrolments have no roll number.
 */
export function CreateEnrollmentModal({ isOpen, onClose, classId: presetClass, sectionId: presetSection }: CreateEnrollmentModalProps) {
    const { t } = useTranslation();
    const { lang } = useDateFormat();
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [student, setStudent] = useState<Student | null>(null);
    const [year, setYear] = useState(currentAcademicYear());
    const [classId, setClassId] = useState(presetClass ? String(presetClass) : '');
    const [sectionId, setSectionId] = useState(presetSection ? String(presetSection) : '');
    const [error, setError] = useState<string | null>(null);
    const [tried, setTried] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const students = useQuery({
        queryKey: ['students', 'pick', search],
        queryFn: () => peopleService.getStudents({ search, limit: 8 }),
        enabled: isOpen && !student && search.length >= 2,
    });
    const classes = useQuery({ queryKey: ['classes', 'all'], queryFn: () => academicsService.getClasses({ limit: 100 }), enabled: isOpen });
    const sections = useQuery({
        queryKey: ['sections', Number(classId)],
        queryFn: () => academicsService.getSections({ class_id: Number(classId), limit: 100 }),
        enabled: isOpen && !!classId,
    });

    const close = () => {
        setSearchInput(''); setSearch(''); setStudent(null); setYear(currentAcademicYear());
        setClassId(presetClass ? String(presetClass) : ''); setSectionId(presetSection ? String(presetSection) : '');
        setError(null); setTried(false);
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            academicsService.createEnrollment({
                student_id: student!.id,
                class_id: Number(classId),
                section_id: sectionId ? Number(sectionId) : undefined,
                academic_year: year,
            }),
        onSuccess: () => {
            ['enrollments', 'sections', 'class-detail', 'students'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            close();
        },
        onError: (err) => setError(errorText(err, t('peoplePage.error.body'))),
    });

    const submit = () => {
        setTried(true);
        setError(null);
        if (!student || !classId) return;
        mutation.mutate();
    };

    const busy = mutation.isPending;
    const results: Student[] = students.data?.students ?? [];
    const sectionList: Section[] = sections.data?.sections ?? [];

    return (
        <Dialog
            open={isOpen}
            onClose={close}
            dismissible={!busy}
            icon={UserCheck}
            title={t('classesPage.enrol.title')}
            subtitle={t('classesPage.enrol.sub')}
            closeLabel={t('common.close')}
            footer={
                <>
                    <Button variant="quiet" onClick={close} disabled={busy}>{t('classesPage.dialog.cancel')}</Button>
                    <Button leftIcon={UserCheck} loading={busy} onClick={submit}>
                        {busy ? t('classesPage.enrol.enrolling') : student ? t('classesPage.enrol.button', { name: student.first_name }) : t('classesPage.enrol.buttonPlain')}
                    </Button>
                </>
            }
        >
            {error && <Banner tone="bad" title={t('classesPage.enrol.failed')}>{error}</Banner>}

            <div className="flex flex-col gap-1.5">
                <p className="type-small-semibold text-ink">{t('classesPage.enrol.student')}</p>
                {student ? (
                    <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                        <span className="min-w-0 flex-1"><Person name={fullName(student)} sub={student.admission_no} /></span>
                        <Button variant="ghost" size="sm" onClick={() => setStudent(null)}>{t('classesPage.enrol.change')}</Button>
                    </div>
                ) : (
                    <>
                        <SearchField value={searchInput} onChange={setSearchInput} placeholder={t('classesPage.enrol.search')} clearLabel={t('common.clear')} />
                        {tried && <p className="type-caption text-bad">{t('classesPage.enrol.pickStudent')}</p>}
                        <div className="flex min-h-[64px] flex-col gap-1.5">
                            {search.length < 2 ? (
                                <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Search size={15} aria-hidden /> {t('classesPage.enrol.searchHint')}</p>
                            ) : students.isPending ? (
                                <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Loader2 size={15} className="animate-spin" aria-hidden /> {t('addChild.searching')}</p>
                            ) : results.length === 0 ? (
                                <p className="px-1 py-2 type-small text-muted">{t('classesPage.enrol.noMatch')}</p>
                            ) : (
                                results.map((s) => (
                                    <button key={s.id} type="button" onClick={() => { setStudent(s); setSearchInput(''); }}
                                        className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface px-3.5 py-2 text-left outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                                        <span className="min-w-0 flex-1"><Person name={fullName(s)} sub={s.admission_no} /></span>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <FormRow>
                <SelectField label={t('classesPage.enrol.year')} value={year} onChange={(e) => setYear(e.target.value)}
                    options={academicYearOptions(3).map((y) => ({ value: y, label: academicYearLabel(y, lang) }))} />
                <SelectField label={t('classesPage.enrol.class')} placeholder={t('peopleForms.choose')} value={classId}
                    error={tried && !classId ? t('classesPage.enrol.pickClass') : undefined}
                    onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                    options={(classes.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            </FormRow>

            {classId && (
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 type-small-semibold text-ink">{t('classesPage.enrol.section')}</legend>
                    {sectionList.length === 0 && !sections.isPending ? (
                        <p className="type-small text-muted">{t('classesPage.enrol.sectionNone')}</p>
                    ) : (
                        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                            {sectionList.map((s) => {
                                const on = String(s.id) === sectionId;
                                const filled = s.enrolled_count ?? 0;
                                const full = !!s.capacity && filled >= s.capacity;
                                return (
                                    <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setSectionId(on ? '' : String(s.id))}
                                        className={cn(
                                            'flex items-center gap-3 rounded-row border-[1.5px] px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60',
                                            on ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-surface-2',
                                        )}>
                                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] type-title', on ? 'bg-primary text-on-primary' : 'bg-sunken text-ink-2')}>{s.name.slice(0, 2)}</span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="type-small-semibold text-ink">{t('classesPage.section.crumb', { name: s.name })}</span>
                                            <span className={cn('type-caption', full ? 'text-bad' : 'text-muted')}>
                                                {!s.capacity ? t('classesPage.enrol.noLimit', { filled }) : full ? t('classesPage.enrol.full', { filled, total: s.capacity }) : t('classesPage.enrol.seatsTaken', { filled, total: s.capacity })}
                                            </span>
                                        </span>
                                        {on && <Check size={18} className="shrink-0 text-primary" aria-hidden />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </fieldset>
            )}
        </Dialog>
    );
}
