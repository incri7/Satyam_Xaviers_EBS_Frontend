import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '../design-system';

type Lang = 'en' | 'ne';

/**
 * EN / ने switch. The choice is stored by i18next (localStorage "ebs-lang"),
 * so it holds before sign-in and across visits.
 */
export function LanguageSwitch({
    appearance = 'contrast',
    className,
}: {
    appearance?: 'contrast' | 'onDark';
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    const value: Lang = i18n.language?.startsWith('ne') ? 'ne' : 'en';

    return (
        <SegmentedControl<Lang>
            aria-label={t('language.toggle')}
            appearance={appearance}
            value={value}
            onChange={(lng) => { void i18n.changeLanguage(lng); }}
            className={className}
            options={[
                { value: 'en', label: 'EN', ariaLabel: 'English', lang: 'en' },
                { value: 'ne', label: 'ने', ariaLabel: 'नेपाली', lang: 'ne' },
            ]}
        />
    );
}
