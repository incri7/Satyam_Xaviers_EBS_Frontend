/**
 * Save rows as an Excel workbook. The library is loaded only when someone
 * exports, so it adds nothing to the page's first load.
 */
export async function downloadSheet(filename: string, sheet: string, headers: string[], rows: (string | number | null | undefined)[][]) {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map((r) => r.map((v) => v ?? ''))]);
    // Column widths from the longest value, so names are not cut off on opening.
    ws['!cols'] = headers.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/** Every page of a paged list, for an export: the whole list, not what is on screen. */
export async function fetchAll<T>(page: (skip: number, limit: number) => Promise<{ items: T[]; total: number }>, limit = 100): Promise<T[]> {
    const all: T[] = [];
    for (let skip = 0; ; skip += limit) {
        const { items, total } = await page(skip, limit);
        all.push(...items);
        if (all.length >= total || items.length === 0) break;
    }
    return all;
}
