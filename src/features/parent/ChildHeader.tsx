import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '../../design-system';
import { childClass, childName, useChildParam } from './helpers';

/**
 * Figma D02-D06 page head: the page title, the child's name and class, and
 * a switcher between children that keeps the same page (Attendance stays
 * Attendance).
 */
export function ChildHeader({ title, action }: { title: string; action?: ReactNode }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const { id, child, children } = useChildParam();
    const sub = child ? [childName(child), childClass(child)].filter(Boolean).join(', ') : '';
    const switchTo = (next: string) => navigate(pathname.replace(/\/parent\/child\/\d+/, `/parent/child/${next}`) + search);

    return (
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h1 className="type-h2 text-ink lg:type-h1">{title}</h1>
                {sub && <p className="type-small text-muted">{sub}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {children.length > 1 && (
                    <SegmentedControl aria-label={t('childPage.switchChild')} value={String(id)} onChange={switchTo}
                        options={children.map((c) => ({ value: String(c.student_id), label: c.first_name }))} />
                )}
                {action}
            </div>
        </div>
    );
}
