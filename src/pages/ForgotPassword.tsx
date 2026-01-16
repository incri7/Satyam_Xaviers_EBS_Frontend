import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolLogo } from '../components/icons/SchoolLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authService } from '../api/services/auth.service';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await authService.requestPasswordReset(email);
            setIsSuccess(true);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else {
                setError('Failed to send reset link. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Vignettes */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-100/30 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 z-10 transition-all duration-300">
                <div className="flex flex-col items-center mb-8">
                    <SchoolLogo className="w-20 h-20 mb-6 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                        Reset Password
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-2 text-center">
                        Enter your email to receive a reset link
                    </p>
                </div>

                {isSuccess ? (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm font-medium">
                            If the email exists, a password reset link has been sent to <strong>{email}</strong>.
                        </div>
                        <Link to="/login">
                            <Button variant="outline" className="w-full mt-4">
                                Back to Sign In
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
                            label="Email Address"
                            type="email"
                            placeholder="Enter your registered email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button type="submit" isLoading={isLoading} className="mt-2">
                            Send Reset Link
                        </Button>

                        <div className="text-center mt-6">
                            <Link
                                to="/login"
                                className="text-sm font-semibold text-slate-500 hover:text-brand transition-colors flex items-center justify-center gap-2"
                            >
                                <span>←</span> Back to Sign In
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
