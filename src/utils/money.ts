import { toNepaliDigits } from './nepaliDate';

/**
 * Whole rupees for display: "Rs 1,245,600", or "रु १,२४५,६००" in Nepali.
 * Paisa are dropped on dashboards; ledgers and receipts show them.
 */
export function formatRs(amount: number | string | null | undefined, lang: 'en' | 'ne' = 'en'): string {
    const n = Math.round(Number(amount ?? 0));
    const digits = (Number.isFinite(n) ? n : 0).toLocaleString('en-US');
    return lang === 'ne' ? `रु ${toNepaliDigits(digits)}` : `Rs ${digits}`;
}

/** A plain count in the active script: 487 → "४८७" in Nepali. */
export function formatCount(n: number, lang: 'en' | 'ne' = 'en'): string {
    const digits = Math.round(n).toLocaleString('en-US');
    return lang === 'ne' ? toNepaliDigits(digits) : digits;
}
