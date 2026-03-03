import React, { useState, useEffect } from 'react';
import { X, Search, User, CheckCircle2, ArrowRight, ChevronDown, UserPlus, Phone, Mail } from 'lucide-react';
import { cn } from '../../utils/cn';
import { peopleService } from '../../api/services/people.service';
import { academicsService } from '../../api/services/academics.service';
import type { Class } from '../../types/academic';

interface AddStudentToParentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import type { Parent } from '../../types/people';

export const AddStudentToParentModal: React.FC<AddStudentToParentModalProps> = ({ isOpen, onClose }) => {
    const getFullName = (p: Parent) => {
        return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
    };

    const [step, setStep] = useState<'select-parent' | 'student-details' | 'success'>('select-parent');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [parents, setParents] = useState<Parent[]>([]);
    const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
    const [classOptions, setClassOptions] = useState<Class[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [studentData, setStudentData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        gender: 'male',
        bloodGroup: 'A+',
        city: 'Hetauda',
        state: 'Makwanpur',
        pincode: '44107',
        admissionDate: new Date().toISOString().split('T')[0],
        admissionNo: '',
        classId: 0
    });

    useEffect(() => {
        if (isOpen) {
            fetchClasses();
        } else {
            resetModal();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.trim().length >= 1) {
            const timer = setTimeout(() => {
                handleSearch();
            }, 500);
            return () => clearTimeout(timer);
        } else if (searchQuery.trim().length === 0 && step === 'select-parent') {
            setParents([]);
        }
    }, [searchQuery]);

    const resetModal = () => {
        setStep('select-parent');
        setSearchQuery('');
        setParents([]);
        setSelectedParent(null);
        setError(null);
        setFieldErrors({});
        setStudentData({
            firstName: '',
            middleName: '',
            lastName: '',
            dob: '',
            gender: 'male',
            bloodGroup: 'A+',
            city: 'Hetauda',
            state: 'Makwanpur',
            pincode: '44107',
            admissionDate: new Date().toISOString().split('T')[0],
            admissionNo: '',
            classId: 0
        });
    };

    const fetchClasses = async () => {
        try {
            const res = await academicsService.getClasses();
            setClassOptions(res.classes);
            if (res.classes.length > 0) {
                setStudentData(prev => ({ ...prev, classId: res.classes[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch classes', err);
        }
    };

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await peopleService.getParents({ search: searchQuery });
            setParents(data.parents || []);
        } catch (err: any) {
            setError('Failed to search parents');
        } finally {
            setIsLoading(false);
        }
    };

    const validateStudentForm = () => {
        const errors: Record<string, string> = {};
        if (!studentData.firstName) errors.firstName = 'First name is required';
        if (!studentData.lastName) errors.lastName = 'Last name is required';
        if (!studentData.dob) errors.dob = 'Date of birth is required';
        if (!studentData.classId) errors.classId = 'Class is required';

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateStudentForm() || !selectedParent) return;

        setIsLoading(true);
        setError(null);
        try {
            await peopleService.createStudent({
                ...studentData,
                parentId: selectedParent.id
            });
            setStep('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err || 'Failed to add student');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Add Student to Parent</h2>
                            <p className="text-sm font-medium text-slate-500">
                                {step === 'select-parent' ? 'Step 1: Select a Parent' :
                                    step === 'student-details' ? 'Step 2: Student Details' : 'Completed'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium">
                            {error}
                        </div>
                    )}

                    {step === 'select-parent' && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by parent name, phone, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand text-white px-4 py-2 rounded-lg font-bold text-sm"
                                >
                                    Search
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 px-1">Search Results</h3>
                                {isLoading && <div className="text-center py-8 text-slate-500">Searching parents...</div>}
                                {!isLoading && parents.length === 0 && searchQuery && (
                                    <div className="text-center py-8 text-slate-500">No parents found matching your search.</div>
                                )}
                                {!isLoading && parents.map((parent) => (
                                    <button
                                        key={parent.id}
                                        onClick={() => setSelectedParent(parent)}
                                        className={cn(
                                            "w-full p-4 border rounded-xl text-left transition-all flex items-center justify-between group",
                                            selectedParent?.id === parent.id
                                                ? "border-brand bg-brand/5 ring-1 ring-brand"
                                                : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                selectedParent?.id === parent.id ? "bg-brand text-white" : "bg-slate-100 text-slate-500"
                                            )}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{getFullName(parent)}</p>
                                                <div className="flex items-center gap-4 mt-0.5">
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {parent.user?.phone}
                                                    </span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {parent.user?.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedParent?.id === parent.id && (
                                            <CheckCircle2 className="w-5 h-5 text-brand" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'student-details' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Selected Parent Info Mini-card */}
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand border border-slate-100 shadow-sm">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Assigning to Parent</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedParent ? getFullName(selectedParent) : ''}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep('select-parent')}
                                    className="text-xs font-bold text-brand hover:underline"
                                >
                                    Change Parent
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="First Name"
                                    asterisk
                                    placeholder="John"
                                    value={studentData.firstName}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, firstName: val }))}
                                    error={fieldErrors.firstName}
                                />
                                <FormInput
                                    label="Last Name"
                                    asterisk
                                    placeholder="Doe"
                                    value={studentData.lastName}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, lastName: val }))}
                                    error={fieldErrors.lastName}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Date of Birth"
                                    asterisk
                                    type="date"
                                    value={studentData.dob}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, dob: val }))}
                                    error={fieldErrors.dob}
                                />
                                <FormSelect
                                    label="Gender"
                                    asterisk
                                    options={[
                                        { label: 'Male', value: 'male' },
                                        { label: 'Female', value: 'female' },
                                        { label: 'Other', value: 'other' }
                                    ]}
                                    value={studentData.gender}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, gender: val }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormSelect
                                    label="Class/Grade"
                                    asterisk
                                    options={classOptions.map(c => ({ label: c.name, value: c.id.toString() }))}
                                    value={studentData.classId.toString()}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, classId: parseInt(val) }))}
                                    error={fieldErrors.classId}
                                />
                                <FormInput
                                    label="Admission Date"
                                    type="date"
                                    value={studentData.admissionDate}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, admissionDate: val }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Admission No (Optional)"
                                    placeholder="S-2024-001"
                                    value={studentData.admissionNo}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, admissionNo: val }))}
                                />
                                <FormSelect
                                    label="Blood Group"
                                    options={[
                                        { label: 'A+', value: 'A+' },
                                        { label: 'A-', value: 'A-' },
                                        { label: 'B+', value: 'B+' },
                                        { label: 'B-', value: 'B-' },
                                        { label: 'O+', value: 'O+' },
                                        { label: 'O-', value: 'O-' },
                                        { label: 'AB+', value: 'AB+' },
                                        { label: 'AB-', value: 'AB-' }
                                    ]}
                                    value={studentData.bloodGroup}
                                    onChange={(val: string) => setStudentData(p => ({ ...p, bloodGroup: val }))}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 border-4 border-white shadow-xl">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Student Added Successfully!</h3>
                                <p className="text-slate-500 font-medium mt-1">The student has been successfully assigned to {selectedParent ? getFullName(selectedParent) : ''}.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 'success' && (
                    <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button
                            onClick={step === 'student-details' ? () => setStep('select-parent') : onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            {step === 'student-details' ? 'Back' : 'Cancel'}
                        </button>

                        <button
                            disabled={isLoading || (step === 'select-parent' && !selectedParent)}
                            onClick={step === 'select-parent' ? () => setStep('student-details') : handleSubmit}
                            className="flex items-center gap-2 bg-brand text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : (
                                <>
                                    {step === 'select-parent' ? 'Continue to Details' : 'Add Student'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Reusing Form Components from RegistrationModal to maintain design consistency
const FormInput: React.FC<any> = ({ label, type = 'text', placeholder, value, onChange, asterisk, error, max }: { label: string, type?: string, placeholder?: string, value?: string, onChange?: (val: string) => void, asterisk?: boolean, error?: string, max?: string }) => (
    <div className="space-y-2 group text-left">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
            {label}
            {asterisk && <span className="text-red-500 font-bold">*</span>}
        </label>
        <div className="relative">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                max={max}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    "w-full bg-white border focus:ring-4 rounded-xl py-3.5 px-4 text-sm text-slate-900 font-semibold transition-all outline-none placeholder:text-slate-300",
                    error
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-100 focus:border-brand/30 focus:ring-brand/5 focus:bg-white"
                )}
            />
            {error && <p className="mt-1 text-[11px] font-bold text-red-500">{error}</p>}
        </div>
    </div>
);

const FormSelect: React.FC<any> = ({ label, options, value, onChange, asterisk, error }: { label: string, options: { label: string, value: string }[], value?: string, onChange?: (val: string) => void, asterisk?: boolean, error?: string }) => (
    <div className="space-y-2 group text-left">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
            {label}
            {asterisk && <span className="text-red-500 font-bold">*</span>}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    "w-full bg-white border focus:border-brand/30 rounded-xl py-3.5 px-4 text-sm text-slate-900 font-semibold transition-all outline-none appearance-none cursor-pointer",
                    error ? "border-red-300 focus:border-red-500" : "border-slate-100"
                )}
            >
                {options.map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-[11px] font-bold text-red-500">{error}</p>}
    </div>
);
