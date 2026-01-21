import { create } from 'zustand';

interface Student {
    firstName: string;
    lastName: string;
    relationship: string;
    isPrimary: boolean;
    classId?: number;
    sectionId?: number;
    admissionDate?: string;
}

interface RegistrationState {
    userAccount: any | null;
    parentProfile: any | null;
    students: Student[];

    setStep1: (data: any) => void;
    setStep2: (data: any) => void;
    addStudent: (student: Student) => void;
    updateStudent: (index: number, student: Student) => void;
    removeStudent: (index: number) => void;
    reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
    userAccount: null,
    parentProfile: null,
    students: [],

    setStep1: (data) => set({ userAccount: data }),
    setStep2: (data) => set({ parentProfile: data }),
    addStudent: (student) => set((state) => ({
        students: [...state.students, student]
    })),
    updateStudent: (index, student) => set((state) => {
        const updatedStudents = [...state.students];
        updatedStudents[index] = student;
        return { students: updatedStudents };
    }),
    removeStudent: (index) => set((state) => ({
        students: state.students.filter((_, i) => i !== index)
    })),
    reset: () => set({ userAccount: null, parentProfile: null, students: [] }),
}));
