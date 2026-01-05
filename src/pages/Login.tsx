import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolLogo } from '../components/icons/SchoolLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await login({ email, password });
        } catch (err: any) {
            const detail = err.response?.data?.detail;

            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                // Handle Pydantic validation errors (list of objects)
                setError(detail[0]?.msg || 'Validation error occurred.');
            } else if (typeof detail === 'object' && detail !== null) {
                setError(detail.msg || 'An error occurred.');
            } else {
                setError('Invalid email or password. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background-soft flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Vignettes */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-100/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-100/30 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 z-10">
                <div className="flex flex-col items-center mb-10">
                    <SchoolLogo className="w-24 h-24 mb-6 shadow-lg shadow-brand/20" />
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                        Satyam English School
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                        Management System
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-6">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center text-slate-600 cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded border-slate-300 text-brand focus:ring-brand" />
                                Remember me
                            </label>
                            <Link to="/forgot-password" className="text-brand font-semibold hover:text-brand-dark transition-colors">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    <Button type="submit" isLoading={isLoading} className="mt-8">
                        Sign In
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-8">
                        Need help? <a href="#" className="text-brand font-semibold hover:text-brand-dark transition-colors">Contact Support</a>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
