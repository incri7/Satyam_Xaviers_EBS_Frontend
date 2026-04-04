import { api } from '../axios';
import type {
    FeeStructure, FeeStructureCreate, FeeStructureUpdate,
    StudentFeeAssignment, StudentFeeAssignmentCreate, StudentFeeAssignmentUpdate,
    Payment, PaymentCreate, PaymentUpdate,
    FeeDiscount, FeeDiscountCreate, FeeDiscountUpdate,
    Expense, ExpenseCreate, ExpenseUpdate,
    FinancialSummary
} from '../../types/finance';

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
    }
};
