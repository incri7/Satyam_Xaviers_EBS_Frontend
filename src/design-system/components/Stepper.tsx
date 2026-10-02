import { Fragment } from 'react';
import { Check } from 'lucide-react';

import { cn } from '../../utils/cn';

/**
 * Progress through a multi-step dialog. Mirrors Figma "Stepper":
 * done steps green with a tick, the current one blue, the rest quiet.
 * On a phone each name sits under its number, so every step stays named
 * ("1 · 2 · 3" alone did not say what was coming).
 */
export function Stepper({ steps, current, label }: { steps: string[]; current: number; label: string }) {
    return (
        <ol aria-label={label} className="flex items-center gap-2.5">
            {steps.map((step, i) => {
                const done = i < current;
                const now = i === current;
                return (
                    <Fragment key={step}>
                        {i > 0 && (
                            <li aria-hidden className={cn('h-0.5 min-w-4 flex-1 rounded-full max-sm:mt-[13px] max-sm:self-start', i <= current ? 'bg-ok' : 'bg-line')} />
                        )}
                        <li aria-current={now ? 'step' : undefined} className="flex shrink-0 items-center gap-2 max-sm:flex-col max-sm:gap-1">
                            <span
                                className={cn(
                                    'grid size-7 place-items-center rounded-full type-caption-semibold',
                                    done ? 'bg-ok text-white' : now ? 'bg-primary text-on-primary' : 'bg-sunken text-muted',
                                )}
                            >
                                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
                            </span>
                            <span className={cn('type-small max-sm:type-caption max-sm:text-center', now ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted')}>
                                {step}
                            </span>
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
