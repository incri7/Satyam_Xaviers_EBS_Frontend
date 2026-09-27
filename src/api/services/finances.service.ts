import { api } from '../axios';
import type {
    FeeStructure, FeeStructureCreate, FeeStructureUpdate,
    StudentFeeAssignment, StudentFeeAssignmentCreate, StudentFeeAssignmentUpdate,
    Payment, PaymentCreate, PaymentUpdate,
    FeeDiscount, FeeDiscountCreate, FeeDiscountUpdate, FeeDiscountPage, AuditGroup, AuditPage,
    Expense, ExpenseCreate, ExpenseUpdate,
    FinancialSummary
} from '../../types/finance';

export interface OutstandingEntry {
    student_id: number;
    student_name: string;
    admission_no: string;
    total_assigned: number;
    total_paid: number;
    balance: number;
    days_overdue: number;
    risk: 'High' | 'Medium' | 'Low';
    class_name: string | null;
}

export interface OutstandingResponse {
    entries: OutstandingEntry[];
    total_outstanding: number;
    total_count: number;
    /** Every payment taken, net of reversals. Unaffected by the filters — the
     *  arrears list narrows, the school's takings do not. */
    total_collected: number;
    /** total_collected + total_outstanding: fees raised so far, settled and
     *  unsettled. Summed server-side so the figures cannot drift apart. */
    total_raised: number;
}

export interface OutstandingParams {
    limit?: number;
    offset?: number;
    search?: string;
    risk?: 'High' | 'Medium' | 'Low';
    class_id?: number;
}

export type LedgerKind = 'income' | 'expense';

export interface LedgerEntry {
    kind: LedgerKind;
    id: number;
    date: string;
    /** Fee head for income, expense category for spending. */
    label: string;
    /** Who paid, or who was paid. */
    party: string;
    /** Receipt number for income, invoice number for spending. */
    reference: string;
    method: string;
    amount: number;
}

export interface LedgerBucket {
    label: string;
    amount: number;
    count: number;
}

export interface LedgerResponse {
    start_date: string;
    end_date: string;
    total_income: number;
    total_expense: number;
    net_balance: number;
    income_by_head: LedgerBucket[];
    expense_by_head: LedgerBucket[];
    entries: LedgerEntry[];
    total_count: number;
}

export interface LedgerParams {
    start_date?: string;
    end_date?: string;
    kind?: 'all' | LedgerKind;
    search?: string;
    label?: string;
    sort_by?: 'date' | 'amount' | 'label' | 'party';
    sort_dir?: 'asc' | 'desc';
    skip?: number;
    limit?: number;
    /** Marks the request as an export, so it is recorded in the activity log. */
    export?: boolean;
}

export interface MonthlyReport {
    year: number;
    month: number;
    /** The Nepali month the figures cover: 1 = Baisakh … 12 = Chaitra. */
    bs_year: number;
    bs_month: number;
    start_date: string;
    end_date: string;
    total_collected: number;
    transaction_count: number;
    first_receipt: string | null;
    last_receipt: string | null;
    receipt_gaps: string[];
    outstanding_balance: number;
    generated_at: string;
}

