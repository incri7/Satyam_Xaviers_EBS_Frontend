import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';

import { Person, SearchField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { User } from '../../types/people';

/** A member of staff's account: everyone with a sign-in who is not a parent or a student. */
const isStaff = (u: User) => u.is_active && !['parent', 'student'].includes(u.role);

/**
 * Pick a teacher or other member of staff by name, phone or e-mail: to make
 * them the guardian of their own child, keeping their one account.
 */
export function StaffPicker({ label, onPick, busy }: { label: string; onPick: (user: User) => void; busy?: boolean }) {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setSearch(input.trim()), 300);
        return () => clearTimeout(id);
    }, [input]);

    const users = useQuery({
        queryKey: ['users', 'pick-staff', search],
        queryFn: () => peopleService.getUsers({ search, limit: 10, is_active: true }),
        enabled: search.length >= 2,
    });
    const results: User[] = ((users.data?.users ?? []) as User[]).filter(isStaff);
    const name = (u: User) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.phone || '';

    return (
        <div className="flex flex-col gap-1.5">
            <p className="type-small-semibold text-ink">{label}</p>
            <SearchField value={input} onChange={setInput} placeholder={t('family.staff.search')} clearLabel={t('common.clear')} aria-label={label} />
            <div className="flex min-h-[44px] flex-col gap-1.5">
                {search.length < 2 ? (
                    <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Search size={15} aria-hidden /> {t('addChild.searchHint')}</p>
                ) : users.isPending || busy ? (
                    <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Loader2 size={15} className="animate-spin" aria-hidden /> {t('addChild.searching')}</p>
                ) : results.length === 0 ? (
                    <p className="px-1 py-2 type-small text-muted">{t('family.staff.noMatch')}</p>
                ) : (
                    results.map((u) => (
                        <button key={u.id} type="button" onClick={() => onPick(u)}
                            className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface px-3.5 py-2 text-left outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                            <span className="min-w-0 flex-1">
                                <Person name={name(u)} sub={[t(`shell.roles.${u.role}`, { defaultValue: u.role }), u.phone || u.email].filter(Boolean).join(' · ')} />
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
