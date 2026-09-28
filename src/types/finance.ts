export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'card';
export type FeeFrequency = 'one_time' | 'monthly' | 'quarterly' | 'yearly';

export interface FeeStructure {
    id: number;
    name: string;
    frequency: FeeFrequency;
    amount: number;
    fee_type?: string;
    is_active: boolean;
    valid_from?: string;
    valid_to?: string;
    class_id?: number;
    section_id?: number;
}

export interface FeeStructureCreate {
    name: string;
    frequency: FeeFrequency;
    amount: number;
    fee_type?: string;
    is_active?: boolean;
    valid_from?: string;
    valid_to?: string;
    class_id?: number;
    section_id?: number;
}

export interface FeeStructureUpdate {
    name?: string;
    frequency?: FeeFrequency;
    amount?: number;
    fee_type?: string;
    is_active?: boolean;
}

export interface StudentFeeAssignment {
    id: number;
    student_id: number;
    fee_structure_id: number;
}

export interface StudentFeeAssignmentCreate {
    student_id: number;
    fee_structure_id: number;
}

export interface StudentFeeAssignmentUpdate {
    student_id?: number;
    fee_structure_id?: number;
}

export interface Payment {
    id: number;
    student_id: number;
    fee_structure_id?: number;
    amount: number;
    method: PaymentMethod;
    paid_at: string;
    receipt_no?: string;
    transaction_id?: string;
    received_by_user_id?: number;
    /** What it was for: one line per fee on the receipt. */
    lines?: PaymentLine[];
}

/** One fee paid on a receipt. */
export interface PaymentLine {
    fee_structure_id: number;
    fee_name?: string | null;
    amount: number;
}

export interface PaymentCreate {
    student_id: number;
    fee_structure_id?: number;
    /** Several fees on one receipt; the amount is their total. */
    lines?: PaymentLine[];
    amount: number;
    method: PaymentMethod;
    paid_at: string;
    receipt_no?: string;
    transaction_id?: string;
    received_by_user_id?: number;
}

export interface PaymentUpdate {
    amount?: number;
    method?: PaymentMethod;
    paid_at?: string;
    receipt_no?: string;
    transaction_id?: string;
}

export interface FeeDiscount {
    id: number;
    student_id: number;
    fee_structure_id: number;
    is_percent: boolean;
    value: number;
    reason?: string;
    valid_from?: string;
    valid_to?: string;
}

/** A scholarship in the school-wide list, with who and which fee. */
export interface FeeDiscountRow extends FeeDiscount {
    student_name: string;
    admission_no: string | null;
    fee_name: string | null;
    fee_amount: number | string | null;
    fee_frequency: string | null;
    created_at: string;
}

export interface FeeDiscountPage {
    discounts: FeeDiscountRow[];
    total_count: number;
}

export type AuditGroup = 'payments' | 'expenses' | 'fees' | 'scholarships';

/** One entry of the append-only finance audit log. */
export interface AuditEntry {
    id: number;
    event_type: string;
    entity_table: string;
    entity_id: number;
    performed_by: number;
    performed_by_name: string | null;
    performed_at: string;
    snapshot: Record<string, unknown> | null;
    notes: string | null;
    student_name: string | null;
    fee_name: string | null;
}

export interface AuditPage {
    entries: AuditEntry[];
    total_count: number;
}

export interface FeeDiscountCreate {
    student_id: number;
    fee_structure_id: number;
    is_percent: boolean;
    value: number;
    reason?: string;
    valid_from?: string;
    valid_to?: string;
}

export interface FeeDiscountUpdate {
    is_percent?: boolean;
    value?: number;
    reason?: string;
    valid_from?: string;
    valid_to?: string;
}

export interface Expense {
    id: number;
    date: string;
    category: string;
    amount: number;
    vendor_name?: string;
    invoice_no?: string;
    payment_mode: PaymentMethod;
    description?: string;
    recorded_by_user_id: number;
    /** Storage key of the attached bill, when there is one. */
    attachment_key?: string | null;
}

export interface ExpenseCreate {
    date: string;
    category: string;
    amount: number;
    vendor_name?: string;
    invoice_no?: string;
    payment_mode: PaymentMethod;
    description?: string;
    recorded_by_user_id?: number;
}

export interface ExpenseUpdate {
    date?: string;
    category?: string;
    amount?: number;
    vendor_name?: string;
    invoice_no?: string;
    payment_mode?: PaymentMethod;
    description?: string;
}

export interface FinancialSummary {
    start_date: string;
    end_date: string;
    total_income: number;
    total_expense: number;
    net_balance: number;
}
