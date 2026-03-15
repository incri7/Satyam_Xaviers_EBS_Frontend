export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'cheque';
export type FeeFrequency = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

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
}

export interface PaymentCreate {
    student_id: number;
    fee_structure_id?: number;
    amount: number;
    method: PaymentMethod;
    paid_at: string;
    receipt_no?: string;
    transaction_id?: string;
    received_by_user_id?: number;
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

export interface FeeDiscountCreate {
    student_id: number;
    fee_structure_id: number;
    is_percent: boolean;
    value: number;
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

export interface FinancialSummary {
    start_date: string;
    end_date: string;
    total_income: number;
    total_expense: number;
    net_balance: number;
}
