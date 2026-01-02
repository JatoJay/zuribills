import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Card } from '@/components/ui';
import ThemeToggle from '@/components/ThemeToggle';
import { getSupabaseClient } from '@/services/supabaseClient';
import {
  getOrganizationBySlug,
  getOrganizationsByAccount,
  getOrgMemberships,
  getUserByEmail,
  setCurrentAccountId,
  setCurrentUserId,
} from '@/services/storage';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowRight, Building2, ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const translationStrings = useMemo(() => ([
    'Welcome back',
    'Create your account',
    'Sign in to continue managing your workspace.',
    'Set up login credentials to secure your workspace.',
    'Sign in',
    'Create account',
    'Email address',
    'Password',
    'Workspace slug (optional)',
    'Use a workspace slug to jump straight into a dashboard.',
    'No workspace found for this email.',
    'Create workspace',
    'Back to Home',
    'Authentication failed. Please try again.',
    'Check your inbox to confirm your email.',
    'Already have an account?',
    'Need an account?',
    'Secure access',
    'Invite your team',
    'Track revenue in one place',
    'Supabase-backed authentication',
    'Continue',
    'Show password',
    'Hide password',
    'Workspace slug is required',
    'Workspace not found for that slug.',
    'You do not have access to that workspace.',
    'Finish setup',
  ]), []);
  const { t } = useTranslation(translationStrings);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get('slug');
    const emailParam = params.get('email');
    if (slugParam) setSlug(slugParam);
    if (emailParam) setEmail(emailParam);
  }, []);

  const resetState = () => {
    setMessage(null);
  };

  const handleSignIn = async () => {
    resetState();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: t('Authentication failed. Please try again.') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const normalizedEmail = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
        return;
      }

      const userRecord = await getUserByEmail(normalizedEmail);
      if (!userRecord) {
        navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
        return;
      }

      setCurrentUserId(userRecord.id);
      setCurrentAccountId(userRecord.accountId);

      let destinationSlug = slug.trim();
      if (destinationSlug) {
        const org = await getOrganizationBySlug(destinationSlug);
        if (!org) {
          setMessage({ type: 'error', text: t('Workspace not found for that slug.') });
          return;
        }
        const memberships = await getOrgMemberships(org.id);
        const hasAccess = memberships.some((membership) => membership.userId === userRecord.id);
        if (!hasAccess) {
          setMessage({ type: 'error', text: t('You do not have access to that workspace.') });
          return;
        }
      } else {
        const orgs = await getOrganizationsByAccount(userRecord.accountId);
        if (!orgs.length) {
          navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
          return;
        }
        destinationSlug = orgs[0].slug;
      }

      navigate({ to: '/org/$slug', params: { slug: destinationSlug } });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    resetState();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: t('Authentication failed. Please try again.') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
        return;
      }

      setMessage({ type: 'success', text: t('Check your inbox to confirm your email.') });
      navigate({ to: '/onboarding', search: { email: email.trim() } as any });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -top-32 right-[-10%] w-[420px] h-[420px] bg-primary/20 blur-[140px]" />
      <div className="absolute bottom-0 left-[-5%] w-[360px] h-[360px] bg-foreground/10 blur-[140px]" />

      <header className="relative z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Invoice<span className="text-primary">Flow</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              {t('Back to Home')}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col lg:flex-row items-center gap-12 px-4 py-12">
        <div className="hidden lg:flex w-1/2">
          <Card className="p-10 w-full bg-surface border-border shadow-soft">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted">
                <ShieldCheck className="w-4 h-4 text-primary" /> {t('Secure access')}
              </div>
              <h2 className="text-3xl font-display font-semibold text-foreground">{t('Sign in to continue managing your workspace.')}</h2>
              <p className="text-sm text-muted">
                {t('Supabase-backed authentication')}
              </p>

              <div className="grid gap-4">
                {[t('Invite your team'), t('Track revenue in one place')].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-1/2">
          <Card className="p-8 bg-background border-border shadow-soft">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-display font-semibold text-foreground">
                    {mode === 'signin' ? t('Welcome back') : t('Create your account')}
                  </h1>
                  <p className="text-sm text-muted mt-2">
                    {mode === 'signin'
                      ? t('Sign in to continue managing your workspace.')
                      : t('Set up login credentials to secure your workspace.')}
                  </p>
                </div>
                <div className="flex items-center flex-nowrap rounded-full border border-border bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${mode === 'signin' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'}`}
                  >
                    {t('Sign in')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${mode === 'signup' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'}`}
                  >
                    {t('Create account')}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label={t('Email address')}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="relative">
                  <Input
                    label={t('Password')}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-[38px] text-muted hover:text-foreground transition-colors"
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {mode === 'signin' && (
                  <div>
                    <Input
                      label={t('Workspace slug (optional)')}
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted mt-2">{t('Use a workspace slug to jump straight into a dashboard.')}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base" isLoading={loading}>
                  {mode === 'signin' ? t('Sign in') : t('Create account')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="text-xs text-muted">
                {mode === 'signin' ? (
                  <span>
                    {t('Need an account?')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); resetState(); }}
                      className="text-foreground underline decoration-primary/60 underline-offset-4"
                    >
                      {t('Create account')}
                    </button>
                  </span>
                ) : (
                  <span>
                    {t('Already have an account?')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); resetState(); }}
                      className="text-foreground underline decoration-primary/60 underline-offset-4"
                    >
                      {t('Sign in')}
                    </button>
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
