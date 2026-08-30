import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { parentService } from '../../api/services/parent.service';

interface Props {
    studentId: number;
    /** Page-specific title shown under the child's name (e.g. "Marks"). Falls back to the child's name alone when omitted. */
    title?: string;
}

/** Shared back-arrow + child name/class header for every /parent/child/:id/* page. */
export const ChildPageHeader: React.FC<Props> = ({ studentId, title }) => {
    const { t } = useTranslation();

    // Shares the query key ParentHome and Sidebar already use, so this is cache, not a new request.
    const { data: childrenData } = useQuery({
        queryKey: ['parent', 'my-children'],
        queryFn: parentService.getMyChildren,
    });
    const child = childrenData?.children.find(c => c.student_id === studentId);
    const childName = child ? [child.first_name, child.last_name].filter(Boolean).join(' ') : '';

    return (
        <div className="flex items-center gap-3">
            <Link to="/home/parent" className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
                <h1 className="text-xl font-bold text-slate-900">{title || childName || t('home.parent.myChildren')}</h1>
                {child && (
                    <p className="text-xs font-semibold text-slate-500">
                        {title && `${childName} · `}
                        {child.class_name}{child.section_name ? ` · ${child.section_name}` : ''} · {child.admission_no}
                    </p>
                )}
            </div>
        </div>
    );
};
