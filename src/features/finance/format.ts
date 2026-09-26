import type { FeeFrequency, FeeStructure, PaymentMethod } from '../../types/finance';
import { financesService } from '../../api/services/finances.service';
import { formatRs } from '../../utils/money';
import { isoLocal } from '../../utils/nepaliDate';

export const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'online', 'cheque', 'card'];
/** Stored in English; shown through financePage.category.<name> when translated. */
export const EXPENSE_CATEGORIES = [
    'Salaries', 'Utilities', 'Maintenance', 'Supplies', 'Equipment', 'Transport',
    'Events', 'Office', 'Printing', 'Miscellaneous',
];
export const FREQUENCIES: FeeFrequency[] = ['monthly', 'quarterly', 'yearly', 'one_time'];

/** How many times a fee falls due in a year, for "saves this year" figures. */
export const TIMES_A_YEAR: Record<FeeFrequency, number> = { monthly: 12, quarterly: 4, yearly: 1, one_time: 1 };

/** "−Rs 4,500" for a reversal: the sign sits before the currency, as on the receipt. */
export function formatSignedRs(amount: number | string, lang: 'en' | 'ne' = 'en'): string {
    const n = Number(amount);
    return n < 0 ? `−${formatRs(-n, lang)}` : formatRs(n, lang);
}

/** i18n key for a payment method as stored ("bank_transfer" → Bank). */
export const methodKey = (m: string) => `financePage.method.${METHODS.includes(m as PaymentMethod) ? m : 'other'}`;

/**
 * A class's fee chart, reduced to the lines the school quotes to parents:
 * the yearly charge, the monthly fee, and what an old or a new student pays
 * up front (new students add the one-time admission items).
 */
export function summariseFees(fees: FeeStructure[]) {
    const active = fees.filter((f) => f.is_active);
    const sum = (list: FeeStructure[]) => list.reduce((t, f) => t + Number(f.amount), 0);
    const yearly = sum(active.filter((f) => f.frequency === 'yearly'));
    const monthly = sum(active.filter((f) => f.frequency === 'monthly'));
    const perTerm = sum(active.filter((f) => f.frequency === 'quarterly'));
    const oneTime = sum(active.filter((f) => f.frequency === 'one_time'));
    return { yearly, monthly, perTerm, oneTime, oldStudent: yearly + monthly, newStudent: yearly + monthly + oneTime, activeCount: active.length };
}

/** Save the payment's PDF receipt. The server builds it if it is not stored yet. */
export async function downloadReceipt(paymentId: number, receiptNo?: string | null) {
    const blob = await financesService.downloadReceiptBlob(paymentId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptNo || paymentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Scholarship types (Figma H04). The API has no type column, so the type is
 * written at the start of the reason, "Merit: first in Class 7", and read
 * back from there. A reason without a known prefix is simply untyped.
 */
export const SCHOLARSHIP_TYPES = ['merit', 'need', 'sibling', 'staff', 'other'] as const;
export type ScholarshipType = (typeof SCHOLARSHIP_TYPES)[number];
const TYPE_PREFIX: Record<ScholarshipType, string> = { merit: 'Merit', need: 'Need', sibling: 'Sibling', staff: 'Staff child', other: 'Other' };

export function encodeReason(type: ScholarshipType, reason: string): string {
    const text = reason.trim();
    return text ? `${TYPE_PREFIX[type]}: ${text}` : TYPE_PREFIX[type];
}

export function decodeReason(stored?: string | null): { type: ScholarshipType | null; reason: string } {
    const text = (stored ?? '').trim();
    for (const type of SCHOLARSHIP_TYPES) {
        const prefix = TYPE_PREFIX[type];
        if (text === prefix) return { type, reason: '' };
        if (text.startsWith(`${prefix}:`)) return { type, reason: text.slice(prefix.length + 1).trim() };
    }
    return { type: null, reason: text };
}

/** Today as YYYY-MM-DD in local time — the default for "date received". */
export const todayISO = () => isoLocal(new Date());
