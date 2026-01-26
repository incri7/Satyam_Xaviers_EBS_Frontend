import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SchoolLogo } from '../components/icons/SchoolLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authService } from '../api/services/auth.service';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        if (!token) {
            setError("Missing reset token.");
            setIsLoading(false);
            return;
        }

        try {
            await authService.confirmPasswordReset({ token, new_password: newPassword });
            setIsSuccess(true);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                setError(detail[0]?.msg || 'Validation error occurred.');
            } else {
                setError('Failed to reset password. The link may have expired.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Invalid Link</h1>
                    <p className="text-slate-600 mb-6">This password reset link is invalid or missing a token.</p>
                    <Link to="/login">
                        <Button>Return to Login</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Vignettes */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-100/30 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 z-10 transition-all duration-300">
                <div className="flex flex-col items-center mb-8">
                    <SchoolLogo className="w-20 h-20 mb-6 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                        Set New Password
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2 text-center">
                        Please enter your new password below
                    </p>
                </div>

                {isSuccess ? (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm font-medium">
                            Your password has been successfully reset. You can now log in with your new password.
                        </div>
                        <Link to="/login">
                            <Button className="w-full mt-4">
                                Sign In Now
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

                        <Input
                            label="New Password"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />

                        <Button type="submit" isLoading={isLoading} className="mt-2">
                            Reset Password
                        </Button>

                        <div className="text-center mt-6">
                            <Link
                                to="/login"
                                className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors flex items-center justify-center gap-2"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
