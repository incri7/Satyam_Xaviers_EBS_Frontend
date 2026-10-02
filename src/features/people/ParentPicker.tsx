import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';

import { Button, Person, SearchField } from '../../design-system';
import { peopleService } from '../../api/services/people.service';
import type { Parent } from '../../types/people';
import { fullName, parentContact } from './format';

/**
 * Pick one guardian already on the register, by name or phone. The same
 * shape as StudentPicker: once picked, a row with a Change button.
 */
export function ParentPicker({
    label,
    value,
    onChange,
    exclude = [],
}: {
    label: string;
    value: Parent | null;
    onChange: (parent: Parent | null) => void;
    /** Guardians not to offer, e.g. ones already linked. */
    exclude?: number[];
}) {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const id = setTimeout(() => setSearch(input.trim()), 300);
        return () => clearTimeout(id);
    }, [input]);

    const parents = useQuery({
        queryKey: ['parents', 'pick', search],
        queryFn: () => peopleService.getParents({ search, limit: 8 }),
        enabled: !value && search.length >= 2,
    });
    const results: Parent[] = (parents.data?.parents ?? []).filter((p: Parent) => !exclude.includes(p.id));

    return (
        <div className="flex flex-col gap-1.5">
            <p className="type-small-semibold text-ink">{label}</p>
            {value ? (
                <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1"><Person name={fullName(value)} sub={parentContact(value)} /><Children of={value} /></span>
                    <Button variant="ghost" size="sm" onClick={() => onChange(null)}>{t('classesPage.enrol.change')}</Button>
                </div>
            ) : (
                <>
                    <SearchField value={input} onChange={setInput} placeholder={t('addChild.search')} clearLabel={t('common.clear')} aria-label={label} />
                    <div className="flex min-h-[44px] flex-col gap-1.5">
                        {search.length < 2 ? (
                            <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Search size={15} aria-hidden /> {t('addChild.searchHint')}</p>
                        ) : parents.isPending ? (
                            <p className="flex items-center gap-2 px-1 py-2 type-small text-muted"><Loader2 size={15} className="animate-spin" aria-hidden /> {t('addChild.searching')}</p>
                        ) : parents.isError ? (
                            <p className="px-1 py-2 type-small text-bad">{t('addChild.error.search')}</p>
                        ) : results.length === 0 ? (
                            <p className="px-1 py-2 type-small text-muted">{t('addChild.noMatch')}</p>
                        ) : (
                            results.map((p) => (
                                <button key={p.id} type="button" onClick={() => { onChange(p); setInput(''); }}
                                    className="flex items-center gap-3 rounded-row border border-line-subtle bg-surface px-3.5 py-2 text-left outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-focus/60">
                                    <span className="min-w-0 flex-1"><Person name={fullName(p)} sub={parentContact(p)} /><Children of={p} /></span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/** The family's children under the guardian, so staff can see who they are
    picking, and do not add a child the family already has. */
function Children({ of }: { of: Parent }) {
    const { t } = useTranslation();
    const kids = of.children ?? [];
    return (
        <p className="mt-0.5 pl-[42px] type-caption text-muted">
            {kids.length === 0
                ? t('peopleRules.noChildrenYet')
                : t('peopleRules.childrenOf', { names: kids.map((k) => (k.admission_no ? `${k.name} (${k.admission_no})` : k.name)).join(', ') })}
        </p>
    );
}
