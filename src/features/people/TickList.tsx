import { Checkbox } from '../../design-system';

/**
 * "Also link …": the family members a change should probably include, all
 * ticked to start with. Untick the ones that do not belong (a half-brother
 * with another father). Nothing shown when there is nobody to offer.
 */
export function TickList({ title, items, skipped, onToggle }: {
    title: string;
    items: { id: number; label: string; sub?: string | null }[];
    skipped: number[];
    onToggle: (id: number) => void;
}) {
    if (items.length === 0) return null;
    return (
        <fieldset className="flex flex-col gap-2 rounded-row border border-line-subtle bg-surface-2 px-3.5 py-3">
            <legend className="sr-only">{title}</legend>
            <p aria-hidden className="type-small-semibold text-ink">{title}</p>
            {items.map((i) => (
                <div key={i.id} className="flex flex-col">
                    <Checkbox label={i.label} checked={!skipped.includes(i.id)} onChange={() => onToggle(i.id)} />
                    {i.sub && <span className="pl-[34px] type-caption text-muted">{i.sub}</span>}
                </div>
            ))}
        </fieldset>
    );
}
