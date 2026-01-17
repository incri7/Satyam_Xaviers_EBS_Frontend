import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Users, ChevronDown, UserPlus, User, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRegistrationStore } from '../../store/useRegistrationStore';
import { peopleService } from '../../api/services/people.service';

export type RegistrationStep = 'user-account' | 'parent-details' | 'student-registration';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Student {
    admissionNo: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string;
    gender: string;
    bloodGroup: string;
    city: string;
    state: string;
    pincode: string;
    admissionDate: string;
    grade: string;
    section: string;
    relationship: string;
    isPrimary: boolean;
}

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string; // Added password
    role: string;
    middleName: string;
    occupation: string;
    nationalId: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    students: Student[];
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose }) => {
    const { setStep1, setStep2, addStudent: storeAddStudent, updateStudent: storeUpdateStudent, removeStudent: storeRemoveStudent, reset: resetStore } = useRegistrationStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    const [currentStep, setCurrentStep] = useState<RegistrationStep>('user-account');
    const [studentStepView, setStudentStepView] = useState<'choice' | 'list' | 'form'>('choice');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const initialFormData: FormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'Parent',
        middleName: '',
        occupation: '',
        nationalId: '',
        address: '',
        city: 'Kathmandu',
        state: 'Bagmati',
        pincode: '44600',
        students: [],
    };

    const [formData, setFormData] = useState<FormData>(initialFormData);

    const [currentStudent, setCurrentStudent] = useState<Student>({
        admissionNo: '',
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        gender: 'Select gender',
        bloodGroup: 'Select blood group',
        city: 'Kathmandu',
        state: 'Bagmati',
        pincode: '44600',
        admissionDate: '',
        grade: 'Select class',
        section: 'Select section',
        relationship: 'Father',
        isPrimary: false,
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSuccess(false);
            setError(null);
            setFieldErrors({});
            setCurrentStep('user-account');
            setStudentStepView('choice');
            setEditingIndex(null);
            setFormData(initialFormData);
            resetStore();
        }
    }, [isOpen]);

    // Initialize currentStudent admissionNo when component opens or students change
    useEffect(() => {
        if (isOpen && !currentStudent.admissionNo) {
            setCurrentStudent((prev: Student) => ({
                ...prev,
                admissionNo: `ADM-2026-${String(formData.students.length + 1).padStart(3, '0')}`
            }));
        }
    }, [isOpen, formData.students.length, currentStudent.admissionNo]);

    if (!isOpen) return null;

    const steps: { id: RegistrationStep; label: string }[] = [
        { id: 'user-account', label: 'User Account' },
        { id: 'parent-details', label: 'Parent Details' },
        { id: 'student-registration', label: 'Student Info' },
    ];

    const stepIndex = steps.findIndex(s => s.id === currentStep);

    const validateStep = () => {
        const errors: Record<string, string> = {};

        if (currentStep === 'user-account') {
            if (!formData.firstName) errors.firstName = 'First name is required';
            if (!formData.lastName) errors.lastName = 'Last name is required';
            if (!formData.email) errors.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
            if (!formData.phone) errors.phone = 'Phone number is required';
        } else if (currentStep === 'parent-details') {
            if (!formData.firstName) errors.firstName = 'First name is required';
            if (!formData.lastName) errors.lastName = 'Last name is required';
            if (!formData.city) errors.city = 'City is required';
            if (!formData.state) errors.state = 'State is required';
            if (!formData.pincode) errors.pincode = 'Pincode is required';
        } else if (currentStep === 'student-registration') {
            if (formData.students.length === 0) {
                setError('Please add at least one student before completing registration.');
                return false;
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStudent = () => {
        const errors: Record<string, string> = {};
        if (!currentStudent.firstName) errors.studentFirstName = 'First name is required';
        if (!currentStudent.lastName) errors.studentLastName = 'Last name is required';
        if (!currentStudent.dob) errors.studentDob = 'Date of birth is required';
        if (currentStudent.gender === 'Select gender') errors.studentGender = 'Gender is required';
        if (currentStudent.grade === 'Select class') errors.studentGrade = 'Class is required';
        if (currentStudent.section === 'Select section') errors.studentSection = 'Section is required';

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const updateField = (field: keyof FormData, value: any) => {
        setFormData((prev: FormData) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const updateStudentField = (field: keyof Student, value: any) => {
        setCurrentStudent((prev: Student) => ({ ...prev, [field]: value }));
        const errorKey = `student${field.charAt(0).toUpperCase()}${field.slice(1)}`;
        if (fieldErrors[errorKey]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const saveStudent = () => {
        if (!validateStudent()) return;

        if (editingIndex !== null) {
            const updatedStudents = [...formData.students];
            updatedStudents[editingIndex] = currentStudent;
            updateField('students', updatedStudents);
            storeUpdateStudent(editingIndex, {
                ...currentStudent,
                relationship: currentStudent.relationship
            });
        } else {
            updateField('students', [...formData.students, currentStudent]);
            storeAddStudent({
                ...currentStudent,
                relationship: currentStudent.relationship
            });
        }
        setStudentStepView('list');
        setEditingIndex(null);
    };

    const handleAddStudent = () => {
        setCurrentStudent({
            admissionNo: `ADM-2026-${String(formData.students.length + 1).padStart(3, '0')}`,
            firstName: '',
            middleName: '',
            lastName: '',
            dob: '',
            gender: 'Select gender',
            bloodGroup: 'Select blood group',
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            admissionDate: new Date().toISOString().split('T')[0],
            grade: 'Select class',
            section: 'Select section',
            relationship: 'Father',
            isPrimary: formData.students.length === 0,
        });
        setEditingIndex(null);
        setStudentStepView('form');
    };

    const handleEditStudent = (index: number) => {
        setCurrentStudent(formData.students[index]);
        setEditingIndex(index);
        setStudentStepView('form');
    };

    const handleRemoveStudent = (index: number) => {
        const updatedStudents = formData.students.filter((_, i) => i !== index);
        updateField('students', updatedStudents);
        storeRemoveStudent(index);
        if (updatedStudents.length === 0) {
            setStudentStepView('choice');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="p-8 pb-4 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Parent & Student Registration</h2>
                                <p className="text-sm font-medium text-slate-500">Step 1 of 3</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Thin Progress Bar */}
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand transition-all duration-500"
                            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                                idx === stepIndex
                                    ? "bg-brand text-white"
                                    : idx < stepIndex
                                        ? "bg-green-500 text-white"
                                        : "bg-slate-100 text-slate-400"
                            )}>
                                {idx < stepIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>
                            <span className={cn(
                                "text-sm font-semibold transition-colors",
                                idx === stepIndex ? "text-slate-900" : "text-slate-400"
                            )}>
                                {idx === 0 ? 'User Account' : idx === 1 ? 'Parent Details' : 'Add Students'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-10 bg-white">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-8 bg-green-50 border border-green-100 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-green-500 shadow-sm">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900">Registration Successful!</h3>
                                <p className="text-sm text-green-700 font-medium">Please check your email for login credentials.</p>
                            </div>
                        </div>
                    )}

                    {!success && currentStep === 'user-account' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
                            {/* Blue Info Box */}
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <User className="w-4 h-4" />
                                </div>
                                <p className="text-sm text-blue-700 font-medium">
                                    You are creating a parent account. <span className="text-blue-600">The parent will receive login credentials via email.</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="First Name" asterisk placeholder="Ram" value={formData.firstName} onChange={(val) => updateField('firstName', val)} error={fieldErrors.firstName} />
                                <FormInput label="Last Name" asterisk placeholder="Sharma" value={formData.lastName} onChange={(val) => updateField('lastName', val)} error={fieldErrors.lastName} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Email Address" asterisk type="email" placeholder="parent@example.com" value={formData.email} onChange={(val) => updateField('email', val)} error={fieldErrors.email} />
                                <FormInput label="Phone Number" asterisk placeholder="+977-9841234567" value={formData.phone} onChange={(val) => updateField('phone', val)} error={fieldErrors.phone} />
                            </div>


                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900">Role <span className="text-red-500">*</span></label>
                                <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-brand/5 rounded-xl flex items-center justify-center text-brand">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Parent</p>
                                            <p className="text-xs text-slate-500">This role is automatically assigned</p>
                                        </div>
                                    </div>
                                    <Lock className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium px-1">Role is automatically set to Parent for this registration and cannot be changed.</p>
                            </div>

                            {/* Yellow Note Box */}
                            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-bold">Note:</span> A temporary password will be automatically generated and sent to the parent's email address. The parent must change this password on first login.
                                </p>
                            </div>
                        </div>
                    )}

                    {!success && currentStep === 'parent-details' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-10">
                            {/* Personal Details */}
                            <div className="space-y-6">
                                <div className="border-b border-slate-100 pb-2">
                                    <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormInput label="First Name" asterisk placeholder="Ram" value={formData.firstName} onChange={(val) => updateField('firstName', val)} error={fieldErrors.firstName} />
                                    <FormInput label="Middle Name" placeholder="Kumar" value={formData.middleName} onChange={(val) => updateField('middleName', val)} />
                                    <FormInput label="Last Name" asterisk placeholder="Sharma" value={formData.lastName} onChange={(val) => updateField('lastName', val)} error={fieldErrors.lastName} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput label="Occupation" placeholder="Engineer" value={formData.occupation} onChange={(val) => updateField('occupation', val)} />
                                    <FormInput label="National ID (Citizenship)" placeholder="12345-6789-0123" value={formData.nationalId} onChange={(val) => updateField('nationalId', val)} />
                                </div>
                            </div>

                            {/* Address Details */}
                            <div className="space-y-6">
                                <div className="border-b border-slate-100 pb-2">
                                    <h3 className="text-lg font-bold text-slate-900">Address Details</h3>
                                </div>
                                <FormInput label="Address Line" placeholder="Kathmandu-15, Baneshwor" value={formData.address} onChange={(val) => updateField('address', val)} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormInput label="City" asterisk placeholder="Kathmandu" value={formData.city} onChange={(val) => updateField('city', val)} error={fieldErrors.city} />
                                    <FormInput label="State" asterisk placeholder="Bagmati" value={formData.state} onChange={(val) => updateField('state', val)} error={fieldErrors.state} />
                                    <FormInput label="Pincode" asterisk placeholder="44600" value={formData.pincode} onChange={(val) => updateField('pincode', val)} error={fieldErrors.pincode} />
                                </div>
                            </div>
                        </div>
                    )}

                    {!success && currentStep === 'student-registration' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            {studentStepView === 'choice' && (
                                <div className="max-w-2xl mx-auto text-center space-y-8 py-10">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                                        <GraduationCap className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-slate-900">Would you like to add students now?</h3>
                                        <p className="text-slate-500">You can add multiple students and specify your relationship with each.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={handleAddStudent}
                                            className="p-8 border-2 border-brand/20 bg-brand/5 rounded-2xl group hover:border-brand transition-all text-left space-y-4"
                                        >
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
                                                <UserPlus className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-slate-900 group-hover:text-brand transition-colors">Add a Student</p>
                                                <p className="text-sm text-slate-500">Register students to the parent account</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="p-8 border-2 border-slate-100 bg-white rounded-2xl group hover:border-slate-300 transition-all text-left space-y-4"
                                        >
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                                                <ArrowRight className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-slate-900">Skip for Now</p>
                                                <p className="text-sm text-slate-500">You can add students later from the dashboard</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {studentStepView === 'list' && (
                                <div className="max-w-4xl mx-auto space-y-6 pb-10">
                                    <h3 className="text-lg font-bold text-slate-900">Students Added ({formData.students.length})</h3>
                                    <div className="space-y-4">
                                        {formData.students.map((student, idx) => (
                                            <div key={idx} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group hover:border-brand/30 transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                                                        <GraduationCap className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                                                            {student.isPrimary && (
                                                                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">Primary Contact</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-6 text-xs text-slate-500 font-medium tracking-tight">
                                                            <span>Admission No: {student.admissionNo}</span>
                                                            <span>Relationship: {student.relationship}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleEditStudent(idx)}
                                                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveStudent(idx)}
                                                        className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddStudent}
                                            className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold text-sm hover:border-brand hover:text-brand hover:bg-brand/5 transition-all"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add Another Student
                                        </button>
                                    </div>
                                </div>
                            )}

                            {studentStepView === 'form' && (
                                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-sm text-blue-800 font-bold">Student #{editingIndex !== null ? editingIndex + 1 : formData.students.length + 1} Information</p>
                                        <p className="text-xs text-blue-600 font-medium">Fill in the student details below</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-2">
                                                <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <FormInput label="Admission Number" asterisk value={currentStudent.admissionNo} onChange={val => updateStudentField('admissionNo', val)} />
                                                <p className="text-[10px] text-slate-400 font-medium px-1">Auto-generated but can be edited</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormInput label="First Name" asterisk placeholder="Sita" value={currentStudent.firstName} onChange={val => updateStudentField('firstName', val)} error={fieldErrors.studentFirstName} />
                                                <FormInput label="Middle Name" placeholder="Kumar" value={currentStudent.middleName} onChange={val => updateStudentField('middleName', val)} />
                                                <FormInput label="Last Name" asterisk placeholder="Sharma" value={currentStudent.lastName} onChange={val => updateStudentField('lastName', val)} error={fieldErrors.studentLastName} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormInput label="Date of Birth" asterisk type="date" value={currentStudent.dob} onChange={val => updateStudentField('dob', val)} error={fieldErrors.studentDob} />
                                                <FormSelect label="Gender" asterisk options={['Select gender', 'Male', 'Female', 'Other']} value={currentStudent.gender} onChange={val => updateStudentField('gender', val)} error={fieldErrors.studentGender} />
                                                <FormSelect label="Blood Group" options={['Select blood group', 'A+', 'B+', 'O+', 'AB+']} value={currentStudent.bloodGroup} onChange={val => updateStudentField('bloodGroup', val)} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-2">
                                                <h3 className="text-lg font-bold text-slate-900">Address Details</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormInput label="City" placeholder="Kathmandu" value={currentStudent.city} onChange={val => updateStudentField('city', val)} />
                                                <FormInput label="State" placeholder="Bagmati" value={currentStudent.state} onChange={val => updateStudentField('state', val)} />
                                                <FormInput label="Pincode" placeholder="44600" value={currentStudent.pincode} onChange={val => updateStudentField('pincode', val)} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-2">
                                                <h3 className="text-lg font-bold text-slate-900">Academic Placement</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <FormInput label="Admission Date" type="date" value={currentStudent.admissionDate} onChange={val => updateStudentField('admissionDate', val)} />
                                                <FormSelect label="Class" asterisk options={['Select class', 'Grade 1', 'Grade 2', 'Grade 10']} value={currentStudent.grade} onChange={val => updateStudentField('grade', val)} error={fieldErrors.studentGrade} />
                                                <FormSelect label="Section" asterisk options={['Select section', 'A', 'B', 'C']} value={currentStudent.section} onChange={val => updateStudentField('section', val)} error={fieldErrors.studentSection} />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="border-b border-slate-100 pb-2">
                                                <h3 className="text-lg font-bold text-slate-900">Relationship with Student</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-sm font-bold text-slate-900">I am the student's <span className="text-red-500">*</span></p>
                                                <div className="space-y-3">
                                                    {['Father', 'Mother', 'Guardian', 'Other'].map(rel => (
                                                        <label key={rel} className="flex items-center gap-3 cursor-pointer group">
                                                            <input
                                                                type="radio"
                                                                name="relationship"
                                                                checked={currentStudent.relationship === rel}
                                                                onChange={() => updateStudentField('relationship', rel)}
                                                                className="w-4 h-4 text-brand bg-slate-50 border-slate-200 focus:ring-brand ring-offset-0"
                                                            />
                                                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{rel}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="pt-4 border-t border-slate-50">
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentStudent.isPrimary}
                                                            onChange={e => updateStudentField('isPrimary', e.target.checked)}
                                                            className="w-4 h-4 text-brand bg-slate-50 border-slate-200 rounded focus:ring-brand ring-offset-0"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">Set as primary contact for this student</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">The school will contact you first for this student</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex justify-between">
                                        <button
                                            onClick={() => formData.students.length > 0 ? setStudentStepView('list') : setStudentStepView('choice')}
                                            className="px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-100"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveStudent}
                                            className="flex items-center gap-2 bg-brand text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Save Student
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                {!success && (
                    <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-white px-10">
                        <div>
                            {currentStep !== 'user-account' && (
                                <button
                                    onClick={() => {
                                        if (currentStep === 'parent-details') setCurrentStep('user-account');
                                        if (currentStep === 'student-registration') setCurrentStep('parent-details');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                            )}
                        </div>

                        {currentStep === 'student-registration' && studentStepView === 'form' ? null : (
                            <button
                                disabled={isLoading}
                                onClick={async () => {
                                    if (!validateStep()) return;

                                    if (currentStep === 'user-account') {
                                        setStep1({
                                            email: formData.email,
                                            phone: formData.phone,
                                            password: "",
                                            firstName: formData.firstName,
                                            lastName: formData.lastName
                                        });
                                        setCurrentStep('parent-details');
                                    } else if (currentStep === 'parent-details') {
                                        setStep2({
                                            firstName: formData.firstName,
                                            lastName: formData.lastName,
                                            middleName: formData.middleName,
                                            occupation: formData.occupation,
                                            nationalId: formData.nationalId,
                                            address: formData.address,
                                            city: formData.city,
                                            state: formData.state,
                                            pincode: formData.pincode
                                        });
                                        setCurrentStep('student-registration');
                                    } else if (currentStep === 'student-registration') {
                                        // Final Complete
                                        try {
                                            setIsLoading(true);
                                            setError(null);

                                            const registrationData = {
                                                userAccount: {
                                                    email: formData.email,
                                                    phone: formData.phone,
                                                    password: formData.password
                                                },
                                                parentProfile: {
                                                    firstName: formData.firstName,
                                                    lastName: formData.lastName,
                                                    middleName: formData.middleName,
                                                    occupation: formData.occupation,
                                                    nationalId: formData.nationalId,
                                                    address: formData.address,
                                                    city: formData.city,
                                                    state: formData.state,
                                                    pincode: formData.pincode
                                                },
                                                students: formData.students
                                            };

                                            await peopleService.registerParentStudent(registrationData);
                                            setSuccess(true);
                                            resetStore();
                                            setTimeout(() => {
                                                onClose();
                                            }, 2000);
                                        } catch (err: any) {
                                            setError(err);
                                            setSuccess(false);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }
                                }}
                                className={cn(
                                    "group flex items-center gap-3 bg-brand hover:opacity-90 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                    (isLoading || success) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isLoading ? 'Processing...' : currentStep === 'student-registration' ? (
                                    <>
                                        Complete Registration
                                        <CheckCircle2 className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        {currentStep === 'parent-details' ? 'Continue to Students' : 'Continue to Parent Details'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface FormInputProps {
    label: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    asterisk?: boolean;
    error?: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, type = 'text', placeholder, value, onChange, asterisk, error }) => (
    <div className="space-y-2 group text-left">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-1 transition-colors">
            {label}
            {asterisk && <span className="text-red-500 font-bold">*</span>}
        </label>
        <div className="relative">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    "w-full bg-[#F8F9FB] border focus:bg-white focus:ring-4 rounded-xl py-4 px-5 text-sm text-slate-900 font-semibold transition-all outline-none placeholder:text-slate-300",
                    error
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-100 focus:border-brand/30 focus:ring-brand/5"
                )}
            />
            {error && (
                <p className="mt-1.5 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    </div>
);

interface FormSelectProps {
    label: string;
    options: string[];
    value?: string;
    onChange?: (val: string) => void;
    asterisk?: boolean;
    error?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ label, options, value, onChange, asterisk, error }) => (
    <div className="space-y-2 group text-left">
        <label className="text-sm font-bold text-slate-900 transition-colors uppercase tracking-tight text-[11px] mb-1 block pl-0.5">
            {label}
            {asterisk && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    "w-full bg-[#F8F9FB] border focus:bg-white rounded-xl py-3.5 px-5 text-sm text-slate-900 font-bold transition-all outline-none appearance-none cursor-pointer",
                    error ? "border-red-300 focus:border-red-500" : "border-slate-100 focus:border-brand/30"
                )}
            >
                {options.map((opt: string) => <option key={opt} className="font-semibold">{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && (
            <p className="mt-1.5 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 pl-0.5">
                {error}
            </p>
        )}
    </div>
);
