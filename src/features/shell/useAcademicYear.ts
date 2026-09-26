import { useQuery } from '@tanstack/react-query';

import { academicCalendarService } from '../../api/services/academicCalendar.service';
import { useDateFormat } from '../../hooks/useDateFormat';
import { academicYearLabel, currentAcademicYear, currentAcademicYearBS } from '../../utils/academicYear';
import { toNepaliDigits } from '../../utils/nepaliDate';

/**
 * The academic year as the school says it, "2083-84".
 *
 * The configured calendar is the source of truth (FE-AD-06); without one the
 * date rule decides. A calendar named in AD ("2026-2027") is shown in BS.
 */
export function useAcademicYearLabel(): string {
    const { lang } = useDateFormat();
    const { data } = useQuery({
        queryKey: ['academic-years', 'current'],
        queryFn: academicCalendarService.getCurrentYear,
        retry: false,
        staleTime: 60 * 60 * 1000,
    });

    const name = data?.name?.trim();
    if (name) {
        const startYear = parseInt(name, 10);
        if (startYear > 1900 && startYear < 2050) return academicYearLabel(name, lang);
        return lang === 'ne' ? toNepaliDigits(name) : name;
    }
    const bs = currentAcademicYearBS() || academicYearLabel(currentAcademicYear(), 'en');
    return lang === 'ne' ? toNepaliDigits(bs) : bs;
}
