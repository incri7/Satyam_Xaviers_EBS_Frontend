import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';

import { Button, Person, SearchField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Student } from '../../types/people';
import { fullName } from './format';

/**
 * Pick one student by name or admission number (Figma H01/H04 "Student").
 * Once picked, the student shows as a row with a Change button; `trailing`
 * sits on that row, e.g. the student's balance.
 */
export function StudentPicker({
    label,
    value,
    onChange,
    error,
    trailing,
    enabled = true,
    describe = (s) => s.admission_no,
    exclude = [],
}: {
    label: string;
    value: Student | null;
    onChange: (student: Student | null) => void;
    error?: string;
    trailing?: ReactNode;
    enabled?: boolean;
    /** The line under a name; the admission number unless given. */
    describe?: (student: Student) => string | undefined;
    /** Students not to offer, e.g. ones already picked. */
    exclude?: number[];
}) {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const id = setTimeout(() => setSearch(input.trim()), 300);
        return () => clearTimeout(id);
    }, [input]);

    const students = useQuery({
        queryKey: ['students', 'pick', search],
        queryFn: () => peopleService.getStudents({ search, limit: 8 }),
        enabled: enabled && !value && search.length >= 2,
    });
    const results: Student[] = (students.data?.students ?? []).filter((s: Student) => !exclude.includes(s.id));

    return (
        <div className="flex flex-col gap-1.5">
            <p className="type-small-semibold text-ink">{label}</p>
            {value ? (
                <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1"><Person name={fullName(value)} sub={describe(value)} /></span>
                    {trailing}
                    <Button variant="ghost" size="sm" onClick={() => onChange(null)}>{t('classesPage.enrol.change')}</Button>
                </div>
            ) : (
                <>
                    <SearchField value={input} onChange={setInput} placeholder={t('classesPage.enrol.search')} clearLabel={t('common.clear')} aria-label={label} />
                    {error && <p className="type-caption text-bad">{error}</p>}
                    <div className="flex min-h-[44px] flex-col gap-1.5">
                        {search.length < 2 ? (
                            <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Search size={15} aria-hidden /> {t('classesPage.enrol.searchHint')}</p>
                        ) : students.isPending ? (
                            <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Loader2 size={15} className="animate-spin" aria-hidden /> {t('addChild.searching')}</p>
                        ) : results.length === 0 ? (
                            <p className="px-1 py-2 type-small text-muted">{t('classesPage.enrol.noMatch')}</p>
                        ) : (
                            results.map((s) => (
                                <button key={s.id} type="button" onClick={() => { onChange(s); setInput(''); }}
                                    className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface px-3.5 py-2 text-left outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                                    <span className="min-w-0 flex-1"><Person name={fullName(s)} sub={describe(s)} /></span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
