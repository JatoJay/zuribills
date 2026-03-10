import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const translationStrings = useMemo(() => ([
        'Create your free account',
        'Start your 3-day free trial. No credit card required.',
        'Email address',
        'Password',
        'Create account',
        'Or continue with',
        'Continue with Google',
        'Already have an account?',
        'Sign in',
        'Back to Home',
        'Show password',
        'Hide password',
        'Check your inbox to confirm your email.',
        'Authentication failed. Please try again.',
        'Unlimited invoices & clients',
        'AI-powered payment reminders',
        'Professional client portal',
        'Tax-ready financial reports',
        'By signing up, you agree to our Terms of Service and Privacy Policy.',
    ]), []);
    const { t } = useTranslation(translationStrings);

    const features = [
        'Unlimited invoices & clients',
        'AI-powered payment reminders',
        'Professional client portal',
        'Tax-ready financial reports',
    ];

    const handleSignUp = async () => {
        setMessage(null);
        if (!email.trim() || !password) {
            setMessage({ type: 'error', text: t('Authentication failed. Please try again.') });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        try {
            const supabase = getSupabaseClient();
            const normalizedEmail = email.trim().toLowerCase();
            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/onboarding`,
                },
            });

            if (error) {
                setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
                return;
            }

            fetch('/api/email/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: normalizedEmail, type: 'welcome' }),
            }).catch(console.error);

            navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setMessage(null);
        setLoading(true);
        try {
            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/onboarding`,
                },
            });
            if (error) {
                setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSignUp();
    };

    return (
        <div className="min-h-screen bg-white flex">
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate({ to: '/' })}>
                        <img src="/logo.svg" alt="ZuriBills" className="w-10 h-10" />
                        <span className="font-display text-xl font-semibold" style={{ color: '#ffffff' }}>ZuriBills</span>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-3xl font-display font-semibold mb-4" style={{ color: '#ffffff' }}>
                            Get paid faster with smart invoicing
                        </h2>
                        <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Join thousands of businesses using ZuriBills to streamline their payments.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {features.map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{t(feature)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    © 2026 ZuriBills. All rights reserved.
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate({ to: '/' })}>
                        <img src="/logo.svg" alt="ZuriBills" className="w-10 h-10" />
                        <span className="font-display text-xl font-semibold">
                            <span className="text-black">Zuri</span><span className="text-primary">Bills</span>
                        </span>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-display font-semibold text-black mb-2">
                            {t('Create your free account')}
                        </h1>
                        <p className="text-slate-600">
                            {t('Start your 3-day free trial. No credit card required.')}
                        </p>
                    </div>

                    {message && (
                        <div className={`rounded-xl border px-4 py-3 text-sm mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        disabled={loading}
                        className="w-full h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 transition-all duration-200 group mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-sm font-semibold text-slate-800">{t('Continue with Google')}</span>
                    </button>

                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <span className="relative bg-white px-4 text-xs text-slate-500 uppercase tracking-wider">{t('Or continue with')}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label={t('Email address')}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />

                        <div className="relative">
                            <Input
                                label={t('Password')}
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-4 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label={showPassword ? t('Hide password') : t('Show password')}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <Button type="submit" className="w-full h-12 text-base" isLoading={loading}>
                            {t('Create account')}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </form>

                    <p className="text-xs text-slate-500 text-center mt-6">
                        {t('By signing up, you agree to our Terms of Service and Privacy Policy.')}
                    </p>

                    <div className="text-sm text-slate-600 text-center mt-6">
                        {t('Already have an account?')}{' '}
                        <button
                            type="button"
                            onClick={() => navigate({ to: '/login' })}
                            className="text-primary font-semibold hover:underline"
                        >
                            {t('Sign in')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
