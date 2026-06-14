import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SchoolLogo } from '../components/icons/SchoolLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { requestFCMToken, deviceService } from '../api/services/device.service';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isNepali = i18n.language === 'ne';
    const toggleLanguage = () => i18n.changeLanguage(isNepali ? 'en' : 'ne');

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await login({ email, password });

            requestFCMToken().then((token) => {
                if (token) deviceService.registerToken(token).catch(() => {});
            });

            if (response.user.must_change_password === true) {
                navigate('/reset-password');
            } else {
                const role = response.user.role;
                if (role === 'teacher') {
                    navigate('/home/teacher');
                } else if (role === 'parent') {
                    navigate('/home/parent');
                } else if (role === 'accountant') {
                    navigate('/home/accountant');
                } else if (role === 'coordinator') {
                    navigate('/home/coordinator');
                } else if (role === 'student') {
                    navigate('/home/student');
                } else if (role === 'principal') {
                    navigate('/home/principal');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;

            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                setError(detail[0]?.msg || t('auth.errorValidation'));
            } else if (typeof detail === 'object' && detail !== null) {
                setError(detail.msg || t('auth.errorGeneral'));
            } else {
                setError(t('auth.errorInvalid'));
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-100/30 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 z-10">
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
                <div className="flex flex-col items-center mb-10">
                    <SchoolLogo className="w-24 h-24 mb-6 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                        {t('app.name')}
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                        {t('app.tagline')}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-6">
                    <Input
                        label={t('auth.emailAddress')}
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div className="space-y-1">
                        <Input
                            label={t('auth.password')}
                            type="password"
                            placeholder={t('auth.passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center text-slate-600 cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded border-slate-300 text-brand focus:ring-brand" />
                                {t('auth.rememberMe')}
                            </label>
                            <Link to="/forgot-password" className="text-brand font-semibold hover:text-brand-dark transition-colors">
                                {t('auth.forgotPassword')}
                            </Link>
                        </div>
                    </div>

                    <Button type="submit" isLoading={isLoading} className="mt-8">
                        {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-8">
                        {t('auth.needHelp')} <a href="#" className="text-brand font-semibold hover:text-brand-dark transition-colors">{t('auth.contactSupport')}</a>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
