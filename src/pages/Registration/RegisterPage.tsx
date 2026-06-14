import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { registrationService } from '../../api/services/registration.service';
import { useAuthStore } from '../../store/useAuthStore';
import { SchoolLogo } from '../../components/icons/SchoolLogo';
import { CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';

const RegisterPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isNepali = i18n.language === 'ne';
    const toggleLanguage = () => i18n.changeLanguage(isNepali ? 'en' : 'ne');
    const { setAuth } = useAuthStore();

    const [form, setForm] = useState({
        phone: '',
        password: '',
        confirm_password: '',
        first_name: '',
        last_name: '',
    });
    const [formError, setFormError] = useState('');

    const { data: tokenInfo, isLoading: loadingToken, error: tokenError } = useQuery({
        queryKey: ['register-token', token],
        queryFn: () => registrationService.getTokenInfo(token!),
        enabled: !!token,
        retry: false,
    });

    const registerMutation = useMutation({
        mutationFn: () => registrationService.completeRegistration(token!, {
            phone: form.phone,
            password: form.password,
            first_name: form.first_name || undefined,
            last_name: form.last_name || undefined,
        }),
        onSuccess: (data) => {
            setAuth(
                {
                    id: data.user_id,
                    email: '',
                    phone: form.phone,
                    role: data.role,
                    is_active: true,
                    must_change_password: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                data.access_token,
                data.refresh_token,
            );
            navigate('/home/parent');
        },
        onError: (err: any) => {
            setFormError(err.response?.data?.detail || t('register.registerFailed'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!form.phone.trim()) return setFormError(t('register.phoneRequired'));
        if (form.password.length < 8) return setFormError(t('register.passwordLength'));
        if (form.password !== form.confirm_password) return setFormError(t('register.passwordMatch'));

        registerMutation.mutate();
    };

    const tokenExpiredOrInvalid = tokenError && (
        (tokenError as any)?.response?.status === 404 ||
        (tokenError as any)?.response?.status === 410
    );

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-10">
                <div className="flex justify-end mb-2">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors"
                        title={t('language.toggle')}
                    >
                        <Languages className="w-3.5 h-3.5" />
                        {isNepali ? t('language.english') : t('language.nepali')}
                    </button>
                </div>
                <div className="flex flex-col items-center mb-8">
                    <SchoolLogo className="w-20 h-20 mb-5 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center">{t('register.parentTitle')}</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1 text-center">
                        Satyam Xavier's Higher Secondary School
                    </p>
                </div>

                {loadingToken && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-brand animate-spin" />
                    </div>
                )}

                {tokenExpiredOrInvalid && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="font-bold text-red-700">
                            {(tokenError as any)?.response?.status === 410
                                ? t('register.tokenExpired')
                                : t('register.tokenInvalid')}
                        </p>
                    </div>
                )}

                {tokenInfo && !tokenExpiredOrInvalid && (
                    <>
                        {/* Child banner */}
                        <div className="mb-6 p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-brand" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500">{t('register.registeringAs')}</p>
                                <p className="font-bold text-slate-900">{tokenInfo.student_name}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('register.firstName')}</label>
                                    <input
                                        type="text"
                                        value={form.first_name}
                                        onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                                        placeholder={t('register.optional')}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('register.lastName')}</label>
                                    <input
                                        type="text"
                                        value={form.last_name}
                                        onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                                        placeholder={t('register.optional')}
                                        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('register.phoneNumber')}</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="98XXXXXXXX"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('register.password')}</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    placeholder={t('register.minPassword')}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('register.confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={form.confirm_password}
                                    onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                                    placeholder={t('register.repeatPassword')}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={registerMutation.isPending}
                                className="w-full py-3 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                            >
                                {registerMutation.isPending ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> {t('register.creating')}</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> {t('register.createAccount')}</>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default RegisterPage;
