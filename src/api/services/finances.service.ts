import { api } from '../axios';
import type {
    FeeStructure, FeeStructureCreate, FeeStructureUpdate,
    StudentFeeAssignment, StudentFeeAssignmentCreate, StudentFeeAssignmentUpdate,
    Payment, PaymentCreate, PaymentUpdate,
    FeeDiscount, FeeDiscountCreate, FeeDiscountUpdate,
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
}

export interface OutstandingResponse {
    entries: OutstandingEntry[];
    total_outstanding: number;
}

export interface MonthlyReport {
    year: number;
    month: number;
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
    listPayments: async (studentId?: number): Promise<Payment[]> => {
        const response = await api.get('finances/payments', { params: { student_id: studentId } });
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

    // Reporting
    getFinancialSummary: async (startDate?: string, endDate?: string): Promise<FinancialSummary> => {
        const response = await api.get('finances/summary', {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data;
    },

    // Block 4 — Compliance additions
    getOutstanding: async (limit = 100): Promise<OutstandingResponse> => {
        const response = await api.get('finances/outstanding', { params: { limit } });
        return response.data;
    },

    sendBulkReminders: async (): Promise<{ message: string }> => {
        const response = await api.post('finances/reminders/send');
        return response.data;
    },

    getMonthlyReport: async (year: number, month: number): Promise<MonthlyReport> => {
        const response = await api.get('finances/reports/monthly', { params: { year, month } });
        return response.data;
    },

    reversePayment: async (paymentId: number, reason: string): Promise<Payment> => {
        const response = await api.post(`finances/payments/${paymentId}/reverse`, { reason });
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
