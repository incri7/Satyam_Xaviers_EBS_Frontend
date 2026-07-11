/** Nepali school year runs mid-April to April: Apr–Dec belong to the year
 * that started that April; Jan–Mar belong to the previous April's year. */
export const currentAcademicYear = (): string => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
};

/** Current year first, then `count - 1` previous years. */
export const academicYearOptions = (count = 3): string[] => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: count }, (_, i) => `${startYear - i}-${startYear - i + 1}`);
};
