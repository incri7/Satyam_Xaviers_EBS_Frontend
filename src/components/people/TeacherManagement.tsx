import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, Briefcase, CalendarDays, ChevronRight, Eye, GraduationCap, Pencil, BookOpen } from 'lucide-react';

import { Button, IconButton, ListRow, Person, SearchField, SortTh, THead, Td, Th, Tr } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import { AccessControl } from '../AccessControl';
import { EditTeacherModal } from './EditTeacherModal';
import type { Teacher } from '../../types/people';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useViewMode } from '../common/ViewToggle';
import { SelectMenu } from '../common/SelectMenu';
import { RegisterView } from '../../features/people/RegisterView';
import { PersonCard } from '../../features/people/PersonCard';
import { useListControls } from '../../features/people/useListControls';
import { fullName } from '../../features/people/format';
import { formatCount } from '../../utils/money';

type TeacherSortKey = 'name' | 'code' | 'designation' | 'qualification' | 'experience' | 'join_date';
const COLUMNS = 6;

/** Figma F02 Teachers. Cards first, as in Figma: teachers are looked up by face and role. */
export function TeacherManagement() {
    const { t } = useTranslation();
    const df = useDateFormat();
    const navigate = useNavigate();
    const [view, setView] = useViewMode('people_teachers_view', 'cards');
    const list = useListControls<TeacherSortKey>();
    const [designation, setDesignation] = useState('');
    const [editing, setEditing] = useState<Teacher | null>(null);

    const filtered = Boolean(list.search || designation);
    const clearFilters = () => { list.resetSearch(); setDesignation(''); };

    const { data: designations } = useQuery({
        queryKey: ['teacher-designations'],
        queryFn: peopleService.getTeacherDesignations,
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['teachers', list.search, list.page, 20, designation, list.sort.by, list.sort.dir],
        queryFn: () =>
            peopleService.getTeachers({
                search: list.search,
                page: list.page,
                limit: 20,
                designation: designation || undefined,
                sort_by: list.sort.by ?? undefined,
                sort_dir: list.sort.dir,
            }),
        placeholderData: (prev) => prev,
    });
    const teachers: Teacher[] = data?.teachers ?? [];

    const years = (n?: number) => (n ? t('peoplePage.value.years', { count: n, n: formatCount(n, df.lang) }) : '—');
    const open = (tc: Teacher) => navigate(`/people/teachers/${tc.id}`);
    const sub = (tc: Teacher) => [tc.designation, tc.staff_code].filter(Boolean).join(', ');

    return (
        <>
            <RegisterView<Teacher>
                kind="teachers"
                emptyIcon={BookOpen}
                total={data?.total_count}
                filtered={filtered}
                onClearFilters={clearFilters}
                view={view}
                onViewChange={setView}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                rows={teachers}
                columns={COLUMNS}
                paging={data && { page: data.page, totalPages: data.total_pages, totalCount: data.total_count, pageSize: data.limit, onChange: list.setPage }}
                toolbar={
                    <>
                        <SearchField
                            value={list.searchInput}
                            onChange={list.setSearchInput}
                            placeholder={t('peoplePage.search.teachers')}
                            clearLabel={t('common.clear')}
                            containerClassName="md:w-[300px]"
                        />
                        <SelectMenu
                            value={designation}
                            onChange={list.filter(setDesignation)}
                            label={t('peoplePage.filters.designation')}
                            icon={<Briefcase />}
                            className="md:w-auto"
                            options={[
                                { value: '', label: t('peoplePage.filters.allDesignations') },
                                ...((designations as string[] | undefined) ?? []).map((d) => ({ value: d, label: d })),
                            ]}
                        />
                    </>
                }
                head={
                    <THead>
                        <SortTh k="name" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.teacher')}</SortTh>
                        <SortTh k="designation" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.designation')}</SortTh>
                        <SortTh k="qualification" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.qualification')}</SortTh>
                        <SortTh k="experience" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.experience')}</SortTh>
                        <SortTh k="join_date" sort={list.sort} onSort={list.toggleSort}>{t('peoplePage.col.joined')}</SortTh>
                        <Th className="text-right">{t('peoplePage.col.actions')}</Th>
                    </THead>
                }
                row={(tc) => (
                    <Tr key={tc.id}>
                        <Td>
                            <button type="button" onClick={() => open(tc)} className="rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-focus/60">
                                <Person name={fullName(tc)} sub={tc.staff_code} />
                            </button>
                        </Td>
                        <Td>{tc.designation || '—'}</Td>
                        <Td>{tc.qualification || '—'}</Td>
                        <Td className="whitespace-nowrap">{years(tc.experience_years)}</Td>
                        <Td className="whitespace-nowrap">{df.date(tc.join_date, 'medium', '—')}</Td>
                        <Td>
                            <div className="flex justify-end gap-1.5">
                                <IconButton icon={Eye} label={t('peoplePage.row.view')} onClick={() => open(tc)} />
                                <AccessControl id="teachers_update">
                                    <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(tc)} />
                                </AccessControl>
                            </div>
                        </Td>
                    </Tr>
                )}
                card={(tc) => (
                    <PersonCard
                        key={tc.id}
                        name={fullName(tc)}
                        sub={sub(tc)}
                        details={[
                            { icon: GraduationCap, label: t('peoplePage.col.qualification'), value: tc.qualification || '—' },
                            { icon: Award, label: t('peoplePage.col.experience'), value: years(tc.experience_years) },
                            { icon: CalendarDays, label: t('peoplePage.col.joined'), value: df.date(tc.join_date, 'medium', '—') },
                        ]}
                        primaryAction={
                            <Button variant="secondary" size="sm" rightIcon={ChevronRight} onClick={() => open(tc)}>
                                {t('peoplePage.row.viewProfile')}
                            </Button>
                        }
                        actions={
                            <AccessControl id="teachers_update">
                                <IconButton icon={Pencil} label={t('peoplePage.row.edit')} onClick={() => setEditing(tc)} />
                            </AccessControl>
                        }
                    />
                )}
                listRow={(tc) => (
                    <ListRow key={tc.id} onClick={() => open(tc)}>
                        <span className="min-w-0 flex-1">
                            <Person name={fullName(tc)} sub={sub(tc)} size={40} />
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </ListRow>
                )}
            />

            {editing && <EditTeacherModal teacher={editing} isOpen onClose={() => setEditing(null)} />}
        </>
    );
}
