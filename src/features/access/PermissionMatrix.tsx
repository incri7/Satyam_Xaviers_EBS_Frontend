import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

import { cn } from '../../utils/cn';
import { ACTIONS, groupResources, sameFlags, type Action, type Flags } from './resources';

/**
 * Figma B02/H12 grid: one row per resource, Read / Create / Update / Delete
 * across. Rows changed since the last save are marked, so the save bar's
 * count can be checked against what moved. Turning off Read turns off the
 * rest: acting on records you cannot see is not a permission worth having.
 */
export function PermissionMatrix({ resources, draft, saved, onChange, disabled }: {
    resources: string[];
    draft: Record<string, Flags>;
    saved: Record<string, Flags>;
    onChange: (resource: string, next: Flags) => void;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const toggle = (resource: string, action: Action) => {
        const cur = draft[resource];
        const next = { ...cur, [action]: !cur[action] };
        if (action === 'can_read' && !next.can_read) ACTIONS.forEach((k) => { next[k] = false; });
        if (action !== 'can_read' && next[action]) next.can_read = true;
        onChange(resource, next);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse sm:min-w-[520px]">
                <thead>
                    <tr className="border-b border-line-subtle">
                        <th scope="col" className="px-4 py-2.5 text-left type-caption-semibold text-muted lg:px-5">{t('accessPage.resource')}</th>
                        {ACTIONS.map((a) => <th key={a} scope="col" className="w-12 px-0.5 py-2.5 text-center type-caption-semibold text-muted sm:w-20 sm:px-2">{t(`accessPage.action.${a}`)}</th>)}
                    </tr>
                </thead>
                {groupResources(resources).map((g) => (
                    <tbody key={g.key}>
                        <tr>
                            <th scope="rowgroup" colSpan={5} className="bg-surface-2 px-4 py-2 text-left type-micro-bold uppercase tracking-wide text-muted lg:px-5">{t(`accessPage.group.${g.key}`)}</th>
                        </tr>
                        {g.resources.map((r) => {
                            const flags = draft[r];
                            const changed = !sameFlags(flags, saved[r]);
                            return (
                                <tr key={r} className="border-b border-line-subtle last:border-0">
                                    <th scope="row" className="py-2.5 pr-1 pl-4 text-left font-normal sm:px-4 lg:px-5">
                                        <span className="flex flex-col">
                                            <span className="flex items-center gap-2 type-small-semibold text-ink">
                                                {t(`accessPage.res.${r}.name`, { defaultValue: r.replace(/_/g, ' ') })}
                                                {changed && <span className="rounded-full bg-warn-soft px-1.5 type-micro-bold text-warn">{t('accessPage.changed')}</span>}
                                            </span>
                                            <span className="type-caption text-muted max-sm:hidden">{t(`accessPage.res.${r}.desc`, { defaultValue: '' })}</span>
                                        </span>
                                    </th>
                                    {ACTIONS.map((a) => (
                                        <td key={a} className="px-0.5 py-2 text-center sm:px-2">
                                            <button type="button" role="checkbox" aria-checked={flags[a]} disabled={disabled}
                                                aria-label={`${t(`accessPage.res.${r}.name`, { defaultValue: r })}: ${t(`accessPage.action.${a}`)}`}
                                                onClick={() => toggle(r, a)}
                                                className={cn(
                                                    'mx-auto grid size-7 place-items-center rounded-[8px] border-[1.5px] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/60 disabled:cursor-not-allowed disabled:opacity-60',
                                                    flags[a] ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface hover:border-primary-soft-line',
                                                )}>
                                                {flags[a] && <Check size={16} strokeWidth={3} aria-hidden />}
                                            </button>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
