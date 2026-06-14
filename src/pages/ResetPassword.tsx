import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SchoolLogo } from '../components/icons/SchoolLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authService } from '../api/services/auth.service';


const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isNepali = i18n.language === 'ne';
    const toggleLanguage = () => i18n.changeLanguage(isNepali ? 'en' : 'ne');
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (newPassword !== confirmPassword) {
            setError(t('register.passwordsNoMatch'));
            setIsLoading(false);
            return;
        }
        
        try {
            if (!token) {
                await authService.changePassword({current_password: currentPassword, new_password: newPassword });
                setIsSuccess(true);
            }else{
                await authService.confirmPasswordReset({ token, new_password: newPassword });
                setIsSuccess(true);
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                setError(detail[0]?.msg || 'Validation error occurred.');
            } else {
                setError(t('register.resetFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        if (!token && isSuccess) {
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
    }, [isSuccess]);

    return (
        <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Vignettes */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-100/30 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 z-10 transition-all duration-300">
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
                    <SchoolLogo className="w-20 h-20 mb-6 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                        {t('register.setNewPassword')}
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2 text-center">
                        {t('register.newPasswordSubtitle')}
                    </p>
                </div>
                {!token && isSuccess ?  (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm font-medium">
                            {t('register.passwordChanged')}
                        </div>
                    </div>
                    ) :
                token && isSuccess ? (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm font-medium">
                            {t('register.passwordReset')}
                        </div>
                        <Link to="/login">
                            <Button className="w-full mt-4">
                                {t('register.signInNow')}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center font-medium">
                                {error}
                            </div>
                        )}

                       {!token && (
                         <Input
                            label={t('register.currentPassword')}
                            type="password"
                            placeholder={t('register.enterCurrentPassword')}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                       )}

                         <Input
                            label={t('register.newPassword')}
                            type="password"
                            placeholder={t('register.enterNewPassword')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />

                        <Input
                            label={t('register.confirmPassword')}
                            type="password"
                            placeholder={t('register.enterConfirmPassword')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />

                        <Button type="submit" isLoading={isLoading} className="mt-2">
                            {t('register.resetPassword')}
                        </Button>
                        {token ?
                        <div className="text-center mt-6">
                            <Link
                                to="/login"
                                className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors flex items-center justify-center gap-2"
                            >
                                {t('register.cancel')}
                            </Link>
                        </div>:<div></div>}
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
