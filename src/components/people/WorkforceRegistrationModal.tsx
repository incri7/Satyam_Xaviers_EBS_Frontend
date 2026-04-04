import React, { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle2, Shield, User, Mail, Phone, ChevronDown, Briefcase, Calendar, MapPin, Heart, GraduationCap, Hash } from 'lucide-react';
import { cn } from '../../utils/cn';
import { peopleService } from '../../api/services/people.service';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserRegistrationCreate, TeacherUnifiedCreate, StaffUnifiedCreate } from '../../types/people';

interface WorkforceRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRole?: string;
    onSuccess?: () => void;
}

const GENDER_OPTIONS = [
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' },
    { label: 'Other', value: 'O' },
];

const BLOOD_GROUP_OPTIONS = [
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
];

const ROLE_OPTIONS = [
    { label: 'Admin', value: 'admin' },
    { label: 'Principal', value: 'principal' },
    { label: 'Accountant', value: 'accountant' },
    { label: 'Coordinator', value: 'coordinator' },
    { label: 'Teacher', value: 'teacher' },
    { label: 'Staff', value: 'staff' },
];

const roleHasProfile = (role: string) => role === 'teacher' || role === 'staff';

export const WorkforceRegistrationModal: React.FC<WorkforceRegistrationModalProps> = ({
    isOpen,
    onClose,
    initialRole = 'teacher',
    onSuccess
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // User-level fields
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: initialRole,
    });

    // Teacher-specific fields
    const [teacherData, setTeacherData] = useState<TeacherUnifiedCreate>({
        first_name: '',
        last_name: '',
        staff_code: '',
        designation: '',
        join_date: '',
        dob: '',
        gender: '',
        blood_group: '',
        qualification: '',
        experience_years: undefined,
        address_line: '',
        city: '',
        state: '',
        pincode: '',
    });

    // Staff-specific fields
    const [staffData, setStaffData] = useState<StaffUnifiedCreate>({
        first_name: '',
        last_name: '',
        staff_code: '',
        designation: '',
        join_date: '',
        dob: '',
        gender: '',
        blood_group: '',
        address_line: '',
        city: '',
        state: '',
        pincode: '',
    });

    // Sync first/last name to role-specific data
    useEffect(() => {
        setTeacherData(prev => ({ ...prev, first_name: formData.first_name, last_name: formData.last_name }));
        setStaffData(prev => ({ ...prev, first_name: formData.first_name, last_name: formData.last_name }));
    }, [formData.first_name, formData.last_name]);

    if (!isOpen) return null;

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!formData.first_name.trim()) errors.first_name = 'First name is required';
        if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        if (!formData.role) errors.role = 'Role is required';

        // Validate teacher-specific required fields
        if (formData.role === 'teacher') {
            if (!teacherData.designation?.trim()) errors.teacher_designation = 'Designation is required';
        }

        // Validate staff-specific required fields
        if (formData.role === 'staff') {
            if (!staffData.designation?.trim()) errors.staff_designation = 'Designation is required';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleReset = () => {
        setFormData({ first_name: '', last_name: '', email: '', phone: '', role: initialRole });
        setTeacherData({ first_name: '', last_name: '', staff_code: '', designation: '', join_date: '', dob: '', gender: '', blood_group: '', qualification: '', experience_years: undefined, address_line: '', city: '', state: '', pincode: '' });
        setStaffData({ first_name: '', last_name: '', staff_code: '', designation: '', join_date: '', dob: '', gender: '', blood_group: '', address_line: '', city: '', state: '', pincode: '' });
        setFieldErrors({});
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setError(null);

        try {
            // Build clean payload, stripping empty strings
            const cleanObj = <T extends Record<string, any>>(obj: T): Partial<T> => {
                const result: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== '' && value !== undefined && value !== null) {
                        result[key] = value;
                    }
                }
                return result;
            };

            const payload: UserRegistrationCreate = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
            };

            if (formData.role === 'teacher') {
                const cleanTeacher = cleanObj(teacherData);
                // Always include first/last name
                cleanTeacher.first_name = formData.first_name;
                cleanTeacher.last_name = formData.last_name;
                payload.teacher_in = cleanTeacher as TeacherUnifiedCreate;
            }

            if (formData.role === 'staff') {
                const cleanStaff = cleanObj(staffData);
                cleanStaff.first_name = formData.first_name;
                cleanStaff.last_name = formData.last_name;
                payload.staff_in = cleanStaff as StaffUnifiedCreate;
            }

            await peopleService.registerUser(payload);
            setSuccess(true);
            if (onSuccess) onSuccess();
            setTimeout(() => {
                onClose();
                setSuccess(false);
                handleReset();
            }, 2000);
        } catch (err: any) {
            const errorData = err?.response?.data?.detail || err;
            let errorMessage = 'Registration failed';

            if (typeof errorData === 'string') {
                errorMessage = errorData;
            } else if (Array.isArray(errorData)) {
                errorMessage = errorData.map((e: any) => `${e.loc?.join('.') || ''}: ${e.msg}`).join(', ');
            } else if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = JSON.stringify(errorData);
            } else {
                errorMessage = err?.message || errorMessage;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const showProfileSection = roleHasProfile(formData.role);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-brand p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <UserPlus size={120} />
                    </div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Register New User</h2>
                            <p className="text-brand-50/80 font-medium text-sm">Create account with role-specific profile details</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form */}
                <div className="overflow-y-auto flex-1 p-8 pb-10 bg-white">
                    {success ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900">Registration Successful!</h3>
                                <p className="text-slate-500 font-medium">A welcome email has been sent to the user.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-semibold animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            {/* === SECTION: Account Details === */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <User size={16} className="text-brand" />
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Account Details</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="First Name"
                                        icon={<User size={18} />}
                                        placeholder="Enter first name"
                                        value={formData.first_name}
                                        onChange={(v) => setFormData({ ...formData, first_name: v })}
                                        error={fieldErrors.first_name}
                                        required
                                    />
                                    <FormInput
                                        label="Last Name"
                                        placeholder="Enter last name"
                                        value={formData.last_name}
                                        onChange={(v) => setFormData({ ...formData, last_name: v })}
                                        error={fieldErrors.last_name}
                                        required
                                    />
                                </div>

                                <FormInput
                                    label="Email Address"
                                    icon={<Mail size={18} />}
                                    type="email"
                                    placeholder="personnel@stxaviers.edu.np"
                                    value={formData.email}
                                    onChange={(v) => setFormData({ ...formData, email: v })}
                                    error={fieldErrors.email}
                                    required
                                />

                                <FormInput
                                    label="Phone Number"
                                    icon={<Phone size={18} />}
                                    placeholder="+977-98XXXXXXXX"
                                    value={formData.phone}
                                    onChange={(v) => setFormData({ ...formData, phone: v })}
                                    error={fieldErrors.phone}
                                    required
                                />

                                <FormSelect
                                    label="Account Role"
                                    icon={<Shield size={16} />}
                                    value={formData.role}
                                    onChange={(v) => setFormData({ ...formData, role: v })}
                                    options={ROLE_OPTIONS}
                                    error={fieldErrors.role}
                                />
                            </div>

                            {/* === SECTION: Role-Specific Profile Fields (animated expand) === */}
                            <AnimatePresence mode="wait">
                                {showProfileSection && (
                                    <motion.div
                                        key={formData.role}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <Briefcase size={16} className="text-brand" />
                                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                                                    {formData.role === 'teacher' ? 'Teacher' : 'Staff'} Profile Details
                                                </h3>
                                                <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                    Role-Specific
                                                </span>
                                            </div>

                                            {formData.role === 'teacher' && (
                                                <TeacherFields
                                                    data={teacherData}
                                                    onChange={setTeacherData}
                                                    errors={fieldErrors}
                                                />
                                            )}

                                            {formData.role === 'staff' && (
                                                <StaffFields
                                                    data={staffData}
                                                    onChange={setStaffData}
                                                    errors={fieldErrors}
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] bg-brand text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            <span>Complete Registration</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};


// ===== Teacher-specific form fields =====
const TeacherFields: React.FC<{
    data: TeacherUnifiedCreate;
    onChange: React.Dispatch<React.SetStateAction<TeacherUnifiedCreate>>;
    errors: Record<string, string>;
}> = ({ data, onChange, errors }) => {
    const set = (field: keyof TeacherUnifiedCreate, value: any) => {
        onChange(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Staff Code"
                    icon={<Hash size={18} />}
                    placeholder="e.g. TCH-001"
                    value={data.staff_code || ''}
                    onChange={(v) => set('staff_code', v)}
                />
                <FormInput
                    label="Designation"
                    icon={<Briefcase size={18} />}
                    placeholder="e.g. Senior Teacher"
                    value={data.designation || ''}
                    onChange={(v) => set('designation', v)}
                    error={errors.teacher_designation}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Join Date"
                    icon={<Calendar size={18} />}
                    type="date"
                    value={data.join_date || ''}
                    onChange={(v) => set('join_date', v)}
                />
                <FormInput
                    label="Date of Birth"
                    icon={<Calendar size={18} />}
                    type="date"
                    value={data.dob || ''}
                    onChange={(v) => set('dob', v)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormSelect
                    label="Gender"
                    value={data.gender || ''}
                    onChange={(v) => set('gender', v)}
                    options={GENDER_OPTIONS}
                    placeholder="Select gender"
                />
                <FormSelect
                    label="Blood Group"
                    icon={<Heart size={16} />}
                    value={data.blood_group || ''}
                    onChange={(v) => set('blood_group', v)}
                    options={BLOOD_GROUP_OPTIONS}
                    placeholder="Select blood group"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Qualification"
                    icon={<GraduationCap size={18} />}
                    placeholder="e.g. M.Ed, B.Sc"
                    value={data.qualification || ''}
                    onChange={(v) => set('qualification', v)}
                />
                <FormInput
                    label="Experience (Years)"
                    type="number"
                    placeholder="e.g. 5"
                    value={data.experience_years?.toString() || ''}
                    onChange={(v) => set('experience_years', v ? parseInt(v) : undefined)}
                />
            </div>

            {/* Address Section */}
            <div className="flex items-center gap-2 pb-1 pt-2 border-b border-slate-50">
                <MapPin size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</span>
            </div>

            <FormInput
                label="Address Line"
                icon={<MapPin size={18} />}
                placeholder="Street address"
                value={data.address_line || ''}
                onChange={(v) => set('address_line', v)}
            />

            <div className="grid grid-cols-3 gap-4">
                <FormInput
                    label="City"
                    placeholder="City"
                    value={data.city || ''}
                    onChange={(v) => set('city', v)}
                />
                <FormInput
                    label="State"
                    placeholder="Province"
                    value={data.state || ''}
                    onChange={(v) => set('state', v)}
                />
                <FormInput
                    label="Pincode"
                    placeholder="Postal code"
                    value={data.pincode || ''}
                    onChange={(v) => set('pincode', v)}
                />
            </div>
        </div>
    );
};


// ===== Staff-specific form fields =====
const StaffFields: React.FC<{
    data: StaffUnifiedCreate;
    onChange: React.Dispatch<React.SetStateAction<StaffUnifiedCreate>>;
    errors: Record<string, string>;
}> = ({ data, onChange, errors }) => {
    const set = (field: keyof StaffUnifiedCreate, value: any) => {
        onChange(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Staff Code"
                    icon={<Hash size={18} />}
                    placeholder="e.g. STF-001"
                    value={data.staff_code || ''}
                    onChange={(v) => set('staff_code', v)}
                />
                <FormInput
                    label="Designation"
                    icon={<Briefcase size={18} />}
                    placeholder="e.g. Office Assistant"
                    value={data.designation || ''}
                    onChange={(v) => set('designation', v)}
                    error={errors.staff_designation}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormInput
                    label="Join Date"
                    icon={<Calendar size={18} />}
                    type="date"
                    value={data.join_date || ''}
                    onChange={(v) => set('join_date', v)}
                />
                <FormInput
                    label="Date of Birth"
                    icon={<Calendar size={18} />}
                    type="date"
                    value={data.dob || ''}
                    onChange={(v) => set('dob', v)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormSelect
                    label="Gender"
                    value={data.gender || ''}
                    onChange={(v) => set('gender', v)}
                    options={GENDER_OPTIONS}
                    placeholder="Select gender"
                />
                <FormSelect
                    label="Blood Group"
                    icon={<Heart size={16} />}
                    value={data.blood_group || ''}
                    onChange={(v) => set('blood_group', v)}
                    options={BLOOD_GROUP_OPTIONS}
                    placeholder="Select blood group"
                />
            </div>

            {/* Address Section */}
            <div className="flex items-center gap-2 pb-1 pt-2 border-b border-slate-50">
                <MapPin size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</span>
            </div>

            <FormInput
                label="Address Line"
                icon={<MapPin size={18} />}
                placeholder="Street address"
                value={data.address_line || ''}
                onChange={(v) => set('address_line', v)}
            />

            <div className="grid grid-cols-3 gap-4">
                <FormInput
                    label="City"
                    placeholder="City"
                    value={data.city || ''}
                    onChange={(v) => set('city', v)}
                />
                <FormInput
                    label="State"
                    placeholder="Province"
                    value={data.state || ''}
                    onChange={(v) => set('state', v)}
                />
                <FormInput
                    label="Pincode"
                    placeholder="Postal code"
                    value={data.pincode || ''}
                    onChange={(v) => set('pincode', v)}
                />
            </div>
        </div>
    );
};


// ===== Reusable Form Components =====

interface FormInputProps {
    label: string;
    icon?: React.ReactNode;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({ label, icon, type = 'text', placeholder, value, onChange, error, required }) => (
    <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            {icon && <span className="text-brand">{icon}</span>}
            {label}
            {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/5 rounded-2xl py-3.5 px-5 text-sm text-slate-900 font-bold transition-all outline-none placeholder:text-slate-300",
                error && "border-red-300 focus:ring-red-500/5 focus:border-red-500"
            )}
        />
        {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
    </div>
);

interface FormSelectProps {
    label: string;
    icon?: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    error?: string;
    placeholder?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ label, icon, value, onChange, options, error, placeholder }) => (
    <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            {icon && <span className="text-brand">{icon}</span>}
            {label}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand rounded-2xl py-3.5 px-5 text-sm text-slate-900 font-bold appearance-none transition-all outline-none",
                    !value && "text-slate-400",
                    error && "border-red-300"
                )}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
    </div>
);