export const financesService = {
    // Fee Structures
    getFeeStructures: async (activeOnly: boolean = false): Promise<FeeStructure[]> => {
        const response = await api.get('finances/fee-structures', { params: { active_only: activeOnly } });
        return response.data;
    },
    createFeeStructure: async (data: FeeStructureCreate): Promise<FeeStructure> => {
        const response = await api.post('finances/fee-structures', data);
        return response.data;
    },
    updateFeeStructure: async (id: number, data: FeeStructureUpdate): Promise<FeeStructure> => {
        const response = await api.put(`finances/fee-structures/${id}`, data);
        return response.data;
    },
    deactivateFeeStructure: async (id: number): Promise<FeeStructure> => {
        const response = await api.delete(`finances/fee-structures/${id}`);
        return response.data;
    },

    // Student Fee Assignments
    getStudentFees: async (studentId: number): Promise<StudentFeeAssignment[]> => {
        const response = await api.get(`finances/student-fees/${studentId}`);
        return response.data;
    },
    assignFeeToStudent: async (data: StudentFeeAssignmentCreate): Promise<StudentFeeAssignment> => {
        const response = await api.post('finances/student-fees', data);
        return response.data;
    },
    updateStudentFeeAssignment: async (id: number, data: StudentFeeAssignmentUpdate): Promise<StudentFeeAssignment> => {
        const response = await api.put(`finances/student-fees/${id}`, data);
        return response.data;
    },

    // Payments
    /** Newest first. Without a student, `limit` (max 500) pages through all payments. */
    listPayments: async (studentId?: number, page: { skip?: number; limit?: number } = {}): Promise<Payment[]> => {
        const response = await api.get('finances/payments', { params: { student_id: studentId, ...page } });
        return response.data;
    },
    recordPayment: async (data: PaymentCreate): Promise<Payment> => {
        const response = await api.post('finances/payments', data);
        return response.data;
    },
    updatePayment: async (id: number, data: PaymentUpdate): Promise<Payment> => {
        const response = await api.put(`finances/payments/${id}`, data);
        return response.data;
    },
    voidPayment: async (id: number): Promise<Payment> => {
        const response = await api.delete(`finances/payments/${id}`);
        return response.data;
    },

    // Discounts
    createDiscount: async (data: FeeDiscountCreate): Promise<FeeDiscount> => {
        const response = await api.post('finances/discounts', data);
        return response.data;
    },
    updateDiscount: async (id: number, data: FeeDiscountUpdate): Promise<FeeDiscount> => {
        const response = await api.put(`finances/discounts/${id}`, data);
        return response.data;
    },
    deleteDiscount: async (id: number): Promise<FeeDiscount> => {
        const response = await api.delete(`finances/discounts/${id}`);
        return response.data;
    },

    // Expenses
    listExpenses: async (category?: string): Promise<Expense[]> => {
        const response = await api.get('finances/expenses', { params: { category } });
        return response.data;
    },
    recordExpense: async (data: ExpenseCreate): Promise<Expense> => {
        const response = await api.post('finances/expenses', data);
        return response.data;
    },
    updateExpense: async (id: number, data: ExpenseUpdate): Promise<Expense> => {
        const response = await api.put(`finances/expenses/${id}`, data);
        return response.data;
    },
    voidExpense: async (id: number): Promise<Expense> => {
        const response = await api.delete(`finances/expenses/${id}`);
        return response.data;
    },
    /** Photo or PDF of the bill (jpg, png, webp or pdf). */
    uploadExpenseAttachment: async (id: number, file: File): Promise<Expense> => {
        const form = new FormData();
        form.append('file', file);
        const response = await api.post(`finances/expenses/${id}/attachment`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    getExpenseAttachment: async (id: number): Promise<Blob> => {
        const response = await api.get(`finances/expenses/${id}/attachment`, { responseType: 'blob' });
        return response.data;
    },

    // Reporting
    /** Every rupee in and out over a period — what the summary cards drill into. */
    getLedger: async (params: LedgerParams = {}): Promise<LedgerResponse> => {
        const response = await api.get('finances/ledger', { params });
        return response.data;
    },

    getFinancialSummary: async (startDate?: string, endDate?: string): Promise<FinancialSummary> => {
        const response = await api.get('finances/summary', {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data;
    },

    // Block 4 — Compliance additions
    getOutstanding: async (params: number | OutstandingParams = 100): Promise<OutstandingResponse> => {
        const query = typeof params === 'number' ? { limit: params } : params;
        const response = await api.get('finances/outstanding', { params: query });
        return response.data;
    },

    sendBulkReminders: async (studentIds?: number[]): Promise<{ message: string }> => {
        const response = await api.post('finances/reminders/send', {
            student_ids: studentIds && studentIds.length > 0 ? studentIds : null,
        });
        return response.data;
    },

    /** One Nepali month's collection; month 1 is Baisakh. */
    getMonthlyReport: async (bsYear: number, bsMonth: number): Promise<MonthlyReport> => {
        const response = await api.get('finances/reports/monthly', { params: { bs_year: bsYear, bs_month: bsMonth } });
        return response.data;
    },

    reversePayment: async (paymentId: number, reason: string): Promise<Payment> => {
        const response = await api.post(`finances/payments/${paymentId}/reverse`, { reason });
        return response.data;
    },

    /** Every scholarship in the school, newest first. */
    listDiscounts: async (params: { search?: string; skip?: number; limit?: number } = {}): Promise<FeeDiscountPage> => {
        const response = await api.get<FeeDiscountPage>('finances/discounts', { params });
        return response.data;
    },
    /** The append-only log of money actions, newest first. */
    getAuditLog: async (params: { group?: AuditGroup; start_date?: string; end_date?: string; skip?: number; limit?: number } = {}): Promise<AuditPage> => {
        const response = await api.get<AuditPage>('finances/audit-log', { params });
        return response.data;
    },
    getStudentDiscounts: async (studentId: number): Promise<FeeDiscount[]> => {
        const response = await api.get(`finances/discounts/${studentId}`);
        return response.data;
    },

    downloadReceiptBlob: async (paymentId: number): Promise<Blob> => {
        const response = await api.get(`finances/payments/${paymentId}/receipt`, {
            responseType: 'blob',
        });
        return response.data;
    },
};
