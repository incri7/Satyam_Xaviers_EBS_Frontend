import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { Banner } from '../../design-system';

export interface Notice {
    tone: 'ok' | 'bad' | 'info';
    title: string;
    body?: ReactNode;
}

/**
 * One-line outcome of a row action ("Registration link copied", or what
 * went wrong), shown above the register instead of a browser alert.
 * Successes clear themselves; errors stay until dismissed.
 */
export function useNotice() {
    const { t } = useTranslation();
    const [notice, setNotice] = useState<Notice | null>(null);

    useEffect(() => {
        if (!notice || notice.tone === 'bad') return;
        const id = setTimeout(() => setNotice(null), 6000);
        return () => clearTimeout(id);
    }, [notice]);

    const show = useCallback((n: Notice) => setNotice(n), []);

    const ui = notice ? (
        <Banner
            tone={notice.tone}
            title={notice.title}
            action={
                <button
                    type="button"
                    onClick={() => setNotice(null)}
                    aria-label={t('peoplePage.notice.dismiss')}
                    className="-m-1 grid size-7 shrink-0 place-items-center rounded-full text-ink-2 outline-none hover:bg-black/5 focus-visible:ring-3 focus-visible:ring-focus/60"
                >
                    <X size={14} aria-hidden />
                </button>
            }
        >
            {notice.body}
        </Banner>
    ) : null;

    return [ui, show] as const;
}
