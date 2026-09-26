import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle } from 'lucide-react';

import { Meter, type MeterTone } from '../../design-system';
import { cn } from '../../utils/cn';
import type { PasswordCheck, PasswordStrength as Strength } from './passwordRules';

const TONE: Record<Strength, { meter: MeterTone; text: string }> = {
    empty: { meter: 'ok', text: 'text-muted' },
    weak: { meter: 'bad', text: 'text-bad' },
    fair: { meter: 'warn', text: 'text-warn' },
    strong: { meter: 'ok', text: 'text-ok' },
};

/**
 * Strength row and rule checklist under the new-password field.
 * Figma: A03 "strength" + "Rules".
 */
export function PasswordStrength({ check, id }: { check: PasswordCheck; id?: string }) {
    const { t } = useTranslation();
    const tone = TONE[check.strength];
    const strengthLabel = t(`auth.setPassword.strength.${check.strength}`);

    return (
        <div id={id} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
                <span className="type-caption text-muted">{t('auth.setPassword.strength.label')}</span>
                <Meter
                    value={check.score}
                    tone={tone.meter}
                    label={`${t('auth.setPassword.strength.label')}: ${strengthLabel}`}
                    className="flex-1"
                />
                <span className={cn('type-caption-semibold', tone.text)} aria-live="polite">
                    {strengthLabel}
                </span>
            </div>

            <ul className="flex flex-col gap-2" aria-label={t('auth.setPassword.rulesLabel')}>
                {check.rules.map((rule) => (
                    <li key={rule.id} className="flex items-center gap-2 type-small">
                        {rule.met ? (
                            <CheckCircle2 size={16} className="shrink-0 text-ok" aria-hidden />
                        ) : (
                            <Circle size={16} className="shrink-0 text-muted" aria-hidden />
                        )}
                        <span className={rule.met ? 'text-ink' : 'text-muted'}>
                            {t(`auth.setPassword.rules.${rule.id}`)}
                            <span className="sr-only">
                                {' '}({rule.met ? t('auth.setPassword.rules.met') : t('auth.setPassword.rules.notMet')})
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
